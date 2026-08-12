// ============================================================
// AUTH.JS — Sistem Autentikasi & Manajemen Sesi Pengguna
// Mengelola login, logout, sesi, dan Hak Akses berbasis Role:
// - PENGGUNA : Pengguna umum (dari daftar pegawai) — hanya lihat
// - PPK      : Verifikasi (Setujui / Tolak) dokumen SPK & BAST
// - KATIM    : Ketua Tim — Mapping Petugas ke Kegiatan
// - ADMIN    : Akses manajemen user sistem & buat dokumen
// ============================================================

const AUTH_SESSION_KEY = "spkbast_user_session";

// ─── Default Fallback Users ───────────────────────────────────
// Digunakan jika Sheet pengguna belum ada / tidak tersedia
const DEFAULT_USERS = [
  {
    username: "ppk",
    password: "ppk",
    nama: "Pejabat Pembuat Komitmen",
    nip: "198501012010011001",
    role: "PPK",
    jabatan: "Pejabat Pembuat Komitmen BPS Subulussalam"
  },
  {
    username: "admin",
    password: "admin",
    nama: "Administrator Sistem",
    nip: "198001012005011001",
    role: "ADMIN",
    jabatan: "Admin Sistem SPK/BAST"
  },
  {
    username: "katim",
    password: "katim",
    nama: "Ketua Tim",
    nip: "197501012000011001",
    role: "KATIM",
    jabatan: "Ketua Tim BPS Kota Subulussalam"
  }
];

// ─── Helper: strip gelar dari nama ───────────────────────────
// Menghapus gelar akademik/pangkat yang umum di belakang/depan nama
// Contoh: "Farida Hanum, S.Stat" → "farida hanum"
function _stripGelardanPangkat(nama) {
  if (!nama) return "";
  let n = String(nama).trim();

  // Hapus gelar belakang (setelah koma atau titik terakhir sebelum gelar)
  // Pola: ", S.Stat", ", S.Si", ", M.Si", ", S.E", ", M.M", dst.
  n = n.replace(/,\s*[A-Z][a-z]?\.\w+(\.\w+)*\s*$/g, "");

  // Hapus sisa koma di akhir
  n = n.replace(/,\s*$/, "");

  // Hapus pangkat di depan (Drs., Dr., Ir., dst.)
  n = n.replace(/^(Drs\.|Dra\.|Dr\.|Ir\.|Prof\.|KH\.|H\.|Hj\.)\s*/i, "");

  return n.trim().toLowerCase();
}

const Auth = {
  // Mendapatkan data user yang sedang login
  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  // Cek apakah user sedang logged in
  isLoggedIn() {
    const user = this.getUser();
    return user !== null && !!user.username;
  },

  // Mendapatkan Role user aktif (default: 'GUEST' jika belum login)
  getRole() {
    const user = this.getUser();
    return user ? (user.role || "PENGGUNA").toUpperCase() : "GUEST";
  },

  isPPK() {
    return this.getRole() === "PPK";
  },

  isPengguna() {
    return this.getRole() === "PENGGUNA";
  },

  isAdmin() {
    return this.getRole() === "ADMIN";
  },

  isKatim() {
    return this.getRole() === "KATIM";
  },

  // Fungsi Login
  async login(username, password, rememberMe = false) {
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "").trim();

    if (!u || !p) throw new Error("Username dan Password wajib diisi");

    let userFound = null;

    // 1. Coba cari dari sheet "pengguna" (Google Sheets)
    if (typeof getPengguna === "function") {
      try {
        const usersFromSheet = await getPengguna();
        if (Array.isArray(usersFromSheet) && usersFromSheet.length > 0) {
          const match = usersFromSheet.find(row => {
            const rUser = String(row.Username || row.username || "").trim().toLowerCase();
            const rPass = String(row.Password || row.Password_Hash || row.password || "").trim();
            return rUser === u && rPass === p;
          });
          if (match) {
            userFound = {
              username: (match.Username || match.username || u).toLowerCase(),
              nama: match.Nama_Lengkap || match.Nama || match.nama || u,
              nip: match.NIP || match.nip || "",
              role: String(match.Role || match.role || "PENGGUNA").toUpperCase(),
              jabatan: match.Jabatan || match.jabatan || ""
            };
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet pengguna:", err.message);
      }
    }

    // 2. Fallback ke DEFAULT_USERS (ppk, admin, katim)
    if (!userFound) {
      const matchDefault = DEFAULT_USERS.find(d => d.username === u && d.password === p);
      if (matchDefault) {
        userFound = { ...matchDefault };
      }
    }

    // 3. Fallback ke sheet "pegawai" — semua pegawai bisa login sebagai PENGGUNA
    //    username = nama bersih (tanpa gelar) lowercase
    //    password = "password"
    if (!userFound && p === "password" && typeof getPegawai === "function") {
      try {
        const pegawaiData = await getPegawai();
        if (Array.isArray(pegawaiData) && pegawaiData.length > 0) {
          const match = pegawaiData.find(pg => {
            const namaBersih = _stripGelardanPangkat(pg.Nama_Pegawai || pg.Nama || "");
            return namaBersih === u;
          });
          if (match) {
            const namaBersih = _stripGelardanPangkat(match.Nama_Pegawai || match.Nama || "");
            userFound = {
              username: namaBersih,
              nama: match.Nama_Pegawai || match.Nama || u,
              nip: match.NIP || match.nip || "",
              role: "PENGGUNA",   // selalu PENGGUNA untuk login via daftar pegawai
              jabatan: match.Jabatan || match.jabatan || ""
            };
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet pegawai untuk login:", err.message);
      }
    }

    if (!userFound) {
      throw new Error("Username atau Password salah!");
    }

    // Simpan sesi login
    const sessionData = JSON.stringify({
      ...userFound,
      loginAt: new Date().toISOString()
    });

    if (rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, sessionData);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, sessionData);
    }

    return userFound;
  },

  // Logout
  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = "login.html";
  },

  // Guard Halaman: pastikan user sudah login & sesuai role
  requireAuth(allowedRoles = []) {
    const rawPath = (window.location.pathname || "").split("/").pop() || "index.html";
    const currentPage = rawPath.split("?")[0].split("#")[0].toLowerCase();
    if (currentPage === "login.html") return true;

    if (!this.isLoggedIn()) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
      return false;
    }

    if (allowedRoles.length > 0) {
      const role = this.getRole();
      if (!allowedRoles.includes(role)) {
        // Redirect ke halaman yang sesuai role
        this._redirectByRole(role);
        return false;
      }
    }
    return true;
  },

  // Redirect ke halaman beranda sesuai role
  _redirectByRole(role) {
    if (role === "ADMIN") {
      window.location.href = "admin.html";
    } else if (role === "PPK") {
      window.location.href = "verifikasi-ppk.html";
    } else if (role === "KATIM") {
      window.location.href = "katim.html";
    } else {
      window.location.href = "index.html";
    }
  }
};

// ─── Page Guard: dijalankan saat script dimuat ────────────────
function checkPageAuth() {
  const rawPath = (window.location.pathname || "").split("/").pop() || "index.html";
  const page = rawPath.split("?")[0].split("#")[0].toLowerCase();

  // Halaman login tidak perlu guard
  if (page === "login.html") return;

  // Semua halaman wajib login
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html?redirect=" + encodeURIComponent(page);
    return;
  }

  const role = Auth.getRole();

  // ── Halaman khusus ADMIN saja ──────────────────────────────
  if (page === "admin.html") {
    if (role !== "ADMIN") {
      Auth._redirectByRole(role);
    }
    return;
  }

  // ── Halaman khusus PPK (juga bisa diakses ADMIN) ──────────
  if (page === "verifikasi-ppk.html") {
    if (role !== "PPK" && role !== "ADMIN") {
      Auth._redirectByRole(role);
    }
    return;
  }

  // ── Halaman khusus KATIM ───────────────────────────────────
  if (page === "katim.html") {
    if (role !== "KATIM" && role !== "ADMIN") {
      Auth._redirectByRole(role);
    }
    return;
  }

  // ── Halaman form (buat/edit dokumen) — PENGGUNA tidak boleh ──
  if (page === "form.html") {
    if (role === "PENGGUNA") {
      window.location.href = "dokumen.html";
      return;
    }
  }

  // ── Halaman umum (index, dokumen, mitra, pegawai, kegiatan, preview) ──
  // ADMIN → redirect ke admin.html (kecuali preview)
  if (role === "ADMIN" && page !== "preview.html") {
    window.location.href = "admin.html";
    return;
  }

  // KATIM → redirect ke katim.html kecuali halaman data & dokumen yang boleh dibuka
  const allowedForKatim = ["index.html", "dokumen.html", "kegiatan.html", "pegawai.html", "mitra.html", "preview.html"];
  if (role === "KATIM" && !allowedForKatim.includes(page)) {
    window.location.href = "katim.html";
    return;
  }
}

// Run immediately upon script load & on DOMContentLoaded
checkPageAuth();
document.addEventListener("DOMContentLoaded", checkPageAuth);
