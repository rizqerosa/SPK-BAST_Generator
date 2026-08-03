// ============================================================
// SIDEBAR.JS — Shared Sidebar untuk semua halaman
// Auto-inject sidebar HTML, deteksi halaman aktif dari URL
// ============================================================

(function () {
  const NAV_ITEMS = [
    { section: "Menu Utama" },
    { icon: "🏠", label: "Dashboard",       href: "index.html"    },
    { icon: "📋", label: "Daftar Dokumen",  href: "dokumen.html"  },
    { section: "Data Referensi" },
    { icon: "👥", label: "Daftar Mitra",    href: "mitra.html"    },
    { icon: "🏛️", label: "Daftar Pegawai",  href: "pegawai.html"  },
    { icon: "📁", label: "Daftar Kegiatan", href: "kegiatan.html" },
  ];

  // Deteksi halaman aktif dari URL
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  function buildSidebar() {
    let navHTML = "";
    for (const item of NAV_ITEMS) {
      if (item.section) {
        navHTML += `<div class="nav-section-label">${item.section}</div>`;
        continue;
      }
      const isActive = currentPage === item.href;
      navHTML += `
        <a href="${item.href}" class="nav-item${isActive ? " active" : ""}">
          <span class="nav-icon">${item.icon}</span> ${item.label}
        </a>`;
    }

    return `
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">📋</div>
          <div class="logo-text">
            <div class="title">SPK/BAST Generator</div>
            <div class="sub">BPS Kota Subulussalam</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHTML}</nav>
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
