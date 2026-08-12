// ============================================================
// AUTH.JS — Sistem Autentikasi & Manajemen Sesi Pengguna
// Role: PENGGUNA | PPK | KATIM | ADMIN
//
// PERFORMA: DEFAULT_USERS (admin/ppk/katim) dicek PERTAMA
// secara sinkron sebelum network call apapun → login instan.
// ============================================================

const AUTH_SESSION_KEY = "spkbast_user_session";

// ─── Default Fallback Users ───────────────────────────────────
const DEFAULT_USERS = [
  { username: "ppk",   password: "ppk",   nama: "Pejabat Pembuat Komitmen", nip: "198501012010011001", role: "PPK",   jabatan: "Pejabat Pembuat Komitmen BPS Subulussalam" },
  { username: "admin", password: "admin", nama: "Administrator Sistem",     nip: "198001012005011001", role: "ADMIN", jabatan: "Admin Sistem SPK/BAST" },
  { username: "katim", password: "katim", nama: "Ketua Tim",                nip: "197501012000011001", role: "KATIM", jabatan: "Ketua Tim BPS Kota Subulussalam" },
];

// ─── Helper: deteksi nama halaman saat ini ───────────────────
// Handle Vercel cleanUrls (URL tanpa .html) maupun dengan .html
function _getCurrentPage() {
  const pathname = window.location.pathname || "/";
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  if (last.endsWith(".html")) return last.toLowerCase();
  if (last === "") return "login.html"; // root → default ke login
  return last.toLowerCase() + ".html";
}

// ─── Helper: strip gelar & pangkat dari nama ─────────────────
function _stripGelardanPangkat(nama) {
  if (!nama) return "";
  let n = String(nama).trim();
  n = n.replace(/,\s*[A-Z][a-z]?\.\w+(\.\w+)*\s*$/g, "");
  n = n.replace(/,\s*$/, "");
  n = n.replace(/^(Drs\.|Dra\.|Dr\.|Ir\.|Prof\.|KH\.|H\.|Hj\.)\s*/i, "");
  return n.trim().toLowerCase();
}

// ─── Helper: password kustom di localStorage ─────────────────
const _PWD_PREFIX  = "spkbast_pwd_";
const _ROLE_PREFIX = "spkbast_role_";

function _getCustomPwd(username) {
  try { return localStorage.getItem(_PWD_PREFIX + username) || null; } catch { return null; }
}
function _setCustomPwd(username, password) {
  try { localStorage.setItem(_PWD_PREFIX + username, password); } catch {}
}
function _getAssignedRole(username) {
  try {
    const r = localStorage.getItem(_ROLE_PREFIX + username);
    return (r && ["PENGGUNA","PPK","KATIM","ADMIN"].includes(r)) ? r : null;
  } catch { return null; }
}

const Auth = {
  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  },

  isLoggedIn() {
    const user = this.getUser();
    return user !== null && !!user.username;
  },

  getRole() {
    const user = this.getUser();
    return user ? (user.role || "PENGGUNA").toUpperCase() : "GUEST";
  },

  isPPK()      { return this.getRole() === "PPK";      },
  isPengguna() { return this.getRole() === "PENGGUNA"; },
  isAdmin()    { return this.getRole() === "ADMIN";    },
  isKatim()    { return this.getRole() === "KATIM";    },

  // ─── Login ─────────────────────────────────────────────────
  async login(username, password, rememberMe = false) {
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "").trim();
    if (!u || !p) throw new Error("Username dan Password wajib diisi");

    let userFound = null;

    // ── LANGKAH 1: Cek DEFAULT_USERS dulu (SINKRON, instan) ──
    // Ini yang buat login admin/ppk/katim jadi cepat
    const matchDefault = DEFAULT_USERS.find(d => d.username === u);
    if (matchDefault) {
      const customPwd = _getCustomPwd(u);
      const validPwd  = customPwd !== null ? customPwd : matchDefault.password;
      if (validPwd === p) {
        userFound = { ...matchDefault };
      } else {
        // Username ada di DEFAULT_USERS tapi password salah → langsung error
        throw new Error("Username atau Password salah!");
      }
    }

    // ── LANGKAH 2: Sheet "pengguna" (hanya jika bukan DEFAULT_USER) ──
    if (!userFound && typeof getPengguna === "function") {
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
              nama:     match.Nama_Lengkap || match.Nama || match.nama || u,
              nip:      match.NIP || match.nip || "",
              role:     String(match.Role || match.role || "PENGGUNA").toUpperCase(),
              jabatan:  match.Jabatan || match.jabatan || ""
            };
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet pengguna:", err.message);
      }
    }

    // ── LANGKAH 3: Sheet "pegawai" (nama bersih + password) ──
    if (!userFound && typeof getPegawai === "function") {
      try {
        const pegawaiData = await getPegawai();
        if (Array.isArray(pegawaiData) && pegawaiData.length > 0) {
          const match = pegawaiData.find(pg =>
            _stripGelardanPangkat(pg.Nama_Pegawai || pg.Nama || "") === u
          );
          if (match) {
            const namaBersih = _stripGelardanPangkat(match.Nama_Pegawai || match.Nama || "");
            const customPwd  = _getCustomPwd(namaBersih);
            const validPwd   = customPwd !== null ? customPwd : "password";
            if (validPwd === p) {
              // Cek role yang di-assign Admin, fallback ke PENGGUNA
              const assignedRole = _getAssignedRole(namaBersih) || "PENGGUNA";
              userFound = {
                username: namaBersih,
                nama:     match.Nama_Pegawai || match.Nama || u,
                nip:      match.NIP || match.nip || "",
                role:     assignedRole,
                jabatan:  match.Jabatan || match.jabatan || ""
              };
            }
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet pegawai:", err.message);
      }
    }

    if (!userFound) throw new Error("Username atau Password salah!");

    const sessionData = JSON.stringify({ ...userFound, loginAt: new Date().toISOString() });
    if (rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, sessionData);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, sessionData);
    }
    return userFound;
  },

  // ─── Change Password ───────────────────────────────────────
  changePassword(oldPassword, newPassword) {
    const user = this.getUser();
    if (!user)            throw new Error("Belum login");
    if (!oldPassword || !newPassword) throw new Error("Password tidak boleh kosong");
    if (newPassword.length < 4)       throw new Error("Password baru minimal 4 karakter");

    const u         = user.username;
    const customPwd = _getCustomPwd(u);
    const def       = DEFAULT_USERS.find(d => d.username === u);
    const currentPwd = customPwd !== null ? customPwd : (def ? def.password : "password");

    if (oldPassword !== currentPwd) throw new Error("Password lama tidak sesuai");
    _setCustomPwd(u, newPassword);
    return true;
  },

  // ─── Redirect berdasarkan role ─────────────────────────────
  _redirectByRole(role) {
    if      (role === "ADMIN") window.location.replace("admin.html");
    else if (role === "PPK")   window.location.replace("verifikasi-ppk.html");
    else if (role === "KATIM") window.location.replace("katim.html");
    else                       window.location.replace("index.html");
  },

  // ─── Logout ────────────────────────────────────────────────
  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.location.replace("login.html");
  },

  // ─── requireAuth ───────────────────────────────────────────
  requireAuth(allowedRoles = []) {
    const page = _getCurrentPage();
    if (page === "login.html") return true;
    if (!this.isLoggedIn()) { window.location.replace("login.html"); return false; }
    if (allowedRoles.length > 0) {
      const role = this.getRole();
      if (!allowedRoles.includes(role)) { this._redirectByRole(role); return false; }
    }
    return true;
  }
};

// ─── Page Guard ───────────────────────────────────────────────
// Dipanggil HANYA SATU KALI saat DOMContentLoaded.
// ADMIN boleh akses semua halaman (kecuali index.html beranda pengguna).
function checkPageAuth() {
  const page = _getCurrentPage();
  if (page === "login.html") return;

  if (!Auth.isLoggedIn()) {
    window.location.replace("login.html");
    return;
  }

  const role = Auth.getRole();

  // ── Halaman eksklusif — hanya role tertentu ───────────────
  if (page === "admin.html") {
    if (role !== "ADMIN") Auth._redirectByRole(role);
    return;
  }
  if (page === "verifikasi-ppk.html") {
    if (role !== "PPK" && role !== "ADMIN") Auth._redirectByRole(role);
    return;
  }
  if (page === "katim.html") {
    if (role !== "KATIM" && role !== "ADMIN") Auth._redirectByRole(role);
    return;
  }

  // ── Halaman yang butuh akses khusus ───────────────────────
  // Form buat dokumen: PENGGUNA tidak boleh
  if (page === "form.html" && role === "PENGGUNA") {
    window.location.replace("dokumen.html"); return;
  }

  // Profile & preview: semua boleh
  if (page === "profil.html" || page === "preview.html") return;

  // index.html (dashboard pengguna): ADMIN & PPK diarahkan ke halaman masing-masing
  if (page === "index.html") {
    if (role === "ADMIN") { window.location.replace("admin.html"); return; }
    if (role === "PPK")   { window.location.replace("verifikasi-ppk.html"); return; }
  }

  // Halaman data & dokumen (kegiatan, pegawai, mitra, dokumen):
  // ADMIN boleh semua, KATIM boleh semua, PPK boleh semua, PENGGUNA boleh semua
  // → tidak ada restriksi tambahan, semua role yang sudah login boleh akses
}

// Panggil SATU KALI saja saat DOMContentLoaded
document.addEventListener("DOMContentLoaded", checkPageAuth);
