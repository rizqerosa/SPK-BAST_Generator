// ============================================================
// DATA.JS — Google Sheets API Layer
// Semua fungsi async. Data diambil dari Google Sheets via
// Apps Script Web App (URL ada di config.js).
//
// PERFORMA: Gunakan localStorage cache agar halaman load instan.
// Cache TTL per sheet bisa dikonfigurasi di CACHE_TTL_MS.
// Pattern: tampilkan cache dulu (cepat) → refresh background.
// ============================================================

// ─── Cache TTL (milidetik) ────────────────────────────────────
const CACHE_TTL_MS = {
  pegawai:          10 * 60 * 1000,  // 10 menit (jarang berubah)
  mitra:            10 * 60 * 1000,  // 10 menit
  kegiatan:         10 * 60 * 1000,  // 10 menit
  suratTugas:       10 * 60 * 1000,
  spkBast:           2 * 60 * 1000,  // 2 menit (sering berubah)
  detailPekerjaan:   2 * 60 * 1000,
  bastSmPpk:         5 * 60 * 1000,
  parameter:        15 * 60 * 1000,
  pengguna:         10 * 60 * 1000,
  mappingPetugas:    5 * 60 * 1000,  // 5 menit (bisa berubah saat KATIM input)
};

// ─── In-memory cache (per sesi) ───────────────────────────────
const _DB = {
  pegawai:          null,
  mitra:            null,
  kegiatan:         null,
  suratTugas:       null,
  spkBast:          null,
  detailPekerjaan:  null,
  bastSmPpk:        null,
  parameter:        null,
  pengguna:         null,
  mappingPetugas:   null,
};

// ─── LocalStorage helpers ─────────────────────────────────────
const LS_PREFIX = "spkbast_cache_";

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { data: parsed, isStale: true, ts: 0 };
    }
    if (parsed && typeof parsed === "object") {
      const data = parsed.data !== undefined ? parsed.data : parsed;
      const ts = parsed.ts || 0;
      const ttl = CACHE_TTL_MS[key] || 5 * 60 * 1000;
      const isStale = (Date.now() - ts > ttl);
      return { data: Array.isArray(data) ? data : [], isStale, ts };
    }
    return null;
  } catch { return null; }
}

function lsSet(key, data) {
  try {
    if (!Array.isArray(data) || data.length > 0) {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
    }
  } catch { /* quota exceeded — ignore */ }
}

function lsDel(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

// ─── Helper: konversi key camelCase → UPPER_SNAKE ─────────────
function resolveSheetName(sheetKey) {
  const formattedKey = sheetKey.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  return CONFIG.SHEETS[formattedKey] || CONFIG.SHEETS[sheetKey.toUpperCase()] || sheetKey;
}

// ─── Fetch dari Apps Script (dengan timeout 35s & candidate retry) ───
async function _fetchFromNetwork(sheetKey) {
  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.startsWith("GANTI")) {
    console.warn("[data.js] APPS_SCRIPT_URL belum diisi di config.js!");
    return [];
  }
  const primaryName = resolveSheetName(sheetKey);
  const candidateNames = [primaryName];

  // Candidates list for fallback
  if (primaryName === "Mapping_Petugas") candidateNames.push("mapping_petugas", "mapping", "Mapping");
  else if (primaryName === "SPK_BAST") candidateNames.push("spk_bast", "SPK_Bast");
  else if (primaryName === "BAST_SM_PPK") candidateNames.push("bast_sm_ppk", "BAST_SM-PPK");
  else if (primaryName === "Detail_Pekerjaan") candidateNames.push("detail_pekerjaan");
  else if (primaryName === "User") candidateNames.push("user", "pengguna", "Pengguna");
  else if (primaryName === "Pegawai") candidateNames.push("pegawai");
  else if (primaryName === "Mitra") candidateNames.push("mitra");
  else if (primaryName === "Kegiatan") candidateNames.push("kegiatan");

  for (const sheetName of candidateNames) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`${url}?sheet=${encodeURIComponent(sheetName)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (res.status === 404) continue;
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json && json.status === "error") {
        if (json.message && json.message.toLowerCase().includes("not found")) continue;
        throw new Error(json.message || "Error dari Apps Script");
      }
      const rawRows = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      const normalized = rawRows.map(row => normalizeRow(row, sheetKey));
      return normalized;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.warn(`[data.js] Timeout fetch sheet '${sheetName}' (>35s)`);
      } else {
        console.warn(`[data.js] Sheet '${sheetName}' error:`, err.message);
      }
    }
  }

  return [];
}

// ─── Request Deduplication Map ──────────────────────────────
const _inflightFetches = {};

// ─── Core: fetch satu sheet (Cache-First + Staggered Background Sync) ──
async function fetchSheet(sheetKey, forceRefresh = false) {
  // 1. Jika forceRefresh, lewati cache
  if (!forceRefresh) {
    // 2. Ambil dari memory atau localStorage secara instan (0 ms)
    const memData = _DB[sheetKey];
    if (Array.isArray(memData) && memData.length > 0) {
      return memData;
    }

    const cached = lsGet(sheetKey);
    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      _DB[sheetKey] = cached.data;

      // Background revalidation jika stale
      if (cached.isStale && !_inflightFetches[sheetKey]) {
        _inflightFetches[sheetKey] = _fetchFromNetwork(sheetKey)
          .then(freshData => {
            delete _inflightFetches[sheetKey];
            if (Array.isArray(freshData) && freshData.length > 0) {
              _DB[sheetKey] = freshData;
              lsSet(sheetKey, freshData);
              try {
                window.dispatchEvent(new CustomEvent('sheet-refreshed', {
                  detail: { sheet: sheetKey, data: freshData }
                }));
              } catch(_) {}
            }
          })
          .catch(() => {
            delete _inflightFetches[sheetKey];
          });
      }
      return cached.data;
    }
  }

  // 3. Fetch dari network jika belum ada cache sama sekali
  if (_inflightFetches[sheetKey]) {
    return _inflightFetches[sheetKey];
  }

  _inflightFetches[sheetKey] = (async () => {
    try {
      const data = await _fetchFromNetwork(sheetKey);
      if (Array.isArray(data) && data.length > 0) {
        _DB[sheetKey] = data;
        lsSet(sheetKey, data);
        try {
          window.dispatchEvent(new CustomEvent('sheet-refreshed', {
            detail: { sheet: sheetKey, data: data }
          }));
        } catch(_) {}
        return data;
      }
      return _DB[sheetKey] || [];
    } catch (err) {
      console.error(`[data.js] Gagal fetch sheet '${sheetKey}':`, err);
      return _DB[sheetKey] || [];
    } finally {
      delete _inflightFetches[sheetKey];
    }
  })();

  return _inflightFetches[sheetKey];
}

// ─── Normalisasi tipe data per sheet ─────────────────────────
function normalizeRow(row, sheetKey) {
  const r = { ...row };
  const angkaFields = {
    spkBast:          ["Tahun", "Total_Honor", "Triwulan", "Subround"],
    spk_bast:         ["Tahun", "Total_Honor", "Triwulan", "Subround"],
    detailPekerjaan:  ["No_Urut", "Volume", "volume", "Harga_Satuan", "Nilai_Perjanjian", "Tahun", "Triwulan", "Subround"],
    detail_pekerjaan: ["No_Urut", "Volume", "volume", "Harga_Satuan", "Nilai_Perjanjian", "Tahun", "Triwulan", "Subround"],
    kegiatan:         ["Harga_Satuan"],
    mappingPetugas:   ["Volume", "volume", "Harga_Satuan", "Total_Honor", "Tahun", "Triwulan", "Subround"],
    mapping_petugas:  ["Volume", "volume", "Harga_Satuan", "Total_Honor", "Tahun", "Triwulan", "Subround"],
    mapping:          ["Volume", "volume", "Harga_Satuan", "Total_Honor", "Tahun", "Triwulan", "Subround"],
    bastSmPpk:        ["Tahun", "Total_Honor", "Triwulan", "Subround"],
    bast_sm_ppk:      ["Tahun", "Total_Honor", "Triwulan", "Subround"],
    parameter:        ["TAHUN_AKTIF", "BATAS_HONOR_MAKSIMUM"],
  };
  const fields = angkaFields[sheetKey] || [];
  fields.forEach(f => {
    if (r[f] !== undefined && r[f] !== "") r[f] = Number(r[f]) || 0;
  });
  return r;
}

// ─── Core: POST data ke sheet ─────────────────────────────────
async function postToSheet(sheetKey, action, data, options = {}) {
  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.startsWith("GANTI")) throw new Error("APPS_SCRIPT_URL belum diisi!");
  const sheetName = resolveSheetName(sheetKey);
  const body = { action, sheet: sheetName, data, ...options };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === "error") throw new Error(json.message);
  return json;
}

// ─── Public: Tambah baris baru ────────────────────────────────
async function appendToSheet(sheetKey, rowData) {
  const result = await postToSheet(sheetKey, "append", rowData);
  // Optimistic Cache Insertion
  try {
    const cached = (typeof lsGet === "function" ? lsGet(sheetKey)?.data : null) || _DB[sheetKey];
    if (Array.isArray(cached)) {
      const idKey = Object.keys(rowData).find(k => k.toLowerCase().startsWith("id_")) || "ID_Dokumen";
      const updated = [rowData, ...cached.filter(item => !item[idKey] || String(item[idKey]) !== String(rowData[idKey]))];
      _DB[sheetKey] = updated;
      if (typeof lsSet === "function") lsSet(sheetKey, updated);
    } else {
      _DB[sheetKey] = [rowData];
      if (typeof lsSet === "function") lsSet(sheetKey, [rowData]);
    }
  } catch (_) {}
  return result;
}

// ─── Public: Update baris berdasar key (Instan 0 ms) ────────
async function updateInSheet(sheetKey, keyField, keyValue, newData) {
  const cleanKeyVal = String(keyValue).trim().toLowerCase();
  // Optimistic Cache Update
  try {
    const cached = (typeof lsGet === "function" ? lsGet(sheetKey)?.data : null) || _DB[sheetKey];
    if (Array.isArray(cached)) {
      const updated = cached.map(item => {
        if (String(item[keyField] || "").trim().toLowerCase() === cleanKeyVal) {
          return { ...item, ...newData };
        }
        return item;
      });
      _DB[sheetKey] = updated;
      if (typeof lsSet === "function") lsSet(sheetKey, updated);
    }
  } catch (_) {}

  const result = await postToSheet(sheetKey, "update", newData, { keyField, keyValue });
  return result;
}

// ─── Public: Hapus baris berdasar key ────────────────────────
async function deleteFromSheet(sheetKey, keyField, keyValue) {
  // Optimistic Cache Removal
  try {
    const cached = (typeof lsGet === "function" ? lsGet(sheetKey)?.data : null) || _DB[sheetKey];
    if (Array.isArray(cached)) {
      const updated = cached.filter(item => String(item[keyField]) !== String(keyValue));
      _DB[sheetKey] = updated;
      if (typeof lsSet === "function") lsSet(sheetKey, updated);
    }
  } catch (_) {}

  const deleteData = { [keyField]: keyValue, id: keyValue };
  const result = await postToSheet(sheetKey, "delete", deleteData, { keyField, keyValue, id: keyValue });
  return result;
}

// ─── Public: Hapus cache (paksa refresh) ─────────────────────
function clearCache(sheetKey) {
  if (sheetKey) {
    _DB[sheetKey] = null;
    lsDel(sheetKey);
  } else {
    Object.keys(_DB).forEach(k => { _DB[k] = null; lsDel(k); });
  }
}

// ─── Public: Force Sync All Data dari Google Sheets ──────────
async function forceSyncAllData() {
  clearCache();
  if (typeof showToast === "function") showToast("🔄 Menyinkronkan database langsung dari Google Sheets...", "info", 3000);
  const sheets = ["mitra", "pegawai", "kegiatan", "spkBast", "mappingPetugas", "bastSmPpk"];
  for (const s of sheets) {
    try {
      await fetchSheet(s, true);
    } catch (_) {}
  }
  if (typeof showToast === "function") showToast("✅ Sinkronisasi database selesai!", "success", 4000);
  window.location.reload();
}

// ─── Shorthand getters ────────────────────────────────────────
async function getPegawai()          { return fetchSheet("pegawai"); }
async function getMitra()            { return fetchSheet("mitra"); }
async function getKegiatan()         { return fetchSheet("kegiatan"); }
async function getSuratTugas()       { return fetchSheet("suratTugas"); }
async function getSpkBast()          { return fetchSheet("spkBast"); }
async function getDetailPekerjaan()  { return fetchSheet("detailPekerjaan"); }
async function getBastSmPpk()        { return fetchSheet("bastSmPpk"); }
async function getParameter()        { return fetchSheet("parameter"); }
async function getPengguna()         {
  const res = await fetchSheet("pengguna");
  if (Array.isArray(res) && res.length > 0) return res;
  return fetchSheet("user");
}
async function getUser()             { return getPengguna(); }
async function getUsers()            { return getPengguna(); }
async function getMappingPetugas()   { return fetchSheet("mappingPetugas"); }
