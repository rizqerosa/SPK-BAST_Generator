// ============================================================
// APP.JS — Logic form, state management, event handlers
// ============================================================

// ─── Application State ────────────────────────────────────────
const AppState = {
  currentDocId: null,  // ID_Dokumen yang sedang di-preview/generate
  pendingForm: null,   // data form yang belum disimpan
};

// ─── Toast helper ─────────────────────────────────────────────
function showToast(msg, type = "default", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { success: "✅", danger: "❌", warning: "⚠️", default: "ℹ️" };
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ─── Loading overlay ──────────────────────────────────────────
function setLoading(visible) {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.toggle("visible", visible);
}

// ─── Fetch template HTML dari /templates/*.html ───────────────
const _templateCache = {};
async function loadTemplate(name) {
  if (_templateCache[name]) return _templateCache[name];
  const res = await fetch(`templates/${name}`);
  if (!res.ok) throw new Error(`Template ${name} tidak ditemukan`);
  const html = await res.text();
  _templateCache[name] = html;
  return html;
}

// ─── Render satu dokumen ke elemen DOM ────────────────────────
async function renderDoc(templateName, dataCtx, containerId) {
  const raw = await loadTemplate(templateName);
  const rendered = renderTemplate(raw, dataCtx);
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = rendered;
}

// ============================================================
// FORM LOGIC (form.html)
// ============================================================

function initForm() {
  if (!document.getElementById("form-spk-bast")) return;

  // ── Populate dropdowns ──────────────────────────────────
  populateMitraDropdown();
  populatePegawaiDropdowns();
  populateKegiatanOptions();

  // ── Event: pilih kegiatan ─────────────────────────────
  document.getElementById("btn-tambah-kegiatan").addEventListener("click", tambahDetailRow);

  // ── Event: form submit ────────────────────────────────
  document.getElementById("form-spk-bast").addEventListener("submit", handleFormSubmit);

  // ── Live total honor ──────────────────────────────────
  document.getElementById("detail-tbody").addEventListener("input", updateTotalHonor);
}

function populateMitraDropdown() {
  const sel = document.getElementById("sel-mitra");
  if (!sel) return;
  sel.innerHTML = `<option value="">-- Pilih Mitra/PPL --</option>`;
  mitra.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.ID_Mitra;
    opt.textContent = `${m.Nama_Mitra} — ${m.Posisi} (${m.Asal})`;
    sel.appendChild(opt);
  });
}

function populatePegawaiDropdowns() {
  const ids = ["sel-pml", "sel-ppk", "sel-ketua-tim", "sel-kepala"];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const labels = {
      "sel-pml": "-- Pilih PML --",
      "sel-ppk": "-- Pilih PPK --",
      "sel-ketua-tim": "-- Pilih Ketua Tim/SM --",
      "sel-kepala": "-- Pilih Kepala/PLH --",
    };
    sel.innerHTML = `<option value="">${labels[id]}</option>`;
    pegawai.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.NIP;
      opt.textContent = `${p.Nama_Pegawai} — ${p.Jabatan}`;
      sel.appendChild(opt);
    });
  });
}

function populateKegiatanOptions() {
  const sel = document.getElementById("sel-kegiatan");
  if (!sel) return;
  sel.innerHTML = `<option value="">-- Pilih Kegiatan --</option>`;
  kegiatan.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k.ID_Kegiatan;
    opt.textContent = `[${k.ID_Kegiatan}] ${k.Uraian_Tugas}`;
    sel.appendChild(opt);
  });
}

let _detailCounter = 0;
function tambahDetailRow() {
  const selKeg = document.getElementById("sel-kegiatan");
  const idKeg = selKeg.value;
  if (!idKeg) { showToast("Pilih kegiatan terlebih dahulu", "warning"); return; }

  const keg = cariKegiatan(idKeg, kegiatan);
  if (!keg) return;

  // Cek duplikat
  const existing = document.querySelectorAll(`[data-keg-id="${idKeg}"]`);
  if (existing.length > 0) { showToast("Kegiatan sudah ditambahkan", "warning"); return; }

  _detailCounter++;
  const rowId = `row-${_detailCounter}`;
  const tbody = document.getElementById("detail-tbody");

  const tr = document.createElement("tr");
  tr.id = rowId;
  tr.setAttribute("data-keg-id", idKeg);
  tr.innerHTML = `
    <td class="tc">${tbody.rows.length + 1}</td>
    <td style="font-size:.78rem;">${keg.Uraian_Tugas}</td>
    <td><input type="text" class="input-sm" style="width:120px;"
         name="jangka_waktu_${_detailCounter}" placeholder="contoh: 5-19 Jan" /></td>
    <td><input type="number" class="input-sm" name="volume_${_detailCounter}"
         value="1" min="1" data-harga="${keg.Harga_Satuan || 0}"
         onchange="recalcRow(this)" style="width:60px;" /></td>
    <td class="tc">${keg.Satuan}</td>
    <td class="tr">Rp ${formatRupiah(keg.Harga_Satuan || 0)}</td>
    <td class="tr nilai-cell">Rp ${formatRupiah(keg.Harga_Satuan || 0)}</td>
    <td style="font-size:.7rem;">${keg.Beban_Anggaran || ""}</td>
    <td class="tc"><button type="button" class="btn btn-danger btn-sm"
         onclick="hapusDetailRow('${rowId}')">✕</button></td>`;
  tbody.appendChild(tr);

  // Nomor ulang
  renumberDetailRows();
  updateTotalHonor();
  selKeg.value = "";
}

function recalcRow(inputEl) {
  const volume = parseFloat(inputEl.value) || 0;
  const harga  = parseFloat(inputEl.getAttribute("data-harga")) || 0;
  const nilai  = volume * harga;
  const td = inputEl.closest("tr").querySelector(".nilai-cell");
  if (td) td.textContent = `Rp ${formatRupiah(nilai)}`;
  updateTotalHonor();
}

function hapusDetailRow(rowId) {
  const tr = document.getElementById(rowId);
  if (tr) tr.remove();
  renumberDetailRows();
  updateTotalHonor();
}

function renumberDetailRows() {
  const rows = document.querySelectorAll("#detail-tbody tr");
  rows.forEach((tr, i) => {
    const firstTd = tr.querySelector("td:first-child");
    if (firstTd) firstTd.textContent = i + 1;
  });
}

function updateTotalHonor() {
  let total = 0;
  document.querySelectorAll("#detail-tbody tr").forEach(tr => {
    const volumeInput = tr.querySelector("input[type=number]");
    if (!volumeInput) return;
    const vol   = parseFloat(volumeInput.value) || 0;
    const harga = parseFloat(volumeInput.getAttribute("data-harga")) || 0;
    total += vol * harga;
  });

  const elAmount = document.getElementById("honor-amount");
  const elTerb   = document.getElementById("honor-terbilang");
  if (elAmount) elAmount.textContent = `Rp ${formatRupiah(total)},-`;
  if (elTerb)   elTerb.textContent   = terbilang(total) + " Rupiah";
}

function handleFormSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);

  // Validasi minimal
  const idMitra = document.getElementById("sel-mitra").value;
  if (!idMitra) { showToast("Pilih mitra/PPL terlebih dahulu", "danger"); return; }
  if (document.querySelectorAll("#detail-tbody tr").length === 0) {
    showToast("Tambahkan minimal 1 kegiatan", "danger"); return;
  }

  // Kumpulkan detail pekerjaan dari tabel
  const details = [];
  document.querySelectorAll("#detail-tbody tr").forEach((tr, i) => {
    const kegId = tr.getAttribute("data-keg-id");
    const keg   = cariKegiatan(kegId, kegiatan);
    const volInput = tr.querySelector("input[type=number]");
    const jwInput  = tr.querySelector("input[type=text]");
    const vol = parseFloat(volInput?.value) || 0;
    const harga = parseFloat(volInput?.getAttribute("data-harga")) || 0;
    details.push({
      ID_Detail:        `D-NEW-${i+1}`,
      ID_Dokumen:       "NEW",
      No_Urut:          i + 1,
      ID_Kegiatan:      kegId,
      Uraian_Tugas:     keg?.Uraian_Tugas || "",
      Buku_Pedoman:     fd.get("buku_pedoman") || "",
      Jangka_Waktu:     jwInput?.value || "",
      Volume:           vol,
      Satuan:           keg?.Satuan || "Dokumen",
      Harga_Satuan:     harga,
      Nilai_Perjanjian: vol * harga,
      Beban_Anggaran:   keg?.Beban_Anggaran || "",
    });
  });

  const totalHonor = details.reduce((s, d) => s + d.Nilai_Perjanjian, 0);

  // Buat record spkBast sementara
  const record = {
    ID_Dokumen:             "NEW-" + Date.now(),
    Tahun:                  parseInt(fd.get("tahun")) || new Date().getFullYear(),
    Bulan:                  fd.get("bulan") || "",
    Jenis_Petugas:          "Mitra",
    ID_Mitra:               idMitra,
    PML:                    document.getElementById("sel-pml").value,
    PPK:                    document.getElementById("sel-ppk").value,
    Ketua_Tim:              document.getElementById("sel-ketua-tim").value,
    "Kepala/PLH":           document.getElementById("sel-kepala").value,
    Nomor_Kepka:            fd.get("nomor_kepka") || "",
    Tanggal_Kepka:          fd.get("tanggal_kepka") || "",
    No_SPK:                 fd.get("no_spk") || "",
    Tanggal_SPK:            fd.get("tanggal_spk") || "",
    No_BAST_PPL_PML:        fd.get("no_bast_ppl_pml") || "",
    Tanggal_BAST_PPL_PML:   fd.get("tanggal_bast_ppl_pml") || "",
    No_BAST_PPL_SM:         fd.get("no_bast_ppl_sm") || "",
    Tanggal_BAST_PPL_SM:    fd.get("tanggal_bast_ppl_sm") || "",
    No_BAST_PML_SM:         fd.get("no_bast_pml_sm") || "",
    Tanggal_BAST_PML_SM:    fd.get("tanggal_bast_pml_sm") || "",
    Judul_Pekerjaan_Dokumen: fd.get("judul_pekerjaan") || "",
    Tanggal_Mulai:          fd.get("tanggal_mulai") || "",
    Tanggal_Selesai:        fd.get("tanggal_selesai") || "",
    Batas_Penyerahan:       fd.get("batas_penyerahan") || "",
    Total_Honor:            totalHonor,
    Terbilang:              terbilang(totalHonor) + " Rupiah",
    Status_Generate_SPK:    "Belum",
  };

  // Simpan ke sessionStorage lalu redirect ke preview
  sessionStorage.setItem("preview_record", JSON.stringify(record));
  sessionStorage.setItem("preview_details", JSON.stringify(details));
  window.location.href = "preview.html";
}

// ============================================================
// PREVIEW LOGIC (preview.html)
// ============================================================

async function initPreview() {
  const container = document.getElementById("preview-container");
  if (!container) return;

  // Ambil data: dari sessionStorage (form baru) atau URL param (record existing)
  let record, details;
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get("id");

  if (docId) {
    // Load dari data.js (dummy data / nanti dari API)
    record  = spkBast.find(r => r.ID_Dokumen === docId);
    details = detailPekerjaan.filter(d => d.ID_Dokumen === docId);
  } else {
    const rStr = sessionStorage.getItem("preview_record");
    const dStr = sessionStorage.getItem("preview_details");
    if (!rStr) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>Tidak ada dokumen untuk ditampilkan.</p><a href="form.html" class="btn btn-primary mt-16">Buat Dokumen Baru</a></div>`;
      return;
    }
    record  = JSON.parse(rStr);
    details = JSON.parse(dStr || "[]");
  }

  if (!record) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Dokumen tidak ditemukan.</p></div>`;
    return;
  }

  // Update detail ID_Dokumen agar lookup work
  details = details.map(d => ({ ...d, ID_Dokumen: record.ID_Dokumen }));

  setLoading(true);

  const ctx = buildDataContext(record, {
    mitraArr: mitra,
    pegawaiArr: pegawai,
    detailArr: details,
  });

  // Update info panel
  updatePreviewInfo(record, ctx);

  // Set active tab handler
  setupTabs(record, ctx, details);

  // Render tab pertama (SPK)
  await renderTab("spk", ctx.spkCtx, "preview-doc-content");
  setLoading(false);
}

function updatePreviewInfo(record, ctx) {
  const el = document.getElementById("preview-doc-title");
  if (el) el.textContent = record.Judul_Pekerjaan_Dokumen || record.ID_Dokumen;
  const elMitra = document.getElementById("preview-mitra-name");
  if (elMitra) {
    const m = cariMitra(record.ID_Mitra, mitra);
    if (m) elMitra.textContent = m.Nama_Mitra;
  }
  const elStatus = document.getElementById("preview-status");
  if (elStatus) {
    elStatus.textContent = record.Status_Generate_SPK || "Belum";
    elStatus.className = `badge ${record.Status_Generate_SPK === "Sudah" ? "badge-success" : "badge-warning"}`;
  }
}

const TEMPLATE_MAP = {
  spk:        { tpl: "template-spk.html",        ctxKey: "spkCtx" },
  "ppl-pml":  { tpl: "template-bast-ppl-pml.html", ctxKey: "bastPplPmlCtx" },
  "ppl-sm":   { tpl: "template-bast-ppl-sm.html",  ctxKey: "bastPplSmCtx" },
  "pml-sm":   { tpl: "template-bast-pml-sm.html",  ctxKey: "bastPmlSmCtx" },
};

function setupTabs(record, ctx, details) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", async function () {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const tabKey = this.dataset.tab;
      setLoading(true);
      await renderTab(tabKey, ctx, "preview-doc-content", record, details);
      setLoading(false);
    });
  });
}

async function renderTab(tabKey, ctx, containerId, record, details) {
  const content = document.getElementById(containerId);
  if (!content) return;

  if (tabKey === "sm-ppk") {
    // BAST SM-PPK pakai bastSmPpk data (global) atau buat dari record
    let bastRecord = bastSmPpk.find(b => b.Bulan === record?.Bulan && b.Tahun === record?.Tahun);
    if (!bastRecord && record) {
      // Buat ephemeral context dari record yang ada
      bastRecord = {
        Judul_Pekerjaan_Dokumen: record.Judul_Pekerjaan_Dokumen,
        No_BAST_SM_PPK: `BAST-SM-PPK/${record.No_SPK || record.ID_Dokumen}`,
        Tahun: record.Tahun,
        Bulan: record.Bulan,
        Uraian_Tugas: record.Judul_Pekerjaan_Dokumen,
        PPK: record.PPK,
        Ketua_Tim: record.Ketua_Tim,
        Tanggal_BAST_SM_PPK: record.Tanggal_BAST_PML_SM || record.Tanggal_Selesai,
        Total_Honor: record.Total_Honor,
      };
    }
    const smPpkCtx = buildBastSmPpkContext(bastRecord || {}, pegawai);
    const tpl = await loadTemplate("template-bast-sm-ppk.html");
    content.innerHTML = renderTemplate(tpl, smPpkCtx);
    return;
  }

  const map = TEMPLATE_MAP[tabKey];
  if (!map) return;

  // ctx bisa berupa object hasil buildDataContext (dengan sub-keys) atau flat object
  let dataCtx;
  if (ctx[map.ctxKey]) {
    dataCtx = ctx[map.ctxKey];
  } else {
    // ctx is already flat (from spkCtx etc.)
    dataCtx = ctx;
  }

  const tpl = await loadTemplate(map.tpl);
  content.innerHTML = renderTemplate(tpl, dataCtx);
}

// ─── PDF Export ───────────────────────────────────────────────
function exportPdf(filename) {
  const content = document.getElementById("preview-doc-content");
  if (!content || !window.html2pdf) {
    showToast("html2pdf belum dimuat", "danger");
    return;
  }
  const opt = {
    margin:      [10, 10, 10, 10],
    filename:    filename || "dokumen-spk-bast.pdf",
    image:       { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak:   { mode: ["avoid-all", "css"], before: ".doc-page" },
  };
  setLoading(true);
  html2pdf().set(opt).from(content).save()
    .then(() => { setLoading(false); showToast("PDF berhasil diunduh", "success"); })
    .catch(err => { setLoading(false); showToast("Gagal export PDF: " + err.message, "danger"); });
}

// ============================================================
// DASHBOARD LOGIC (index.html)
// ============================================================

function initDashboard() {
  const tbody = document.getElementById("dashboard-tbody");
  if (!tbody) return;

  // Stats
  const total  = spkBast.length;
  const sudah  = spkBast.filter(r => r.Status_Generate_SPK === "Sudah").length;
  const belum  = total - sudah;
  const honor  = spkBast.reduce((s, r) => s + (r.Total_Honor || 0), 0);

  setStatCard("stat-total",  total);
  setStatCard("stat-sudah",  sudah);
  setStatCard("stat-belum",  belum);
  setStatCard("stat-honor",  `Rp ${formatRupiah(honor)}`);

  // Render tabel
  renderDashboardTable(spkBast);

  // Search
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      const q = this.value.toLowerCase();
      const filtered = spkBast.filter(r =>
        r.ID_Dokumen.toLowerCase().includes(q) ||
        r.Judul_Pekerjaan_Dokumen.toLowerCase().includes(q) ||
        (r.Bulan || "").toLowerCase().includes(q)
      );
      renderDashboardTable(filtered);
    });
  }

  // Filter status
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const f = this.dataset.filter;
      const filtered = f === "all" ? spkBast : spkBast.filter(r => r.Status_Generate_SPK === f);
      renderDashboardTable(filtered);
    });
  });
}

function setStatCard(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderDashboardTable(data) {
  const tbody = document.getElementById("dashboard-tbody");
  if (!tbody) return;
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">Tidak ada data</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => {
    const m = cariMitra(r.ID_Mitra, mitra);
    const statusClass = r.Status_Generate_SPK === "Sudah" ? "badge-success" : "badge-warning";
    return `
      <tr>
        <td><span class="monospace text-sm">${r.ID_Dokumen}</span></td>
        <td style="max-width:260px; font-weight:500;">${r.Judul_Pekerjaan_Dokumen}</td>
        <td>${m ? m.Nama_Mitra : '<span class="text-muted">-</span>'}</td>
        <td>${r.Bulan} ${r.Tahun}</td>
        <td><span class="badge ${statusClass}">${r.Status_Generate_SPK || "Belum"}</span></td>
        <td>
          <a href="preview.html?id=${r.ID_Dokumen}" class="btn btn-primary btn-sm">
            👁 Lihat
          </a>
        </td>
      </tr>`;
  }).join("");
}

// ─── Init on DOMContentLoaded ─────────────────────────────────
// preview.html punya inline script sendiri — jangan panggil initPreview() di sini
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  initForm();
  // initPreview() dipanggil dari inline script di preview.html
});
