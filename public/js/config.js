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
    PEGAWAI: "Pegawai",                  // Data pegawai BPS
    MITRA: "Mitra",                      // Data mitra/PPL
    KEGIATAN: "Kegiatan",                // Daftar kegiatan yang butuh mitra
    SURAT_TUGAS: "Surat_Tugas",          // Data surat tugas
    SPK_BAST: "SPK_BAST",                // Dokumen SPK & BAST per mitra
    DETAIL_PEKERJAAN: "Detail_Pekerjaan",// Detail pekerjaan per dokumen
    BAST_SM_PPK: "BAST_SM_PPK",          // BAST kumpulan kegiatan besar (SM-PPK)
    PARAMETER: "Parameter",              // Konfigurasi sistem
    PENGGUNA: "User",                    // Akun pengguna & role
    USER: "User",
    USERS: "User",
    MAPPING_PETUGAS: "Mapping_Petugas",  // Mapping KATIM
    MAPPING: "Mapping_Petugas",          // Alias
  },
};
