// ============================================================
// AUTH.JS — Sistem Autentikasi & Manajemen Sesi Pengguna
// Mengelola login, logout, sesi, dan Hak Akses berbasis Role:
// - OPERATOR : Membuat & mengelola draft SPK / BAST
// - PPK      : Verifikasi (Setujui / Tolak) dokumen SPK & BAST
// - ADMIN    : Akses penuh ke seluruh sistem
// ============================================================

const AUTH_SESSION_KEY = "spkbast_user_session";

// ─── Default Fallback Users (digunakan jika Sheet pengguna belum ada) ───
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
    username: "operator",
    password: "operator",
    nama: "Operator Administrasi",
    nip: "199203152018021001",
    role: "OPERATOR",
    jabatan: "Staf Administrasi Dokumen"
  },
  {
    username: "admin",
    password: "admin",
    nama: "Administrator Sistem",
    nip: "198001012005011001",
    role: "ADMIN",
    jabatan: "Admin Sistem SPK/BAST"
  }
];

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
    return user ? (user.role || "OPERATOR").toUpperCase() : "GUEST";
  },

  isPPK() {
    const role = this.getRole();
    return role === "PPK" || role === "ADMIN";
  },

  isOperator() {
    const role = this.getRole();
    return role === "OPERATOR" || role === "ADMIN";
  },

  isAdmin() {
    return this.getRole() === "ADMIN";
  },

  // Fungsi Login
  async login(username, password, rememberMe = false) {
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "").trim();

    if (!u || !p) throw new Error("Username dan Password wajib diisi");

    let userFound = null;

    // 1. Coba cari dari Google Sheets (jika getPengguna tersedia)
    if (typeof getPengguna === "function") {
      try {
        const usersFromSheet = await getPengguna();
        if (Array.isArray(usersFromSheet) && usersFromSheet.length > 0) {
          const match = usersFromSheet.find(row => {
            const rUser = String(row.Username || row.username || "").trim().toLowerCase();
            const rPass = String(row.Password || row.Password_Hash || row.password || "").trim();
            return rUser === u && (rPass === p || rPass === p + "123");
          });
          if (match) {
            userFound = {
              username: match.Username || match.username,
              nama: match.Nama_Lengkap || match.Nama || match.nama || u,
              nip: match.NIP || match.nip || "",
              role: String(match.Role || match.role || "OPERATOR").toUpperCase(),
              jabatan: match.Jabatan || match.jabatan || ""
            };
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet pengguna, menggunakan fallback default accounts:", err.message);
      }
    }

    // 2. Fallback ke DEFAULT_USERS jika tidak ditemukan di sheet
    if (!userFound) {
      const matchDefault = DEFAULT_USERS.find(d => d.username === u && (d.password === p || d.password + "123" === p));
      if (matchDefault) {
        userFound = { ...matchDefault };
      }
    }

    if (!userFound) {
      throw new Error("Username atau Password salah! Coba login sebagai 'ppk' / 'ppk', 'operator' / 'operator', atau 'admin' / 'admin'.");
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
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    if (currentPage === "login.html") return;

    if (!this.isLoggedIn()) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
      return;
    }

    if (allowedRoles.length > 0) {
      const role = this.getRole();
      if (!allowedRoles.includes(role) && role !== "ADMIN") {
        alert("Akses Ditolak: Halaman ini khusus untuk role " + allowedRoles.join(" / "));
        window.location.href = role === "PPK" ? "verifikasi-ppk.html" : "index.html";
      }
    }
  }
};

// Auto-run auth guard saat DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (page === "login.html") return;

  // HAK AKSES: Hanya halaman verifikasi-ppk.html yang membutuhkan Login PPK.
  // Halaman umum lainnya (Form, Daftar Dokumen, Master Data) dapat diakses bebas tanpa login.
  if (page === "verifikasi-ppk.html") {
    Auth.requireAuth(["PPK", "ADMIN"]);
  }
});
