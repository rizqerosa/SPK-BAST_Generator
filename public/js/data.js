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
    const { ts, data } = JSON.parse(raw);
    const ttl = CACHE_TTL_MS[key] || 5 * 60 * 1000;
    const isStale = (Date.now() - ts > ttl);
    return { data, isStale, ts };
  } catch { return null; }
}

function lsSet(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
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

// ─── Fetch dari Apps Script (dengan timeout 12s) ──────────────
async function _fetchFromNetwork(sheetKey) {
  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.startsWith("GANTI")) {
    console.warn("[data.js] APPS_SCRIPT_URL belum diisi di config.js!");
    return [];
  }
  const sheetName = resolveSheetName(sheetKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${url}?sheet=${encodeURIComponent(sheetName)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Error dari Apps Script");
    const normalized = (json.data || []).map(row => normalizeRow(row, sheetKey));
    return normalized;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn(`[data.js] Timeout fetch sheet '${sheetKey}' (>12s)`);
    } else {
      console.error(`[data.js] Network error '${sheetKey}':`, err.message);
    }
    throw err;
  }
}

// ─── Core: fetch satu sheet (Stale-While-Revalidate) ──────────
async function fetchSheet(sheetKey) {
  // 1. In-memory cache (paling cepat)
  if (_DB[sheetKey] !== null && _DB[sheetKey] !== undefined) return _DB[sheetKey];

  // 2. LocalStorage cache (cepat, lintas halaman)
  const cached = lsGet(sheetKey);
  if (cached && cached.data) {
    _DB[sheetKey] = cached.data;
    // Jika stale atau sudah lewat 15 detik, refresh di background
    if (cached.isStale || (Date.now() - (cached.ts || 0) > 15000)) {
      _fetchFromNetwork(sheetKey)
        .then(freshData => {
          _DB[sheetKey] = freshData;
          lsSet(sheetKey, freshData);
          try {
            window.dispatchEvent(new CustomEvent('sheet-refreshed', {
              detail: { sheet: sheetKey, data: freshData }
            }));
          } catch(e) {}
        })
        .catch(() => {});
    }
    return cached.data;
  }

  // 3. Fetch dari network (pertama kali / belum ada cache sama sekali)
  try {
    const data = await _fetchFromNetwork(sheetKey);
    _DB[sheetKey] = data;
    lsSet(sheetKey, data);
    return data;
  } catch (err) {
    console.error(`[data.js] Gagal fetch sheet '${sheetKey}':`, err);
    return [];
  }
}

// ─── Normalisasi tipe data per sheet ─────────────────────────
function normalizeRow(row, sheetKey) {
  const r = { ...row };
  const angkaFields = {
    spkBast:          ["Tahun", "Total_Honor"],
    spk_bast:         ["Tahun", "Total_Honor"],
    detailPekerjaan:  ["No_Urut", "Volume", "Harga_Satuan", "Nilai_Perjanjian"],
    detail_pekerjaan: ["No_Urut", "Volume", "Harga_Satuan", "Nilai_Perjanjian"],
    kegiatan:         ["Harga_Satuan"],
    mappingPetugas:   ["Volume", "Harga_Satuan", "Total_Honor"],
    mapping_petugas:  ["Volume", "Harga_Satuan", "Total_Honor"],
    bastSmPpk:        ["Tahun", "Total_Honor"],
    bast_sm_ppk:      ["Tahun", "Total_Honor"],
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
  _DB[sheetKey] = null;
  lsDel(sheetKey); // Invalidate localStorage cache
  return result;
}

// ─── Public: Update baris berdasar key ───────────────────────
async function updateInSheet(sheetKey, keyField, keyValue, newData) {
  const result = await postToSheet(sheetKey, "update", newData, { keyField, keyValue });
  _DB[sheetKey] = null;
  lsDel(sheetKey);
  return result;
}

// ─── Public: Hapus baris berdasar key ────────────────────────
async function deleteFromSheet(sheetKey, keyField, keyValue) {
  const result = await postToSheet(sheetKey, "delete", {}, { keyField, keyValue });
  _DB[sheetKey] = null;
  lsDel(sheetKey);
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
