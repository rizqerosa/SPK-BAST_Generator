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
  // ── 11 Akun Pengguna dari Database Sheet User ──
  { id: "1",  username: "srideza",       password: "123456", nama: "Sri Deza",            role: "ADMIN",    sub_role: "",           jabatan: "Administrator Sistem" },
  { id: "2",  username: "rizqerosalia",  password: "123456", nama: "Rizqe Rosalia",       role: "ADMIN",    sub_role: "",           jabatan: "Administrator Sistem" },
  { id: "3",  username: "armajuwita",    password: "123456", nama: "Armajuwita",          role: "PPK",      sub_role: "",           jabatan: "Pejabat Pembuat Komitmen (PPK)" },
  { id: "4",  username: "triwahyudi",    password: "123456", nama: "Tri Wahyudi",         role: "KATIM",    sub_role: "distribusi", jabatan: "Ketua Tim Distribusi" },
  { id: "5",  username: "radendaffa",    password: "123456", nama: "Raden Daffa",         role: "KATIM",    sub_role: "neraca",     jabatan: "Ketua Tim Neraca" },
  { id: "6",  username: "thariqalfatih", password: "123456", nama: "Thariq Alfatih",      role: "KATIM",    sub_role: "produksi",   jabatan: "Ketua Tim Produksi" },
  { id: "7",  username: "mutiasoraya",   password: "123456", nama: "Mutia Soraya",        role: "KATIM",    sub_role: "pengolahan", jabatan: "Ketua Tim Pengolahan" },
  { id: "8",  username: "putrinurhilwa", password: "123456", nama: "Putri Nurhilwa",      role: "KATIM",    sub_role: "sosial",     jabatan: "Ketua Tim Sosial" },
  { id: "9",  username: "suciarti",      password: "123456", nama: "Suciarti",           role: "KATIM",    sub_role: "diseminasi", jabatan: "Ketua Tim Diseminasi" },
  { id: "10", username: "adiputra",      password: "123456", nama: "Adi Putra",           role: "PENGGUNA", sub_role: "",           jabatan: "Pengguna / Staf BPS" },
  { id: "11", username: "ernilusiani",   password: "123456", nama: "Erni Lusiani",        role: "PENGGUNA", sub_role: "",           jabatan: "Pengguna / Staf BPS" },

  // ── Akun Default / Fallback Tambahan ──
  { id: "99", username: "admin",         password: "admin",  nama: "Administrator Sistem",role: "ADMIN",    sub_role: "",           jabatan: "Admin Sistem SPK/BAST" },
  { id: "98", username: "ppk",           password: "ppk",    nama: "Pejabat Pembuat Komitmen", role: "PPK",  sub_role: "",           jabatan: "Pejabat Pembuat Komitmen" },
  { id: "97", username: "katim",         password: "katim",  nama: "Ketua Tim",           role: "KATIM",    sub_role: "",           jabatan: "Ketua Tim BPS" },
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

  getSubRole() {
    const user = this.getUser();
    return user ? (user.sub_role || "") : "";
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
    const matchDefault = DEFAULT_USERS.find(d => d.username.toLowerCase() === u);
    if (matchDefault) {
      const customPwd = _getCustomPwd(u);
      const validPwd  = customPwd !== null ? customPwd : matchDefault.password;
      if (validPwd === p) {
        userFound = { ...matchDefault };
      }
    }

    // ── LANGKAH 2: Sheet "user" / "pengguna" ──
    if (!userFound && typeof getPengguna === "function") {
      try {
        const usersFromSheet = await getPengguna();
        if (Array.isArray(usersFromSheet) && usersFromSheet.length > 0) {
          const match = usersFromSheet.find(row => {
            const rUser = String(row.username || row.Username || "").trim().toLowerCase();
            const rPass = String(row.password || row.Password || row.Password_Hash || "").trim();
            const isDeleted = row.deleted_at && String(row.deleted_at).trim() !== "" && String(row.deleted_at).trim() !== "-";
            return rUser === u && rPass === p && !isDeleted;
          });
          if (match) {
            let roleStr = String(match.role || match.Role || "PENGGUNA").trim().toUpperCase();
            if (roleStr === "USER" || roleStr === "OPERATOR") roleStr = "PENGGUNA";
            const subRole = (match.sub_role && String(match.sub_role).trim() !== "-") ? String(match.sub_role).trim() : "";

            userFound = {
              id:       match.id || match.ID || "",
              username: (match.username || match.Username || u).toLowerCase(),
              nama:     match.nama || match.Nama || match.Nama_Lengkap || u,
              nip:      match.nip || match.NIP || "",
              role:     roleStr,
              sub_role: subRole,
              jabatan:  match.jabatan || match.Jabatan || (roleStr === "KATIM" && subRole ? `Ketua Tim ${subRole}` : "")
            };
          }
        }
      } catch (err) {
        console.warn("[auth.js] Gagal fetch sheet user/pengguna:", err.message);
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
              const assignedRole = _getAssignedRole(namaBersih) || "PENGGUNA";
              userFound = {
                username: namaBersih,
                nama:     match.Nama_Pegawai || match.Nama || u,
                nip:      match.NIP || match.nip || "",
                role:     assignedRole,
                sub_role: "",
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

    // Lengkapi NIP atau Nama dari data pegawai jika ada
    if (typeof getPegawai === "function" && (!userFound.nip || !userFound.nama || userFound.nama === userFound.username)) {
      try {
        const pList = await getPegawai();
        if (Array.isArray(pList)) {
          const matchedPeg = pList.find(pg => {
            const clean = _stripGelardanPangkat(pg.Nama_Pegawai || pg.Nama || "").replace(/\s+/g, "");
            return clean.includes(u) || u.includes(clean);
          });
          if (matchedPeg) {
            if (!userFound.nip) userFound.nip = matchedPeg.NIP || matchedPeg.nip || "";
            if (!userFound.nama || userFound.nama === userFound.username) userFound.nama = matchedPeg.Nama_Pegawai || matchedPeg.Nama || userFound.nama;
          }
        }
      } catch {}
    }

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
