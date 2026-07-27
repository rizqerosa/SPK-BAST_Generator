// ============================================================
// DATA.JS — Google Sheets API Layer
// Semua fungsi async. Data diambil dari Google Sheets via
// Apps Script Web App (URL ada di config.js).
// ============================================================

// ─── Cache lokal ──────────────────────────────────────────────
// Supaya tidak fetch ulang setiap navigasi — disimpan di memori
// selama sesi. Untuk refresh paksa, gunakan clearCache().
const _DB = {
  pegawai:           null,
  mitra:             null,
  kegiatan:          null,
  suratTugas:        null,
  spkBast:           null,
  detailPekerjaan:   null,
  bastSmPpk:         null,
  parameter:         null,
};

// Helper untuk konversi key (contoh: spkBast -> SPK_BAST, detailPekerjaan -> DETAIL_PEKERJAAN)
function resolveSheetName(sheetKey) {
  const formattedKey = sheetKey.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  return CONFIG.SHEETS[formattedKey] || CONFIG.SHEETS[sheetKey.toUpperCase()] || sheetKey;
}

// ─── Core: fetch satu sheet ───────────────────────────────────
async function fetchSheet(sheetKey) {
  // Cek cache
  if (_DB[sheetKey] !== null && _DB[sheetKey] !== undefined) return _DB[sheetKey];

  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.startsWith("GANTI")) {
    console.warn("[data.js] APPS_SCRIPT_URL belum diisi di config.js!");
    return [];
  }

  const sheetName = resolveSheetName(sheetKey);

  try {
    const res = await fetch(`${url}?sheet=${encodeURIComponent(sheetName)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.status !== "ok") {
      throw new Error(json.message || "Unknown error dari Apps Script");
    }

    // Normalisasi tipe data angka (Sheets kadang kirim string)
    const rows = (json.data || []).map(row => normalizeRow(row, sheetKey));
    _DB[sheetKey] = rows;
    return rows;

  } catch (err) {
    console.error(`[data.js] Gagal fetch sheet '${sheetName}':`, err);
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
    bastSmPpk:        ["Tahun", "Total_Honor"],
    bast_sm_ppk:       ["Tahun", "Total_Honor"],
    parameter:        ["TAHUN_AKTIF", "BATAS_HONOR_MAKSIMUM"],
  };

  const fields = angkaFields[sheetKey] || [];
  fields.forEach(f => {
    if (r[f] !== undefined && r[f] !== "") {
      r[f] = Number(r[f]) || 0;
    }
  });

  return r;
}

// ─── Core: POST data ke sheet ─────────────────────────────────
async function postToSheet(sheetKey, action, data, options = {}) {
  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.startsWith("GANTI")) {
    throw new Error("APPS_SCRIPT_URL belum diisi di config.js!");
  }

  const sheetName = resolveSheetName(sheetKey);

  const body = {
    action,
    sheet: sheetName,
    data,
    ...options,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // Apps Script tidak terima application/json karena CORS preflight
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
  // Invalidate cache supaya fetch berikutnya ambil data terbaru
  _DB[sheetKey] = null;
  return result;
}

// ─── Public: Update baris berdasar key ───────────────────────
async function updateInSheet(sheetKey, keyField, keyValue, newData) {
  const result = await postToSheet(sheetKey, "update", newData, { keyField, keyValue });
  _DB[sheetKey] = null;
  return result;
}

// ─── Public: Hapus cache (paksa refresh) ─────────────────────
function clearCache(sheetKey) {
  if (sheetKey) {
    _DB[sheetKey] = null;
  } else {
    Object.keys(_DB).forEach(k => { _DB[k] = null; });
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
