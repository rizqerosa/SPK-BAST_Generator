// ============================================================
// WORD-EXPORT.JS — Generator Dokumen Word (.docx) Berbasis Template Asli
// ============================================================

/**
 * Helper XML escape
 */
function _docxXmlEscape(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Isi placeholder pada file .docx template asli menggunakan JSZip
 */
async function fillDocxTemplate(templatePath, dataDict, detailsList = []) {
  if (typeof JSZip === "undefined") {
    throw new Error("Library JSZip belum dimuat. Pastikan koneksi internet aktif.");
  }

  // 1. Fetch file .docx template asli (selalu ambil file fresh tanpa cache browser)
  const response = await fetch(`${templatePath}?_t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Gagal memuat file template Word: ${templatePath} (Status: ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // 2. Load zip struktur .docx
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Proses hanya file XML isi dokumen (hindari merusak styles/settings/themes internal Word)
  const xmlFiles = Object.keys(zip.files).filter(name =>
    name.startsWith("word/") &&
    name.endsWith(".xml") &&
    !name.includes("styles") &&
    !name.includes("settings") &&
    !name.includes("fontTable") &&
    !name.includes("webSettings") &&
    !name.includes("theme")
  );

  for (const filename of xmlFiles) {
    let xmlStr = await zip.files[filename].async("string");

    // Normalisasi tag placeholder yang terpecah oleh formatting run Word (<w:r><w:t>...</w:t></w:r>)
    xmlStr = xmlStr.replace(/(&lt;&lt;|<<|«)([\s\S]*?)(&gt;&gt;|>>|»)/g, (match, open, inner, close) => {
      const cleanInner = inner.replace(/<[^>]+>/g, '').trim();
      return `&lt;&lt;${cleanInner}&gt;&gt;`;
    });

    // A. Jika di word/document.xml dan ada rincian pekerjaan: duplikasi baris tabel lampiran
    if (filename === "word/document.xml" && detailsList && detailsList.length > 0) {
      const trRegex = /<w:tr(?:(?!<w:tr).)*?URAIAN_TUGAS.*?<\/w:tr>/s;
      const trMatch = xmlStr.match(trRegex);
      if (trMatch) {
        const templateTr = trMatch[0];
        const newTrs = detailsList.map((d, idx) => {
          let trRow = templateTr;
          const volVal = d.Volume !== undefined && d.Volume !== "" ? d.Volume : (d.volume !== undefined ? d.volume : 1);
          const rowDict = {
            "NO_URUT": String(d.No_Urut || idx + 1),
            "URAIAN_TUGAS": String(d.Uraian_Tugas || ""),
            "JANGKA_WAKTU": typeof formatJangkaWaktu === "function" ? formatJangkaWaktu(d.Jangka_Waktu) : String(d.Jangka_Waktu || ""),
            "VOLUME": String(volVal),
            "SATUAN": String(d.Satuan || "Dokumen"),
            "HARGA_SATUAN": typeof formatRupiah === "function" ? formatRupiah(d.Harga_Satuan) : String(d.Harga_Satuan || 0),
            "NILAI_PERJANJIAN": typeof formatRupiah === "function" ? formatRupiah(d.Nilai_Perjanjian) : String(d.Nilai_Perjanjian || 0),
            "BEBAN_ANGGARAN": String(d.Beban_Anggaran || ""),
          };
          for (const [rk, rv] of Object.entries(rowDict)) {
            const escVal = _docxXmlEscape(rv);
            trRow = trRow.split(`&lt;&lt;${rk}&gt;&gt;`).join(escVal);
            trRow = trRow.split(`<<${rk}>>`).join(escVal);
            trRow = trRow.split(`«${rk}»`).join(escVal);
          }
          return trRow;
        });
        xmlStr = xmlStr.replace(templateTr, () => newTrs.join(""));
      }
    }

    // B. Replace seluruh placeholder di XML dokumen (dukung case-insensitive dan spasi dalam tag)
    for (const [k, v] of Object.entries(dataDict)) {
      const escVal = _docxXmlEscape(v);
      const cleanKey = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      xmlStr = xmlStr.replace(new RegExp('&lt;&lt;\\s*' + cleanKey + '\\s*&gt;&gt;', 'gi'), () => escVal);
      xmlStr = xmlStr.replace(new RegExp('<<\\s*' + cleanKey + '\\s*>>', 'gi'), () => escVal);
      xmlStr = xmlStr.replace(new RegExp('«\\s*' + cleanKey + '\\s*»', 'gi'), () => escVal);
    }

    // C. Bersihkan jika ada duplikasi kata "NOMOR Nomor" atau "Nomor Nomor" akibat template/input
    xmlStr = xmlStr.replace(/\b(nomor|NOMOR)\s+(nomor|NOMOR)\b/g, '$1');

    zip.file(filename, xmlStr);
  }

  // 4. Generate Blob file Word .docx asli
  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

/**
 * Generate dan download dokumen Word (.docx) berdasarkan tabKey dan data context.
 * Mengisi langsung file template Word resmi (.docx) sehingga hasil 100% identik dengan template BPS.
 *
 * @param {string} tabKey      - 'spk' | 'ppl-pml' | 'ppl-sm' | 'pml-sm' | 'sm-ppk'
 * @param {object} dataCtx     - Objek konteks dari buildDataContext (spkCtx, bastPplPmlCtx, dll)
 * @param {object} docRecord   - Record data SPK/BAST
 * @param {object} [options]   - Opsi tambahan: noSurat, tglSurat, pegawaiArr, details, isPmlMitra
 */
async function generateAndDownloadWord(tabKey, dataCtx, docRecord, options = {}) {
  let details = options.details || dataCtx.details || [];
  if ((!details || details.length === 0) && (docRecord.Judul_Pekerjaan_Dokumen || docRecord.Total_Honor)) {
    const jw = (docRecord.Tanggal_Mulai && docRecord.Tanggal_Selesai)
      ? `${typeof formatTanggal === "function" ? formatTanggal(docRecord.Tanggal_Mulai) : docRecord.Tanggal_Mulai} s.d. ${typeof formatTanggal === "function" ? formatTanggal(docRecord.Tanggal_Selesai) : docRecord.Tanggal_Selesai}`
      : (docRecord.Tanggal_Mulai || docRecord.Tanggal_Selesai || "-");
    details = [{
      No_Urut: 1,
      Uraian_Tugas: docRecord.Judul_Pekerjaan_Dokumen || "Pendataan Lapangan",
      Jangka_Waktu: jw,
      Volume: 1,
      Satuan: "Dokumen",
      Harga_Satuan: Number(docRecord.Total_Honor) || 0,
      Nilai_Perjanjian: Number(docRecord.Total_Honor) || 0,
      Beban_Anggaran: docRecord.Beban_Anggaran || "BPS Kota Subulussalam"
    }];
  }

  let templatePath = "";
  let dataDict = {};
  let filename = "";

  if (tabKey === "spk") {
    const ctx = dataCtx.spkCtx || dataCtx;
    if (options.noSurat) ctx.NO_SPK = options.noSurat;
    templatePath = "template_docx/TEMPLATE_SPK.docx";
    dataDict = { ...ctx };
    filename = `SPK_${ctx.NAMA_PETUGAS || docRecord.ID_Dokumen}_${ctx.BULAN || ""}_${ctx.TAHUN || ""}.docx`;

  } else if (tabKey === "ppl-pml") {
    const ctx = dataCtx.bastPplPmlCtx || dataCtx;
    if (options.noSurat) ctx.NO_BAST_PPL_PML = options.noSurat;
    const isMitra = !!(options.isPmlMitra !== undefined ? options.isPmlMitra : ctx.IS_PML_MITRA);
    templatePath = isMitra
      ? "template_docx/TEMPLATE_BAST_PPL-PML (mitra).docx"
      : "template_docx/TEMPLATE_BAST_PPL-PML (organik).docx";
    dataDict = { ...ctx };
    filename = `BAST_PPL_PML_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;

  } else if (tabKey === "ppl-sm") {
    const ctx = dataCtx.bastPplSmCtx || dataCtx;
    if (options.noSurat) ctx.NO_BAST_PPL_SM = options.noSurat;
    templatePath = "template_docx/TEMPLATE_BAST_PPL-SM.docx";
    dataDict = { ...ctx };
    filename = `BAST_PPL_SM_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;

  } else if (tabKey === "pml-sm") {
    const ctx = dataCtx.bastPmlSmCtx || dataCtx;
    if (options.noSurat) ctx.NO_BAST_PML_SM = options.noSurat;
    const isMitra = !!(options.isPmlMitra !== undefined ? options.isPmlMitra : ctx.IS_PML_MITRA);
    templatePath = isMitra
      ? "template_docx/TEMPLATE_BAST_PML-SM (mitra).docx"
      : "template_docx/TEMPLATE_BAST_PML-SM (organik).docx";
    dataDict = { ...ctx };
    filename = `BAST_PML_SM_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;

  } else if (tabKey === "sm-ppk") {
    const pegawaiArr = options.pegawaiArr || (typeof AppState !== "undefined" ? AppState.pegawai : []);
    const ctx = (typeof buildBastSmPpkContext === "function")
      ? buildBastSmPpkContext(docRecord, pegawaiArr)
      : (dataCtx.bastSmPpkCtx || dataCtx);
    if (options.noSurat) ctx.NO_BAST_SM_PPK = options.noSurat;
    templatePath = "template_docx/TEMPLATE_BAST_SM-PPK.docx";
    dataDict = { ...ctx };
    filename = `BAST_SM_PPK_${docRecord.ID_Dokumen}.docx`;
  }

  try {
    // ── Ekspor Berbasis Template .docx Asli (Hasil 100% Sempurna Sesuai Template Word) ──
    const blob = await fillDocxTemplate(templatePath, dataDict, details);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "dokumen.docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update status Generate SPK ke Sheets jika ada ID_Dokumen
    if (docRecord?.ID_Dokumen && typeof updateInSheet === "function") {
      updateInSheet("spkBast", "ID_Dokumen", docRecord.ID_Dokumen, { Status_Generate_SPK: "Sudah" })
        .then(() => { if (typeof clearCache === "function") clearCache("spkBast"); })
        .catch(err => console.warn("Gagal update status generate:", err));
    }

    return filename;
  } catch (err) {
    console.error("[word-export.js] Gagal mengisi template docx asli:", err);
    throw err;
  }
}

