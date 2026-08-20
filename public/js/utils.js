// ============================================================
// UTILS.JS — Pure utility functions (no DOM dependency)
// ============================================================

// ─── terbilang() ─────────────────────────────────────────────
const _SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan",
  "Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas",
  "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas"];
const _PULUHAN = ["", "", "Dua Puluh", "Tiga Puluh", "Empat Puluh", "Lima Puluh",
  "Enam Puluh", "Tujuh Puluh", "Delapan Puluh", "Sembilan Puluh"];

function _ratus(n) {
  if (n === 0) return "";
  if (n < 20) return _SATUAN[n];
  if (n < 100) {
    const p = Math.floor(n / 10), s = n % 10;
    return _PULUHAN[p] + (s > 0 ? " " + _SATUAN[s] : "");
  }
  const r = Math.floor(n / 100), sisa = n % 100;
  const prefix = r === 1 ? "Seratus" : _SATUAN[r] + " Ratus";
  return prefix + (sisa > 0 ? " " + _ratus(sisa) : "");
}

/**
 * Ubah angka ke teks Indonesia.
 * Contoh: terbilang(660000) → "Enam Ratus Enam Puluh Ribu"
 */
function terbilang(angka) {
  angka = Math.floor(Math.abs(angka));
  if (angka === 0) return "Nol";

  const triliun  = Math.floor(angka / 1_000_000_000_000);
  const miliar   = Math.floor((angka % 1_000_000_000_000) / 1_000_000_000);
  const juta     = Math.floor((angka % 1_000_000_000) / 1_000_000);
  const ribu     = Math.floor((angka % 1_000_000) / 1_000);
  const sisa     = angka % 1_000;

  let hasil = "";
  if (triliun > 0) hasil += _ratus(triliun) + " Triliun ";
  if (miliar  > 0) hasil += _ratus(miliar)  + " Miliar ";
  if (juta    > 0) hasil += _ratus(juta)    + " Juta ";
  if (ribu    > 0) {
    hasil += (ribu === 1 ? "Seribu" : _ratus(ribu) + " Ribu");
    if (ribu > 1) hasil += " ";
  }
  if (sisa    > 0) hasil += _ratus(sisa);

  return hasil.trim();
}

// ─── tanggalTerbilang() ───────────────────────────────────────
const _NAMA_HARI  = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const _NAMA_BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                     "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Ubah tanggal ISO ke objek info hari/bulan terbilang Bahasa Indonesia.
 * @param {string} tanggalISO - format "YYYY-MM-DD"
 * @returns {{ hari, tanggal, bulan, tahun, tanggalFormat }}
 * Contoh: "2026-01-05" →
 *   { hari:"Senin", tanggal:"Lima", bulan:"Januari", tahun:"Dua Ribu Dua Puluh Enam", tanggalFormat:"05-01-2026" }
 */
function tanggalTerbilang(tanggalISO) {
  if (!tanggalISO) return { hari: "-", tanggal: "-", bulan: "-", tahun: "-", tanggalFormat: "-" };

  // Normalisasi: ambil hanya bagian tanggal YYYY-MM-DD, abaikan waktu / spasi
  let str = String(tanggalISO).trim();
  // Handle format ISO dengan waktu: "2026-08-05T00:00:00" → "2026-08-05"
  if (str.includes("T")) str = str.split("T")[0];
  // Handle format dd/mm/yyyy (dari beberapa sumber Sheets)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [dd2, mm2, yyyy2] = str.split("/").map(Number);
    str = `${yyyy2}-${String(mm2).padStart(2,"0")}-${String(dd2).padStart(2,"0")}`;
  }

  const parts = str.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    console.warn("[tanggalTerbilang] Format tanggal tidak dikenali:", tanggalISO);
    return { hari: "-", tanggal: "-", bulan: "-", tahun: "-", tanggalFormat: String(tanggalISO) };
  }

  const [y, m, d] = parts;
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
    return { hari: "-", tanggal: "-", bulan: "-", tahun: "-", tanggalFormat: String(tanggalISO) };
  }

  const dt    = new Date(y, m - 1, d);
  const hari  = _NAMA_HARI[dt.getDay()];
  const bulan = _NAMA_BULAN[m];
  const dd    = String(d).padStart(2, "0");
  const mm    = String(m).padStart(2, "0");
  return {
    hari,
    tanggal:       terbilang(d),
    bulan,
    tahun:         terbilang(y),
    tanggalFormat: `${dd}-${mm}-${y}`,
  };
}

/**
 * Dapatkan metadata periode (Bulan, Tahun, Triwulan, Subround, Semester)
 */
function getPeriodMeta(dateStr, bulanName, tahunNum) {
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  let d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) d = new Date();

  let bName = bulanName;
  if (!bName) {
    bName = months[d.getMonth()];
  }

  let mIdx = months.findIndex(m => String(m).toLowerCase() === String(bName).toLowerCase());
  if (mIdx === -1) mIdx = d.getMonth();

  const yr = tahunNum || (!isNaN(d.getFullYear()) ? d.getFullYear() : new Date().getFullYear());
  const triwulan = Math.floor(mIdx / 3) + 1;
  const subround = mIdx < 4 ? 1 : (mIdx < 8 ? 2 : 3);
  const semester = mIdx < 6 ? 1 : 2;

  return {
    bulan: bName || months[mIdx],
    tahun: String(yr),
    triwulan: String(triwulan),
    subround: String(subround),
    semester: String(semester),
    monthIndex: mIdx
  };
}

/**
 * Format angka ke format mata uang Indonesia (1.234.567)
 */
function formatRupiah(angka) {
  if (angka == null) return "0";
  return Number(angka).toLocaleString("id-ID");
}

// ─── hitungTotalHonor() ───────────────────────────────────────
/**
 * Hitung total honor dari array detailPekerjaan untuk ID_Dokumen tertentu.
 */
function hitungTotalHonor(detailPekerjaanArray, idDokumen) {
  return detailPekerjaanArray
    .filter(d => d.ID_Dokumen === idDokumen)
    .reduce((sum, d) => sum + (Number(d.Nilai_Perjanjian) || 0), 0);
}

// ─── Flexible Property Getters (Mitra, Pegawai, Kegiatan) ───
function getMitraId(m) {
  if (!m) return "";
  return String(m.ID_Mitra || m["ID Mitra"] || m.ID || m.Sobat_ID || m["Sobat ID"] || m["SOBAT ID"] || m.NIK || "").trim();
}

function getMitraName(m) {
  if (!m) return "";
  return String(m.Nama_Mitra || m["Nama Mitra"] || m.Nama || m.Nama_Lengkap || m["Nama Lengkap"] || "").trim();
}

function getMitraPosisi(m) {
  if (!m) return "";
  return String(m.Posisi || m.Kategori || m.Jabatan || "Mitra").trim();
}

function getMitraAsal(m) {
  if (!m) return "";
  return String(m.Asal || m.Kecamatan || m["Kecamatan/Asal"] || m.Alamat_Detail || m.Alamat || "-").trim();
}

function getPegawaiNip(p) {
  if (!p) return "";
  return String(p.NIP || p["NIP"] || p.nip || "").trim();
}

function getPegawaiName(p) {
  if (!p) return "";
  return String(p.Nama_Pegawai || p["Nama Pegawai"] || p.Nama || "").trim();
}

function getKegiatanId(k) {
  if (!k) return "";
  return String(k.ID_Kegiatan || k["ID Kegiatan"] || k.ID || "").trim();
}

// ─── Lookup helpers ───────────────────────────────────────────
function cariPegawai(nip, pegawaiArray) {
  if (!nip || !pegawaiArray || !Array.isArray(pegawaiArray)) return null;
  const target = String(nip).trim().toLowerCase();
  const cleanTarget = target.replace(/[^a-z0-9]/g, "");

  // 1. Exact match NIP or Name
  let found = pegawaiArray.find(p => {
    const pNip  = getPegawaiNip(p).toLowerCase();
    const pName = getPegawaiName(p).toLowerCase();
    return (pNip && pNip === target) || (pName && pName === target);
  });
  if (found) return found;

  // 2. Clean alphanumeric match (ignoring dots, commas, spaces, titles)
  found = pegawaiArray.find(p => {
    const pNipClean  = getPegawaiNip(p).toLowerCase().replace(/[^a-z0-9]/g, "");
    const pNameClean = getPegawaiName(p).toLowerCase().replace(/[^a-z0-9]/g, "");
    return (pNipClean && (pNipClean === cleanTarget)) ||
           (pNameClean && cleanTarget && (pNameClean.includes(cleanTarget) || cleanTarget.includes(pNameClean)));
  });
  return found || null;
}

function cariMitra(idMitra, mitraArray) {
  if (!idMitra || !mitraArray) return null;
  const target = String(idMitra).trim().toLowerCase();
  return mitraArray.find(m => {
    const mId   = getMitraId(m).toLowerCase();
    const mNik  = String(m.NIK || "").trim().toLowerCase();
    const mName = getMitraName(m).toLowerCase();
    return (mId && mId === target) || (mNik && mNik === target) || (mName && mName === target);
  }) || null;
}

function cariKegiatan(idKegiatan, kegiatanArray) {
  if (!idKegiatan || !kegiatanArray) return null;
  const targetId = String(idKegiatan).trim();
  return kegiatanArray.find(k => getKegiatanId(k) === targetId) || null;
}

function getDetailByDokumen(detailPekerjaanArray, idDokumen) {
  return detailPekerjaanArray.filter(d => String(d.ID_Dokumen).trim() === String(idDokumen).trim());
}

/**
 * Format tanggal ISO ke format resmi Indonesia (contoh: "29 Juli 2026")
 */
function formatTanggal(isoStr) {
  if (!isoStr) return "-";
  let s = String(isoStr).trim();
  if (s.includes("T")) s = s.split("T")[0];
  if (s.includes(" ")) s = s.split(" ")[0];

  // Check dd/mm/yyyy or dd-mm-yyyy where year is 4 digits at end
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
    const sep = s.includes("/") ? "/" : "-";
    const [dStr, mStr, yStr] = s.split(sep);
    const d = parseInt(dStr, 10);
    const m = parseInt(mStr, 10);
    const y = parseInt(yStr, 10);
    const _BULAN_INDO = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    if (m >= 1 && m <= 12) return `${d} ${_BULAN_INDO[m]} ${y}`;
  }

  const parts = s.split("-");
  if (parts.length < 3) return s;
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[0], 10);
  if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
    const _BULAN_INDO = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${d} ${_BULAN_INDO[m]} ${y}`;
  }
  return s;
}


/**
 * Escape karakter HTML khusus (&, <, >, ", ')
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Ubah string ke format Title Case (huruf besar di awal kata).
 * Contoh: "PEMERIKSAAN LAPANGAN" -> "Pemeriksaan Lapangan"
 */
function toTitleCase(str) {
  if (!str) return "";
  return String(str).toLowerCase().replace(/(?:^|\s|-)\S/g, a => a.toUpperCase());
}


