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
  const [y, m, d] = tanggalISO.split("-").map(Number);
  const dt   = new Date(y, m - 1, d);
  const hari = _NAMA_HARI[dt.getDay()];
  const bulan = _NAMA_BULAN[m];
  const dd   = String(d).padStart(2, "0");
  const mm   = String(m).padStart(2, "0");
  return {
    hari,
    tanggal:      terbilang(d),
    bulan,
    tahun:        terbilang(y),
    tanggalFormat: `${dd}-${mm}-${y}`,
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
  if (!nip || !pegawaiArray) return null;
  const targetNip = String(nip).trim();
  return pegawaiArray.find(p => getPegawaiNip(p) === targetNip) || null;
}

function cariMitra(idMitra, mitraArray) {
  if (!idMitra || !mitraArray) return null;
  const targetId = String(idMitra).trim();
  return mitraArray.find(m => getMitraId(m) === targetId || String(m.ID_Mitra || "").trim() === targetId) || null;
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
 * Format tanggal ISO ke dd-mm-yyyy (display singkat)
 */
function formatTanggal(isoStr) {
  if (!isoStr) return "-";
  const parts = String(isoStr).split("-");
  if (parts.length < 3) return isoStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
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


