// ============================================================
// APP.JS — Logic form, state management, event handlers
// Semua fungsi yang butuh data sekarang async (fetch dari Sheets)
// ============================================================

// ─── Application State ────────────────────────────────────────
const AppState = {
  currentDocId: null,
  pendingForm: null,
  // Data cache lokal untuk halaman aktif (di-load sekali per page)
  pegawai: [],
  mitra: [],
  kegiatan: [],
  suratTugas: [],
  spkBast: [],
  detailPekerjaan: [],
  bastSmPpk: [],
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

async function initForm() {
  if (!document.getElementById("form-spk-bast")) return;

  setLoading(true);
  try {
    // Fetch semua master data secara paralel
    const [pegawaiData, mitraData, kegiatanData] = await Promise.all([
      getPegawai(),
      getMitra(),
      getKegiatan(),
    ]);

    AppState.pegawai  = pegawaiData;
    AppState.mitra    = mitraData;
    AppState.kegiatan = kegiatanData;

    populatePetugasDropdown();
    populatePegawaiDropdowns();
    populateKegiatanOptions();

    // 1. Date picker Tanggal SPK (single date) -> Auto-extract Bulan & Tahun
    const tglSpkInput = document.getElementById("input-tanggal-spk");
    if (tglSpkInput) {
      tglSpkInput.addEventListener("change", function() {
        if (!this.value) return;
        const d = new Date(this.value);
        if (isNaN(d.getTime())) return;
        const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
        const selBulan = document.getElementById("input-bulan");
        const inputTahun = document.getElementById("input-tahun");
        if (selBulan) selBulan.value = months[d.getMonth()];
        if (inputTahun) inputTahun.value = d.getFullYear();
      });
    }

    // 2. Radio Sumber Petugas (Mitra vs Pegawai)
    document.querySelectorAll('input[name="sumber_petugas"]').forEach(r => {
      r.addEventListener("change", populatePetugasDropdown);
    });

    // 3. Peran Petugas (PPL vs PML)
    const selPeran = document.getElementById("sel-peran-petugas");
    if (selPeran) {
      selPeran.addEventListener("change", togglePeranFields);
      togglePeranFields();
    }

    // 4. Jenis Bundling (spk_bast vs sm_ppk)
    document.querySelectorAll('input[name="target_doc_type"]').forEach(r => {
      r.addEventListener("change", toggleBundlingFields);
    });
    toggleBundlingFields();

    // Event handlers
    document.getElementById("btn-tambah-kegiatan").addEventListener("click", tambahDetailRow);
    document.getElementById("form-spk-bast").addEventListener("submit", handleFormSubmit);
    document.getElementById("detail-tbody").addEventListener("input", updateTotalHonor);

  } catch (err) {
    showToast("Gagal memuat data master dari Sheets: " + err.message, "danger", 6000);
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function togglePeranFields() {
  const peran = document.getElementById("sel-peran-petugas")?.value || "ppl";
  const grpPml = document.getElementById("grp-pml");
  const grpBastPpl = document.getElementById("grp-bast-ppl");
  const grpBastPml = document.getElementById("grp-bast-pml");

  if (peran === "ppl") {
    if (grpPml) grpPml.style.display = "";
    if (grpBastPpl) grpBastPpl.style.display = "";
    if (grpBastPml) grpBastPml.style.display = "none";
  } else if (peran === "pml") {
    if (grpPml) grpPml.style.display = "none";
    if (grpBastPpl) grpBastPpl.style.display = "none";
    if (grpBastPml) grpBastPml.style.display = "";
  }
}

function toggleBundlingFields() {
  const docType = document.querySelector('input[name="target_doc_type"]:checked')?.value || "spk_bast";
  const cardPetugas  = document.getElementById("card-petugas");
  const cardPeran    = document.getElementById("card-peran");
  const grpBastSmPpk = document.getElementById("grp-bast-sm-ppk");

  if (docType === "sm_ppk") {
    if (cardPetugas)  cardPetugas.style.display = "none";
    if (cardPeran)    cardPeran.style.display   = "none";
    if (grpBastSmPpk) grpBastSmPpk.style.display = "";
  } else {
    if (cardPetugas)  cardPetugas.style.display = "";
    if (cardPeran)    cardPeran.style.display   = "";
    if (grpBastSmPpk) grpBastSmPpk.style.display = "none";
  }
}

function populatePetugasDropdown() {
  const sel = document.getElementById("sel-mitra");
  if (!sel) return;

  const previousVal = sel.value;
  const sumber = document.querySelector('input[name="sumber_petugas"]:checked')?.value || "mitra";
  const searchInput   = document.getElementById("search-mitra");
  const filterAsalSel = document.getElementById("filter-asal-mitra");
  const hintEl        = document.getElementById("mitra-count-hint");
  const labelEl       = document.getElementById("label-sel-mitra");

  if (sumber === "mitra") {
    if (labelEl) labelEl.innerHTML = `Pilih Mitra Lapangan <span class="required">*</span>`;
    if (filterAsalSel) filterAsalSel.style.display = "";

    // Extract daftar unik Asal/Kecamatan jika filterAsalSel belum terisi
    if (filterAsalSel && filterAsalSel.options.length <= 1) {
      const asalSet = new Set();
      (AppState.mitra || []).forEach(m => {
        const asal = getMitraAsal(m);
        if (asal && asal !== "-") asalSet.add(asal);
      });
      Array.from(asalSet).sort().forEach(asal => {
        const opt = document.createElement("option");
        opt.value = asal; opt.textContent = asal;
        filterAsalSel.appendChild(opt);
      });
    }

    const query = (searchInput?.value || "").toLowerCase().trim();
    const selectedAsal = filterAsalSel?.value || "";
    const rawList = AppState.mitra || [];

    let filtered = rawList.filter(m => {
      const name = getMitraName(m);
      if (!name) return false;
      const id      = getMitraId(m);
      const asal    = getMitraAsal(m);
      const nik     = String(m.NIK || m.nik || "");
      const sobatId = String(m.Sobat_ID || m["Sobat ID"] || "");

      if (selectedAsal && asal.toLowerCase() !== selectedAsal.toLowerCase()) return false;
      if (query) {
        return name.toLowerCase().includes(query) ||
               id.toLowerCase().includes(query) ||
               nik.toLowerCase().includes(query) ||
               sobatId.toLowerCase().includes(query) ||
               asal.toLowerCase().includes(query);
      }
      return true;
    });

    // Urutkan A-Z berdasarkan Nama Mitra
    filtered.sort((a, b) => getMitraName(a).localeCompare(getMitraName(b), "id", { sensitivity: "base" }));

    sel.innerHTML = `<option value="">-- Pilih Mitra Lapangan (${filtered.length} ditemukan) --</option>`;
    filtered.forEach(m => {
      const id     = getMitraId(m);
      const name   = getMitraName(m);
      const posisi = getMitraPosisi(m);
      const asal   = getMitraAsal(m);

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name} — ${posisi} (${asal})`;
      if (id && id === previousVal) opt.selected = true;
      sel.appendChild(opt);
    });

    if (hintEl) {
      hintEl.textContent = `Menampilkan ${filtered.length} dari ${rawList.length} mitra (Urut A-Z).`;
    }

  } else {
    // Pegawai BPS
    if (labelEl) labelEl.innerHTML = `Pilih Pegawai BPS <span class="required">*</span>`;
    if (filterAsalSel) filterAsalSel.style.display = "none";

    const query = (searchInput?.value || "").toLowerCase().trim();
    const rawList = AppState.pegawai || [];

    let filtered = rawList.filter(p => {
      const name = getPegawaiName(p);
      if (!name) return false;
      const nip  = getPegawaiNip(p);
      const jab  = String(p.Jabatan || "");

      if (query) {
        return name.toLowerCase().includes(query) ||
               nip.toLowerCase().includes(query) ||
               jab.toLowerCase().includes(query);
      }
      return true;
    });

    // Urutkan A-Z berdasarkan Nama Pegawai
    filtered.sort((a, b) => getPegawaiName(a).localeCompare(getPegawaiName(b), "id", { sensitivity: "base" }));

    sel.innerHTML = `<option value="">-- Pilih Pegawai BPS (${filtered.length} ditemukan) --</option>`;
    filtered.forEach(p => {
      const nip  = getPegawaiNip(p);
      const name = getPegawaiName(p);
      const jab  = p.Jabatan || "Pegawai BPS";

      const opt = document.createElement("option");
      opt.value = nip;
      opt.textContent = `${name} — ${jab} (NIP: ${nip})`;
      if (nip && nip === previousVal) opt.selected = true;
      sel.appendChild(opt);
    });

    if (hintEl) {
      hintEl.textContent = `Menampilkan ${filtered.length} dari ${rawList.length} pegawai (Urut A-Z).`;
    }
  }

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => populatePetugasDropdown());
  }
  if (filterAsalSel && !filterAsalSel.dataset.bound) {
    filterAsalSel.dataset.bound = "true";
    filterAsalSel.addEventListener("change", () => populatePetugasDropdown());
  }
}

function populatePegawaiDropdowns() {
  const ids = ["sel-pml", "sel-ppk", "sel-ketua-tim", "sel-kepala"];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const labels = {
      "sel-pml":       "-- Pilih PML --",
      "sel-ppk":       "-- Pilih PPK --",
      "sel-ketua-tim": "-- Pilih Ketua Tim/SM --",
      "sel-kepala":    "-- Pilih Kepala/PLH --",
    };
    sel.innerHTML = `<option value="">${labels[id]}</option>`;
    AppState.pegawai.forEach(p => {
      const nip  = getPegawaiNip(p);
      const name = getPegawaiName(p);
      const opt  = document.createElement("option");
      opt.value = nip;
      opt.textContent = `${name} — ${p.Jabatan || ""}`;
      sel.appendChild(opt);
    });
  });
}

function populateKegiatanOptions() {
  const sel = document.getElementById("sel-kegiatan");
  if (!sel) return;
  sel.innerHTML = `<option value="">-- Pilih Kegiatan --</option>`;
  AppState.kegiatan.forEach(k => {
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

  const keg = cariKegiatan(idKeg, AppState.kegiatan);
  if (!keg) return;

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

async function handleFormSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);

  const docType = document.querySelector('input[name="target_doc_type"]:checked')?.value || "spk_bast";
  const idMitra = document.getElementById("sel-mitra")?.value || "";
  const sumberPetugas = document.querySelector('input[name="sumber_petugas"]:checked')?.value || "mitra";
  const peranPetugas  = document.getElementById("sel-peran-petugas")?.value || "ppl";

  // Validasi: Jika bukan BAST SM-PPK, wajib pilih petugas
  if (docType !== "sm_ppk" && !idMitra) {
    showToast("Pilih petugas terlebih dahulu", "danger");
    return;
  }

  // Validasi kegiatan untuk SPK / BAST
  if (docType !== "sm_ppk" && document.querySelectorAll("#detail-tbody tr").length === 0) {
    showToast("Tambahkan minimal 1 kegiatan", "danger");
    return;
  }

  // Kumpulkan detail pekerjaan dari tabel
  const details = [];
  document.querySelectorAll("#detail-tbody tr").forEach((tr, i) => {
    const kegId    = tr.getAttribute("data-keg-id");
    const keg      = cariKegiatan(kegId, AppState.kegiatan);
    const volInput = tr.querySelector("input[type=number]");
    const jwInput  = tr.querySelector("input[type=text]");
    const vol   = parseFloat(volInput?.value) || 0;
    const harga = parseFloat(volInput?.getAttribute("data-harga")) || 0;
    details.push({
      ID_Detail:        `D-${Date.now()}-${i+1}`,
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
  const newId = "DOC-" + Date.now();

  const record = {
    ID_Dokumen:              newId,
    Tahun:                   parseInt(fd.get("tahun")) || new Date().getFullYear(),
    Bulan:                   fd.get("bulan") || "",
    Jenis_Petugas:           sumberPetugas === "mitra" ? "Mitra" : "Pegawai",
    ID_Mitra:                idMitra,
    PML:                     document.getElementById("sel-pml")?.value || "",
    PPK:                     document.getElementById("sel-ppk")?.value || "",
    Ketua_Tim:               document.getElementById("sel-ketua-tim")?.value || "",
    "Kepala/PLH":            document.getElementById("sel-kepala")?.value || "",
    Nomor_Kepka:             fd.get("nomor_kepka") || "",
    Tanggal_Kepka:           fd.get("tanggal_kepka") || "",
    Nomor_SPK:               fd.get("no_spk") || "",
    "Tanggal SPK":           fd.get("tanggal_spk") || "",
    No_BAST_PPL_PML:         fd.get("no_bast_ppl_pml") || "",
    Tanggal_BAST_PPL_PML:    fd.get("tanggal_bast_ppl_pml") || "",
    No_BAST_PPL_SM:          fd.get("no_bast_ppl_sm") || "",
    Tanggal_BAST_PPL_SM:     fd.get("tanggal_bast_ppl_sm") || "",
    No_BAST_PML_SM:          fd.get("no_bast_pml_sm") || "",
    Tanggal_BAST_PML_SM:     fd.get("tanggal_bast_pml_sm") || "",
    No_BAST_SM_PPK:          fd.get("no_bast_sm_ppk") || "",
    Tanggal_BAST_SM_PPK:     fd.get("tanggal_bast_sm_ppk") || "",
    Judul_Pekerjaan_Dokumen: fd.get("judul_pekerjaan") || "",
    Tanggal_Mulai:           fd.get("tanggal_mulai") || "",
    Tanggal_Selesai:         fd.get("tanggal_selesai") || "",
    Batas_Penyerahan:        fd.get("batas_penyerahan") || "",
    Total_Honor:             totalHonor,
    Terbilang:               terbilang(totalHonor) + " Rupiah",
    Status_Generate_SPK:     "Belum",
  };

  // Update ID_Dokumen di detail
  details.forEach(d => { d.ID_Dokumen = newId; });

  const targetTab = docType === "sm_ppk" ? "sm-ppk" : (peranPetugas === "pml" ? "pml-sm" : "spk");

  // Simpan ke sessionStorage untuk preview
  sessionStorage.setItem("preview_target_tab", targetTab);
  sessionStorage.setItem("preview_record", JSON.stringify(record));
  sessionStorage.setItem("preview_details", JSON.stringify(details));
  sessionStorage.setItem("preview_mitra", JSON.stringify(AppState.mitra));
  sessionStorage.setItem("preview_pegawai", JSON.stringify(AppState.pegawai));

  // Simpan ke Google Sheets di background
  setLoading(true);
  try {
    await appendToSheet("spkBast", record);
    for (const detail of details) {
      await appendToSheet("detailPekerjaan", detail);
    }
    showToast("Data berhasil disimpan ke Google Sheets ✅", "success");
  } catch (err) {
    console.error("Gagal simpan ke Sheets:", err);
    showToast("Peringatan: Gagal simpan ke Sheets. Data hanya ada di preview sementara. " + err.message, "warning", 7000);
  } finally {
    setLoading(false);
  }

  window.location.href = `preview.html?tab=${targetTab}`;
}

// ============================================================
// PREVIEW LOGIC (preview.html)
// ============================================================

async function initPreview() {
  const container = document.getElementById("preview-container");
  if (!container) return;

  setLoading(true);

  let record, details, mitraArr, pegawaiArr;
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get("id");

  try {
    if (docId) {
      // ── Load dari Google Sheets berdasar ID_Dokumen ─────────
      const [spkBastData, detailData, mitraData, pegawaiData] = await Promise.all([
        getSpkBast(),
        getDetailPekerjaan(),
        getMitra(),
        getPegawai(),
      ]);

      record    = spkBastData.find(r => r.ID_Dokumen === docId);
      details   = detailData.filter(d => d.ID_Dokumen === docId);
      mitraArr  = mitraData;
      pegawaiArr = pegawaiData;

    } else {
      // ── Load dari sessionStorage (form baru) ────────────────
      const rStr = sessionStorage.getItem("preview_record");
      const dStr = sessionStorage.getItem("preview_details");
      const mStr = sessionStorage.getItem("preview_mitra");
      const pStr = sessionStorage.getItem("preview_pegawai");

      if (!rStr) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>Tidak ada dokumen untuk ditampilkan.</p><a href="form.html" class="btn btn-primary mt-16">Buat Dokumen Baru</a></div>`;
        setLoading(false);
        return;
      }

      record     = JSON.parse(rStr);
      details    = JSON.parse(dStr || "[]");

      // Gunakan data mitra/pegawai dari sessionStorage jika ada,
      // fallback ke Sheets jika tidak ada (misal buka preview dari link)
      if (mStr && pStr) {
        mitraArr   = JSON.parse(mStr);
        pegawaiArr = JSON.parse(pStr);
      } else {
        [mitraArr, pegawaiArr] = await Promise.all([getMitra(), getPegawai()]);
      }
    }

    if (!record) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Dokumen tidak ditemukan.</p></div>`;
      setLoading(false);
      return;
    }

    // Simpan ke AppState untuk akses dari fungsi lain
    AppState.mitra    = mitraArr;
    AppState.pegawai  = pegawaiArr;

    details = details.map(d => ({ ...d, ID_Dokumen: record.ID_Dokumen }));

    // Fetch bastSmPpk di background (untuk tab SM-PPK)
    getBastSmPpk().then(data => { AppState.bastSmPpk = data; });

    const ctx = buildDataContext(record, {
      mitraArr,
      pegawaiArr,
      detailArr: details,
    });

    updatePreviewInfo(record, ctx, mitraArr);
    setupTabs(record, ctx, details);
    await renderTab("spk", ctx.spkCtx, "preview-doc-content");

  } catch (err) {
    console.error("initPreview error:", err);
    showToast("Gagal memuat data: " + err.message, "danger", 7000);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Gagal memuat dokumen. <br><small>${err.message}</small></p></div>`;
  } finally {
    setLoading(false);
  }
}

function updatePreviewInfo(record, ctx, mitraArr) {
  const el = document.getElementById("preview-doc-title");
  if (el) el.textContent = record.Judul_Pekerjaan_Dokumen || record.ID_Dokumen;

  const elMitra = document.getElementById("preview-mitra-name");
  if (elMitra) {
    const arr = mitraArr || AppState.mitra;
    const m = cariMitra(record.ID_Mitra, arr);
    if (m) elMitra.textContent = getMitraName(m);
  }

  const elStatus = document.getElementById("preview-status");
  if (elStatus) {
    elStatus.textContent = record.Status_Generate_SPK || "Belum";
    elStatus.className = `badge ${record.Status_Generate_SPK === "Sudah" ? "badge-success" : "badge-warning"}`;
  }
}

const TEMPLATE_MAP = {
  spk:        { tpl: "template-spk.html",          ctxKey: "spkCtx" },
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
    // BAST SM-PPK — cari dari bastSmPpk array (sudah di-fetch di AppState)
    let bastArr = AppState.bastSmPpk;
    if (!bastArr || bastArr.length === 0) {
      bastArr = await getBastSmPpk();
      AppState.bastSmPpk = bastArr;
    }

    let bastRecord = bastArr.find(b =>
      String(b.Bulan) === String(record?.Bulan) &&
      String(b.Tahun) === String(record?.Tahun)
    );

    if (!bastRecord && record) {
      bastRecord = {
        Judul_Pekerjaan_Dokumen: record.Judul_Pekerjaan_Dokumen,
        No_BAST_SM_PPK:  `BAST-SM-PPK/${record.No_SPK || record.ID_Dokumen}`,
        Tahun:           record.Tahun,
        Bulan:           record.Bulan,
        Uraian_Tugas:    record.Judul_Pekerjaan_Dokumen,
        PPK:             record.PPK,
        Ketua_Tim:       record.Ketua_Tim,
        Tanggal_BAST_SM_PPK: record.Tanggal_BAST_PML_SM || record.Tanggal_Selesai,
        Total_Honor:     record.Total_Honor,
      };
    }

    const smPpkCtx = buildBastSmPpkContext(bastRecord || {}, AppState.pegawai);
    const tpl = await loadTemplate("template-bast-sm-ppk.html");
    content.innerHTML = renderTemplate(tpl, smPpkCtx);
    return;
  }

  const map = TEMPLATE_MAP[tabKey];
  if (!map) return;

  let dataCtx;
  if (ctx[map.ctxKey]) {
    dataCtx = ctx[map.ctxKey];
  } else {
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
    .then(() => {
      setLoading(false);
      showToast("PDF berhasil diunduh", "success");
      // Update status Generate ke Sheets
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get("id");
      if (docId) {
        updateInSheet("spkBast", "ID_Dokumen", docId, { Status_Generate_SPK: "Sudah" })
          .then(() => clearCache("spkBast"))
          .catch(err => console.warn("Gagal update status:", err));
      }
    })
    .catch(err => {
      setLoading(false);
      showToast("Gagal export PDF: " + err.message, "danger");
    });
}

// ============================================================
// DASHBOARD LOGIC — dipakai dokumen.html (tabel histori)
// ============================================================

function setStatCard(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderDashboardTable(data, mitraArr) {
  const tbody = document.getElementById("dashboard-tbody");
  if (!tbody) return;
  const arr = mitraArr || AppState.mitra;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => {
    const m = cariMitra(r.ID_Mitra, arr);
    const mitraName = m ? getMitraName(m) : '<span class="text-muted">-</span>';
    const statusClass = r.Status_Generate_SPK === "Sudah" ? "badge-success" : "badge-warning";
    return `
      <tr>
        <td><span class="monospace text-sm">${r.ID_Dokumen}</span></td>
        <td style="max-width:260px; font-weight:500;">${r.Judul_Pekerjaan_Dokumen || "—"}</td>
        <td>${mitraName}</td>
        <td>${r.Bulan || "—"} ${r.Tahun || ""}</td>
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
document.addEventListener("DOMContentLoaded", async () => {
  await initDashboard();
  await initForm();
  // initPreview() dipanggil dari inline script di preview.html
});
