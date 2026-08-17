// ============================================================
// CONFIG.JS — Konfigurasi Global Sistem SPK/BAST Generator
// ============================================================

const CONFIG = {
  // ──────────────────────────────────────────────────────────
  // GANTI URL INI setelah deploy Apps Script!
  // Cara dapat URL: Apps Script → Deploy → Manage Deployments → copy URL
  // Format: https://script.google.com/macros/s/XXXXXX.../exec
  // ──────────────────────────────────────────────────────────
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPu6KtV8BsnHtlEr5mu5ybzxzoHQlUi74KVdWvwKoAlXMB5wO4YdBYSKekI2tkB1mA/exec",

  // Nama sheet/tab di Google Sheets — sesuai nama tab asli di spreadsheet
  SHEETS: {
    PEGAWAI: "pegawai",          // Data pegawai BPS
    MITRA: "mitra",            // Data mitra/PPL
    KEGIATAN: "kegiatan",         // Daftar kegiatan yang butuh mitra
    SURAT_TUGAS: "surat_tugas",      // Data surat tugas (untuk template dokumen)
    SPK_BAST: "spk_bast",         // Dokumen SPK & BAST per mitra
    DETAIL_PEKERJAAN: "detail_pekerjaan", // Detail pekerjaan per dokumen
    BAST_SM_PPK: "bast_sm_ppk",      // BAST kumpulan kegiatan besar (SM-PPK)
    PARAMETER: "parameter",        // Konfigurasi sistem
    PENGGUNA: "pengguna",          // Akun pengguna & role (Operator, PPK, Admin)
    MAPPING_PETUGAS: "mapping_petugas", // Mapping KATIM: petugas → kegiatan + tanggal
  },
};
