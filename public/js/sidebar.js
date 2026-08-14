// ============================================================
// SIDEBAR.JS — Shared Sidebar untuk semua halaman
// Auto-inject sidebar HTML, deteksi halaman aktif dari URL,
// & menyesuaikan menu berdasarkan Role (PENGGUNA, PPK, KATIM, ADMIN)
//
// Semua role punya menu SHARED:
//   - Daftar Kegiatan
//   - Daftar Pegawai
//   - Daftar Mitra
//   - Daftar Dokumen
//
// Menu TAMBAHAN per role:
//   ADMIN   : Manajemen User, Buat Dokumen
//   PPK     : Verifikasi Dokumen
//   KATIM   : Mapping Petugas
//   PENGGUNA: (tidak ada tambahan)
// ============================================================

(function () {
  // Deteksi halaman aktif — handle Vercel cleanUrls (tanpa .html)
  function _getCurrentPageName() {
    const p = window.location.pathname || "/";
    const seg = p.split("/").filter(Boolean);
    const last = seg[seg.length - 1] || "";
    if (last.endsWith(".html")) return last.toLowerCase();
    if (!last) return "login.html";
    return last.toLowerCase() + ".html";
  }

  const currentPage = _getCurrentPageName();

  // ─── Shared nav items (muncul di semua role) ──────────────
  const NAV_SHARED = [
    { section: "Data Referensi" },
    { icon: "📁", label: "Daftar Kegiatan", href: "kegiatan.html" },
    { icon: "🏛️", label: "Daftar Pegawai",  href: "pegawai.html" },
    { icon: "🤝", label: "Daftar Mitra",    href: "mitra.html"   },
    { icon: "📋", label: "Daftar Dokumen",  href: "dokumen.html" },
    { section: "Akun" },
    { icon: "👤", label: "Profil Saya",     href: "profil.html"  },
  ];

  function buildSidebar() {
    const user = (typeof Auth !== "undefined" && Auth.getUser) ? Auth.getUser() : null;
    const role = (typeof Auth !== "undefined" && Auth.getRole) ? Auth.getRole() : "GUEST";

    let extraNavItems = [];

    if (role === "ADMIN") {
      extraNavItems = [
        { section: "Administrasi" },
        { icon: "👥", label: "Manajemen User",     href: "admin.html",         badge: "ADMIN" },
        { icon: "➕", label: "Buat Dokumen",        href: "form.html"           },
      ];
    } else if (role === "PPK") {
      extraNavItems = [
        { section: "Verifikasi" },
        { icon: "✅", label: "Verifikasi Dokumen", href: "verifikasi-ppk.html", badge: "PPK" },
      ];
    } else if (role === "KATIM") {
      extraNavItems = [
        { section: "Ketua Tim" },
        { icon: "🗺️", label: "Mapping Petugas",   href: "katim.html",          badge: "KATIM" },
      ];
    }

    // Gabungkan extra + shared
    const allNavItems = [...extraNavItems, ...NAV_SHARED];

    let navHTML = "";
    for (const item of allNavItems) {
      if (item.section) {
        navHTML += `<div class="nav-section-label">${item.section}</div>`;
        continue;
      }
      const isActive = currentPage === item.href;
      const badgeHTML = item.badge
        ? `<span style="margin-left:auto; background:${_badgeBg(item.badge)}; color:${_badgeColor(item.badge)}; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:10px;">${item.badge}</span>`
        : "";
      navHTML += `
        <a href="${item.href}" class="nav-item${isActive ? " active" : ""}">
          <span class="nav-icon">${item.icon}</span> ${item.label} ${badgeHTML}
        </a>`;
    }

    const userFooterHTML = _buildUserFooter(user, role);
    return _buildSidebarWrapper(navHTML, userFooterHTML);
  }

  // ─── Helper: warna badge berdasarkan tipe ─────────────────
  function _badgeBg(badge) {
    const map = { ADMIN: "#ede9fe", PPK: "#dcfce7", KATIM: "#fef3c7" };
    return map[badge] || "#dbeafe";
  }
  function _badgeColor(badge) {
    const map = { ADMIN: "#5b21b6", PPK: "#166534", KATIM: "#92400e" };
    return map[badge] || "#1e40af";
  }

  // ─── Helper: footer user di bawah sidebar ─────────────────
  function _buildUserFooter(user, role) {
    if (!user) return "";

    const roleColors = {
      PPK:      "#10b981",
      ADMIN:    "#a855f7",
      KATIM:    "#f59e0b",
      PENGGUNA: "#38bdf8"
    };
    const roleColor = roleColors[role] || "#38bdf8";
    const roleBadge = {
      PPK:      "PPK",
      ADMIN:    "ADMIN",
      KATIM:    "Ketua Tim",
      PENGGUNA: "Pengguna"
    };

    return `
      <div style="padding: 12px; margin: 10px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-md); backdrop-filter: blur(4px);">
        <div style="font-weight: 700; font-size: 0.82rem; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${user.nama || user.username}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span style="font-size: 0.65rem; font-weight: 800; color: ${roleColor}; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15);">${roleBadge[role] || role}</span>
          <button type="button" onclick="Auth.logout()" style="background: none; border: none; color: #f43f5e; font-weight: 700; font-size: 0.75rem; cursor: pointer; padding: 0; display:flex; align-items:center; gap:4px;">🚪 Keluar</button>
        </div>
      </div>`;
  }

  // ─── Helper: wrapper HTML sidebar ─────────────────────────
  function _buildSidebarWrapper(navHTML, userFooterHTML) {
    return `
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon-svg" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="9" fill="url(#sidebar_logo_grad)"/>
              <path d="M11 10C11 8.89543 11.8954 8 13 8H20L25 13V24C25 25.1046 24.1046 26 23 26H13C11.8954 26 11 25.1046 11 24V10Z" fill="white" fill-opacity="0.16" stroke="white" stroke-width="1.6"/>
              <path d="M20 8V13H25" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="14.5" y1="17" x2="21.5" y2="17" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="14.5" y1="21" x2="19" y2="21" stroke="#34D399" stroke-width="1.8" stroke-linecap="round"/>
              <defs>
                <linearGradient id="sidebar_logo_grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#10B981"/>
                  <stop offset="0.6" stop-color="#047857"/>
                  <stop offset="1" stop-color="#064E3B"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="logo-text">
            <div class="title" style="letter-spacing:0.8px; font-weight:800; font-size:0.85rem; color:#fff;">WEBPADKU</div>
            <div class="sub" style="color:rgba(255,255,255,0.65); font-size:0.65rem;">BPS Kota Subulussalam</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHTML}</nav>
        ${userFooterHTML}
        <div class="sidebar-footer">BPS Kota Subulussalam &copy; 2026</div>
      </aside>`;
  }

  // Inject sidebar ke dalam #app-sidebar-placeholder atau element aside.sidebar
  document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("app-sidebar-placeholder");
    if (placeholder) {
      placeholder.outerHTML = buildSidebar();
      return;
    }
    const existingSidebar = document.querySelector("aside.sidebar");
    if (existingSidebar) {
      existingSidebar.outerHTML = buildSidebar();
    }
  });
})();
