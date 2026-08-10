// ============================================================
// SIDEBAR.JS — Shared Sidebar untuk semua halaman
// Auto-inject sidebar HTML, deteksi halaman aktif dari URL,
// & menyesuaikan menu berdasarkan Role (PPK, Operator, Admin)
// ============================================================

(function () {
  // Deteksi halaman aktif dari URL
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  function buildSidebar() {
    const user = (typeof Auth !== "undefined" && Auth.getUser) ? Auth.getUser() : null;
    const isPPK = (typeof Auth !== "undefined" && Auth.isPPK) ? Auth.isPPK() : false;

    const navItems = [
      { section: "Menu Utama" },
      { icon: "🏠", label: "Dashboard",        href: "index.html"        },
      { icon: "📋", label: "Daftar Dokumen",   href: "dokumen.html"      },
      { icon: "🏛️", label: "Verifikasi PPK",   href: "verifikasi-ppk.html", badge: isPPK ? "PPK Active" : "Login Required" },
      { section: "Data Referensi" },
      { icon: "👥", label: "Daftar Mitra",     href: "mitra.html"        },
      { icon: "🏛️", label: "Daftar Pegawai",   href: "pegawai.html"      },
      { icon: "📁", label: "Daftar Kegiatan",  href: "kegiatan.html"     }
    ];

    let navHTML = "";
    for (const item of navItems) {
      if (item.section) {
        navHTML += `<div class="nav-section-label">${item.section}</div>`;
        continue;
      }
      const isActive = currentPage === item.href;
      const badgeStyle = isPPK ? "background:#dcfce7; color:#166534;" : "background:#fef3c7; color:#92400e;";
      const badgeHTML = item.badge ? `<span style="margin-left:auto; ${badgeStyle} font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:10px;">${item.badge}</span>` : "";
      navHTML += `
        <a href="${item.href}" class="nav-item${isActive ? " active" : ""}">
          <span class="nav-icon">${item.icon}</span> ${item.label} ${badgeHTML}
        </a>`;
    }

    // User profile section at footer
    let userFooterHTML = "";
    if (user) {
      const roleColor = user.role === "PPK" ? "#047857" : user.role === "ADMIN" ? "#7c3aed" : "#1d4ed8";
      userFooterHTML = `
        <div style="padding: 12px; margin: 10px; background: #f8fafc; border: 1px solid var(--gray-200); border-radius: var(--radius-md);">
          <div style="font-weight: 700; font-size: 0.82rem; color: var(--gray-800); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${user.nama || user.username}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span style="font-size: 0.68rem; font-weight: 800; color: ${roleColor}; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">${user.role || 'PPK'}</span>
            <button type="button" onclick="Auth.logout()" style="background: none; border: none; color: #dc2626; font-weight: 700; font-size: 0.75rem; cursor: pointer; padding: 0;">🚪 Keluar</button>
          </div>
        </div>`;
    } else {
      userFooterHTML = `
        <div style="padding: 10px; margin: 10px; text-align: center;">
          <a href="login.html?redirect=verifikasi-ppk.html" class="btn btn-outline btn-sm" style="width: 100%; font-size: 0.78rem; font-weight: 700; justify-content: center;">
            🔑 Login Khusus PPK
          </a>
        </div>`;
    }

    return `
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">📜</div>
          <div class="logo-text">
            <div class="title">Dokumen Keuangan Generator</div>
            <div class="sub">BPS Kota Subulussalam</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHTML}</nav>
        ${userFooterHTML}
        <div class="sidebar-footer">BPS Kota Subulussalam &copy; 2026</div>
      </aside>`;
  }

  // Inject sidebar ke dalam #app-sidebar-placeholder atau sebelum .main-content
  document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("app-sidebar-placeholder");
    if (placeholder) {
      placeholder.outerHTML = buildSidebar();
      return;
    }
    // Fallback: cari sidebar existing dan replace
    const existingSidebar = document.querySelector("aside.sidebar");
    if (existingSidebar) {
      existingSidebar.outerHTML = buildSidebar();
    }
  });
})();
