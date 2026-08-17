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
    { section: "Utama" },
    { icon: "📊", label: "Dashboard",       href: "index.html"   },
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
        { icon: "🗺️", label: "Penugasan Petugas",   href: "katim.html",          badge: "KATIM" },
      ];
    }

    // Gabungkan extra + shared (Dashboard & shared items)
    const allNavItems = [...NAV_SHARED.slice(0, 2), ...extraNavItems, ...NAV_SHARED.slice(2)];

    let navHTML = "";
    for (const item of allNavItems) {
      if (item.section) {
        navHTML += `<div class="nav-section-label">${item.section}</div>`;
        continue;
      }
      const isActive = currentPage === item.href || (item.href === "index.html" && (currentPage === "" || currentPage === "index.html"));
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
      PPK:      "#047857",
      ADMIN:    "#7c3aed",
      KATIM:    "#b45309",
      PENGGUNA: "#1d4ed8"
    };
    const roleColor = roleColors[role] || "#1d4ed8";
    const roleBadge = {
      PPK:      "PPK",
      ADMIN:    "ADMIN",
      KATIM:    "Ketua Tim",
      PENGGUNA: "Pengguna"
    };

    return `
      <div style="padding: 12px; margin: 10px; background: #f8fafc; border: 1px solid var(--gray-200); border-radius: var(--radius-md);">
        <div style="font-weight: 700; font-size: 0.82rem; color: var(--gray-800); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${user.nama || user.username}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span style="font-size: 0.68rem; font-weight: 800; color: ${roleColor}; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">${roleBadge[role] || role}</span>
          <button type="button" onclick="Auth.logout()" style="background: none; border: none; color: #dc2626; font-weight: 700; font-size: 0.75rem; cursor: pointer; padding: 0;">🚪 Keluar</button>
        </div>
      </div>`;
  }

  // ─── Helper: wrapper HTML sidebar ─────────────────────────
  function _buildSidebarWrapper(navHTML, userFooterHTML) {
    return `
      <aside class="sidebar" id="app-sidebar">
        <a href="index.html" class="sidebar-logo" style="text-decoration: none; color: inherit;">
          <div class="logo-icon">📜</div>
          <div class="logo-text">
            <div class="title">WEBPADKU</div>
            <div class="sub">BPS Kota Subulussalam</div>
          </div>
        </a>
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
    } else {
      const existingSidebar = document.querySelector("aside.sidebar");
      if (existingSidebar) {
        existingSidebar.outerHTML = buildSidebar();
      }
    }

    // Auto-inject tombol Kembali ke Dashboard pada topbar-actions halaman non-index
    if (currentPage !== "index.html" && currentPage !== "login.html") {
      const topbarActions = document.querySelector(".topbar-actions");
      if (topbarActions && !topbarActions.querySelector(".btn-back-dashboard")) {
        const btnDash = document.createElement("a");
        btnDash.href = "index.html";
        btnDash.className = "btn btn-sm btn-outline btn-back-dashboard";
        btnDash.style.cssText = "display:inline-flex; align-items:center; gap:5px; font-weight:600; text-decoration:none;";
        btnDash.innerHTML = "<span>📊</span> Dashboard";
        topbarActions.insertBefore(btnDash, topbarActions.firstChild);
      }
    }
  });
})();
