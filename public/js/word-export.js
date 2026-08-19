// ============================================================
// WORD-EXPORT.JS — Generator Dokumen Word (.docx)
// ============================================================

/**
 * Generate dan download dokumen Word (.docx) berdasarkan tabKey dan data context.
 *
 * @param {string} tabKey      - 'spk' | 'ppl-pml' | 'ppl-sm' | 'pml-sm' | 'sm-ppk'
 * @param {object} dataCtx     - Objek konteks dari buildDataContext (spkCtx, bastPplPmlCtx, dll)
 * @param {object} docRecord   - Record data SPK/BAST
 * @param {object} [options]   - Opsi tambahan: noSurat, tglSurat, pegawaiArr, details
 */
async function generateAndDownloadWord(tabKey, dataCtx, docRecord, options = {}) {
  if (typeof docx === "undefined") {
    throw new Error("Library Word (docx.js) belum termuat. Pastikan koneksi internet aktif.");
  }

  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          AlignmentType, WidthType, BorderStyle } = docx;

  const P = (text, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { after: opts.spaceAfter ?? 100 },
    children: [new TextRun({
      text: String(text || ""),
      bold: opts.bold || false,
      size: (opts.size || 11) * 2,
      font: "Times New Roman",
    })]
  });

  const noBorder = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
  };

  const details = options.details || dataCtx.details || [];
  let content = [];
  let filename = "";

  if (tabKey === "spk") {
    const ctx = dataCtx.spkCtx || dataCtx;
    const nomor = options.noSurat || ctx.NO_SPK || docRecord.ID_Dokumen;
    filename = `SPK_${ctx.NAMA_PETUGAS || docRecord.ID_Dokumen}_${ctx.BULAN || ""}_${ctx.TAHUN || ""}.docx`;
    content = _buildWordSpkContent(ctx, details, { P, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, noBorder, thinBorder });

  } else if (tabKey === "ppl-pml") {
    const ctx = dataCtx.bastPplPmlCtx || dataCtx;
    filename = `BAST_PPL_PML_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;
    content = _buildWordBastContent("BAST Penyerahan Hasil Pekerjaan PPL kepada PML", ctx, { P, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, noBorder });

  } else if (tabKey === "ppl-sm") {
    const ctx = dataCtx.bastPplSmCtx || dataCtx;
    filename = `BAST_PPL_SM_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;
    content = _buildWordBastContent("BAST Penyerahan Hasil Pekerjaan PPL kepada SM/Ketua Tim", ctx, { P, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, noBorder });

  } else if (tabKey === "pml-sm") {
    const ctx = dataCtx.bastPmlSmCtx || dataCtx;
    filename = `BAST_PML_SM_${ctx.NAMA_PIHAK_PERTAMA || docRecord.ID_Dokumen}.docx`;
    content = _buildWordBastContent("BAST Penyerahan Hasil Pekerjaan PML kepada SM/Ketua Tim", ctx, { P, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, noBorder });

  } else if (tabKey === "sm-ppk") {
    const pegawaiArr = options.pegawaiArr || (typeof AppState !== "undefined" ? AppState.pegawai : []);
    const ctx = (typeof buildBastSmPpkContext === "function")
      ? buildBastSmPpkContext(docRecord, pegawaiArr)
      : (dataCtx.bastSmPpkCtx || dataCtx);
    if (options.noSurat) ctx.NO_BAST_SM_PPK = options.noSurat;
    filename = `BAST_SM_PPK_${docRecord.ID_Dokumen}.docx`;
    content = _buildWordBastContent("BAST Penyerahan Hasil Pekerjaan SM kepada PPK", ctx, { P, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, noBorder });
  }

  const wordDoc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twip
        }
      },
      children: content,
    }],
  });

  const blob = await Packer.toBlob(wordDoc);
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
}

// ─── Builder SPK ─────────────────────────────────────────────
function _buildWordSpkContent(ctx, details, D) {
  const { P, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, noBorder, thinBorder } = D;

  const headerPar = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "PERJANJIAN KERJA", bold: true, size: 26, font: "Times New Roman" }),
    ]
  });

  const subHeaderPar = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: ctx.JUDUL_PEKERJAAN_DOKUMEN || "", bold: true, size: 22, font: "Times New Roman" }),
    ]
  });

  const instansiPar = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "BADAN PUSAT STATISTIK KOTA SUBULUSSALAM", bold: true, size: 22, font: "Times New Roman" }),
    ]
  });

  const nomorPar = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [
      new TextRun({ text: `NOMOR ${ctx.NO_SPK || ""}`, size: 22, font: "Times New Roman" }),
    ]
  });

  const pihakTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders: noBorder, width: { size: 4, type: WidthType.PERCENTAGE }, children: [P("1.", { spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 28, type: WidthType.PERCENTAGE }, children: [P(ctx.NAMA_PPK || "", { bold: true, spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 3, type: WidthType.PERCENTAGE }, children: [P(":", { spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 65, type: WidthType.PERCENTAGE }, children: [P("Pejabat Pembuat Komitmen Badan Pusat Statistik BPS Kota Subulussalam alamat Jl. Raja Tua Lae Oram Komplek Perkantoran Walikota Subulussalam bertindak untuk dan atas nama Badan Pusat Statistik BPS Kota Subulussalam selanjutnya disebut PIHAK PERTAMA.", { align: AlignmentType.JUSTIFY, spaceAfter: 60 })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: noBorder, width: { size: 4, type: WidthType.PERCENTAGE }, children: [P("2.", { spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 28, type: WidthType.PERCENTAGE }, children: [P(ctx.NAMA_PETUGAS || ctx.NAMA_PIHAK_KEDUA || "", { bold: true, spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 3, type: WidthType.PERCENTAGE }, children: [P(":", { spaceAfter: 60 })] }),
          new TableCell({ borders: noBorder, width: { size: 65, type: WidthType.PERCENTAGE }, children: [P(`${ctx.JABATAN_PETUGAS || ""} ${ctx.URAIAN_PEKERJAAN || ""}; beralamat ${ctx.ASAL || ""}. Bertindak untuk dan atas nama diri sendiri. selanjutnya disebut PIHAK KEDUA.`, { align: AlignmentType.JUSTIFY, spaceAfter: 60 })] }),
        ]
      })
    ]
  });

  const body = [
    headerPar,
    subHeaderPar,
    instansiPar,
    nomorPar,
    P(`Pada Hari ini. ${ctx.HARI_TERBILANG || ""} tanggal ${ctx.TANGGAL_TERBILANG || ""} bulan ${ctx.BULAN_TERBILANG || ""} tahun ${ctx.TAHUN_TERBILANG || ""} (${ctx.TANGGAL_BAST || ctx.TANGGAL || ""}). bertempat di Kantor BPS Kota Subulussalam yang bertanda tangan di bawah ini:`, { spaceAfter: 120 }),
    pihakTable,
    P(`bahwa PIHAK PERTAMA dan PIHAK KEDUA yang secara bersama-sama disebut PARA PIHAK. sepakat untuk mengikatkan diri dalam Perjanjian Kerja ${ctx.JABATAN_PIHAK_KEDUA || ""} Kegiatan ${ctx.URAIAN_PEKERJAAN || ""} di Badan Pusat Statistik Kota Subulussalam yang selanjutnya disebut Perjanjian. dengan ketentuan-ketentuan sebagai berikut:`, { spaceAfter: 120 }),
    P("Pasal 1", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P(`PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA menerima pekerjaan dari PIHAK PERTAMA sebagai Petugas ${ctx.URAIAN_PEKERJAAN || ""} dengan lingkup pekerjaan yang ditetapkan oleh PIHAK PERTAMA.`, { spaceAfter: 100 }),
    P("Pasal 2", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P(`Ruang lingkup pekerjaan dalam Perjanjian ini mengacu pada wilayah kerja. ${ctx.BUKU_PEDOMAN || ""} dan ketentuan-ketentuan yang ditetapkan oleh PIHAK PERTAMA.`, { spaceAfter: 100 }),
    P("Pasal 3", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P(`Jangka Waktu Perjanjian terhitung sejak ditandatangani sampai dengan tanggal ${ctx.TANGGAL_SELESAI || "-"}.`, { spaceAfter: 100 }),
    P("Pasal 4", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("PIHAK KEDUA berkewajiban melaksanakan seluruh pekerjaan yang diberikan oleh PIHAK PERTAMA sampai selesai. sesuai ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 2.", { spaceAfter: 100 }),
    P("Pasal 5", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P(`PIHAK KEDUA berhak untuk mendapatkan honorarium petugas dari PIHAK PERTAMA sebesar Rp. ${ctx.TOTAL_HONOR || "0"},- (${ctx.TERBILANG_TOTAL_HONOR || ""}). yang dibayarkan PIHAK PERTAMA kepada PIHAK KEDUA sesuai pencapaian target pekerjaan PIHAK KEDUA. sudah termasuk biaya pajak. bea materai. pulsa dan kuota internet untuk komunikasi. dan jasa pelayanan keuangan.`, { spaceAfter: 80 }),
    P("PIHAK KEDUA tidak diberikan honorarium tambahan apabila melakukan kunjungan di luar jadwal pelaksanaan pekerjaan lapangan.", { spaceAfter: 100 }),
    P("Pasal 6", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("Pembayaran honorarium sebagaimana dimaksud dalam Pasal 5 dilakukan setelah PIHAK KEDUA menyelesaikan dan menyerahkan seluruh hasil pekerjaan sebagaimana dimaksud dalam Pasal 2 kepada PIHAK PERTAMA.", { spaceAfter: 100 }),
    P("Pasal 7", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P(`Penyerahan seluruh hasil pekerjaan lapangan sebagaimana dimaksud dalam Pasal 2 dilaksanakan oleh PIHAK KEDUA kepada PIHAK PERTAMA yang dinyatakan dalam Berita Acara Serah Terima Hasil Pekerjaan dan ditandatangani oleh PARA PIHAK. paling lambat pada tanggal ${ctx.TANGGAL_SELESAI || "-"}.`, { spaceAfter: 80 }),
    P(`Apabila terdapat hambatan dalam penyerahan hasil pekerjaan sebagaimana dimaksud pada ayat (1). PIHAK PERTAMA dapat memberikan tambahan waktu penyerahan seluruh hasil pekerjaan lapangan paling lambat pada tanggal ${ctx.BATAS_PENYERAHAN || "-"}.`, { spaceAfter: 100 }),
    P("Pasal 8", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("PIHAK PERTAMA dapat memutuskan Perjanjian ini secara sepihak sewaktu-waktu dalam hal PIHAK KEDUA tidak dapat melaksanakan kewajibannya sebagaimana dimaksud dalam Pasal 4. dengan menerbitkan Surat Pemutusan Perjanjian Kerja.", { spaceAfter: 100 }),
    P("Pasal 9", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("Apabila PIHAK KEDUA mengundurkan diri pada saat/setelah pelaksanaan pelatihan atau saat pendataan dengan tidak menyelesaikan pekerjaan yang menjadi tanggung jawabnya. maka wajib membayar ganti rugi kepada PIHAK PERTAMA.", { spaceAfter: 80 }),
    P("Dikecualikan tidak membayar ganti rugi sebagaimana dimaksud pada ayat (1) kepada PIHAK PERTAMA. apabila PIHAK KEDUA meninggal dunia. mengundurkan diri karena sakit dengan keterangan rawat inap. kecelakaan dengan keterangan kepolisian. dan/atau telah diberikan Surat Pemutusan Perjanjian Kerja dari PIHAK PERTAMA.", { spaceAfter: 80 }),
    P("Dalam hal terjadi peristiwa sebagaimana dimaksud pada ayat (2). PIHAK PERTAMA membayarkan honorarium kepada PIHAK KEDUA secara proporsional sesuai pekerjaan yang telah dilaksanakan.", { spaceAfter: 100 }),
    P("Pasal 10", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("Apabila terjadi Keadaan Kahar. yang meliputi bencana alam dan bencana sosial. PIHAK KEDUA memberitahukan kepada PIHAK PERTAMA dalam waktu paling lambat 7 (tujuh) hari sejak mengetahui atas kejadian Keadaan Kahar dengan menyertakan bukti.", { spaceAfter: 80 }),
    P("Pada saat terjadi Keadaan Kahar. pelaksanaan pekerjaan oleh PIHAK KEDUA dihentikan sementara dan dilanjutkan kembali setelah Keadaan Kahar berakhir. namun apabila akibat Keadaan Kahar tidak memungkinkan dilanjutkan/diselesaikannya pelaksanaan pekerjaan. PIHAK KEDUA berhak menerima honorarium secara proporsional sesuai pekerjaan yang telah dilaksanakan.", { spaceAfter: 100 }),
    P("Pasal 11", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("Segala sesuatu yang belum atau tidak cukup diatur dalam Perjanjian ini. dituangkan dalam perjanjian tambahan/addendum dan merupakan bagian tidak terpisahkan dari Perjanjian ini.", { spaceAfter: 100 }),
    P("Pasal 12", { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
    P("Segala perselisihan atau perbedaan pendapat yang timbul sebagai akibat adanya Perjanjian ini akan diselesaikan secara musyawarah untuk mufakat.", { spaceAfter: 80 }),
    P("Apabila perselisihan tidak dapat diselesaikan sebagaimana dimaksud pada ayat (1). PARA PIHAK sepakat menyelesaikan perselisihan dengan memilih kedudukan/domisili hukum di Panitera Pengadilan Negeri Kota Subulussalam.", { spaceAfter: 120 }),
    P("Demikian Perjanjian ini dibuat dan ditandatangani oleh PARA PIHAK dalam 2 (dua) rangkap asli bermeterai cukup. tanpa paksaan dari PIHAK manapun dan untuk dilaksanakan oleh PARA PIHAK.", { spaceAfter: 180 }),
  ];


  // Tabel Tanda Tangan SPK
  const ttdTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: noBorder, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PIHAK KEDUA,", bold: true, size: 22, font: "Times New Roman" })] })
        ]}),
        new TableCell({ borders: noBorder, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PIHAK PERTAMA,", bold: true, size: 22, font: "Times New Roman" })] })
        ]}),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: ctx.NAMA_PETUGAS || ctx.NAMA_PIHAK_KEDUA || "", bold: true, size: 22, font: "Times New Roman" })] })] }),
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: ctx.NAMA_PPK || "", bold: true, size: 22, font: "Times New Roman" })] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIK. ${ctx.NIK_PIHAK_PERTAMA || "-"}`, size: 22, font: "Times New Roman" })] })] }),
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${ctx.NIP_PPK || "-"}`, size: 22, font: "Times New Roman" })] })] }),
      ]}),
    ]
  });
  body.push(ttdTable);

  // Lampiran SPK jika ada rincian pekerjaan
  if (details && details.length > 0) {
    body.push(new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "LAMPIRAN SURAT PERJANJIAN KERJA", bold: true, size: 24, font: "Times New Roman" })]
    }));
    body.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: `DAFTAR URAIAN TUGAS, JANGKA WAKTU, NILAI PERJANJIAN, DAN BEBAN ANGGARAN`, bold: true, size: 20, font: "Times New Roman" })]
    }));

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ borders: thinBorder, width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Uraian Tugas", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Jangka Waktu", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Volume", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Satuan", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 13, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Harga Satuan", bold: true, size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, width: { size: 13, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nilai (Rp)", bold: true, size: 18, font: "Times New Roman" })] })] }),
        ]
      })
    ];

    details.forEach((d, idx) => {
      tableRows.push(new TableRow({
        children: [
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(d.No_Urut || idx + 1), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ children: [new TextRun({ text: String(d.Uraian_Tugas || ""), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: typeof formatJangkaWaktu === "function" ? formatJangkaWaktu(d.Jangka_Waktu) : String(d.Jangka_Waktu || ""), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(d.Volume || 1), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(d.Satuan || ""), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: typeof formatRupiah === "function" ? formatRupiah(d.Harga_Satuan) : String(d.Harga_Satuan || 0), size: 18, font: "Times New Roman" })] })] }),
          new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: typeof formatRupiah === "function" ? formatRupiah(d.Nilai_Perjanjian) : String(d.Nilai_Perjanjian || 0), size: 18, font: "Times New Roman" })] })] }),
        ]
      }));
    });

    // Total Row — hanya terbilang (konsisten dengan template HTML)
    tableRows.push(new TableRow({
      children: [
        new TableCell({ borders: thinBorder, columnSpan: 6, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Terbilang:", bold: true, size: 18, font: "Times New Roman" })] })] }),
        new TableCell({ borders: thinBorder, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: ctx.TERBILANG_TOTAL_HONOR || ctx.TERBILANG || "—", size: 18, font: "Times New Roman" })] })] }),
      ]
    }));

    const lampiranTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    });
    body.push(lampiranTable);
  }

  return body;
}

// ─── Builder BAST ─────────────────────────────────────────────
function _buildWordBastContent(title, ctx, D) {
  const { P, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, noBorder } = D;

  const noDoc = ctx.NO_BAST_PPL_PML || ctx.NO_BAST_PPL_SM || ctx.NO_BAST_PML_SM || ctx.NO_BAST_SM_PPK || ctx["NO_BAST_PPL-PML"] || "";

  const body = [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 26, font: "Times New Roman" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 180 },
      children: [new TextRun({ text: `NOMOR: ${noDoc}`, size: 22, font: "Times New Roman" })]
    }),
    P(`Pada hari ini, ${ctx.HARI_TERBILANG || ""} tanggal ${ctx.TANGGAL_TERBILANG || ""} bulan ${ctx.BULAN_TERBILANG || ""} tahun ${ctx.TAHUN_TERBILANG || ""} (${ctx.TANGGAL_BAST || ctx.TANGGAL || ""}), bertempat di BPS Kota Subulussalam, kami yang bertanda tangan di bawah ini:`, { spaceAfter: 120 }),
    P("1. PIHAK PERTAMA:", { bold: true, spaceAfter: 40 }),
    P(`Nama\t\t: ${ctx.NAMA_PIHAK_PERTAMA || ""}`, { spaceAfter: 30 }),
    P(`NIK / NIP\t: ${ctx.NIK_PIHAK_PERTAMA || ctx.NIP_PIHAK_PERTAMA || "-"}`, { spaceAfter: 30 }),
    P(`Jabatan\t\t: ${ctx.JABATAN_PIHAK_PERTAMA || ""}`, { spaceAfter: 100 }),
    P("2. PIHAK KEDUA:", { bold: true, spaceAfter: 40 }),
    P(`Nama\t\t: ${ctx.NAMA_PIHAK_KEDUA || ctx.NAMA_KETUA_TIM || ctx.NAMA_PPK || ""}`, { spaceAfter: 30 }),
    P(`NIK / NIP\t: ${ctx.NIK_PIHAK_KEDUA || ctx.NIP_PIHAK_KEDUA || ctx.NIP_KETUA_TIM || ctx.NIP_PPK || "-"}`, { spaceAfter: 30 }),
    P(`Jabatan\t\t: ${ctx.JABATAN_PIHAK_KEDUA || ctx.JABATAN_KETUA_TIM || "Pejabat Pembuat Komitmen"}`, { spaceAfter: 100 }),
    P(`PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerima hasil pekerjaan: ${ctx.JUDUL_PEKERJAAN_DOKUMEN || ctx.URAIAN_PEKERJAAN || ""} sesuai ketentuan yang berlaku.`, { spaceAfter: 120 }),
    P(`Total Nilai Honorarium: Rp ${ctx.TOTAL_HONOR || "0"} (${ctx.TERBILANG_TOTAL_HONOR || ctx.TERBILANG || ""}).`, { spaceAfter: 140 }),
    P("Demikian Berita Acara Serah Terima ini dibuat dalam rangkap yang cukup untuk dapat dipergunakan sebagaimana mestinya.", { spaceAfter: 180 }),
  ];

  // Tabel Tanda Tangan BAST
  const ttdTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: noBorder, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PIHAK KEDUA,", bold: true, size: 22, font: "Times New Roman" })] })
        ]}),
        new TableCell({ borders: noBorder, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PIHAK PERTAMA,", bold: true, size: 22, font: "Times New Roman" })] })
        ]}),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: ctx.NAMA_PIHAK_KEDUA || ctx.NAMA_KETUA_TIM || ctx.NAMA_PPK || "", bold: true, size: 22, font: "Times New Roman" })] })] }),
        new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: ctx.NAMA_PIHAK_PERTAMA || "", bold: true, size: 22, font: "Times New Roman" })] })] }),
      ]}),
    ]
  });
  body.push(ttdTable);

  return body;
}
