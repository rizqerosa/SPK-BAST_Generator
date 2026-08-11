// ============================================================
// RENDER.JS — Template rendering engine
// ============================================================

/**
 * Replace semua placeholder <<KEY>> di templateHTML dengan nilai dari dataObject.
 * Kalau key tidak ada di dataObject, placeholder dibiarkan apa adanya (tidak error).
 * Mendukung key dengan karakter slash seperti <<GOLONGAN/PANGKAT_PPK>>.
 */
function renderTemplate(templateHTML, dataObject) {
  return templateHTML.replace(/<<([A-Z0-9_\/\-]+)>>/g, (match, key) => {
    const val = dataObject[key];
    if (val === undefined || val === null) return match; // biarkan placeholder jika tidak ada
    return String(val);
  });
}

/**
 * Render baris-baris tabel lampiran SPK dari array detailPekerjaan.
 * @returns {string} HTML <tr>...</tr> yang di-join
 */
function renderTabelLampiran(detailPekerjaanArray) {
  if (!detailPekerjaanArray || detailPekerjaanArray.length === 0) {
    return `<tr><td colspan="8" style="text-align:center;color:#999;">Tidak ada data pekerjaan</td></tr>`;
  }
  return detailPekerjaanArray.map((d, i) => `
    <tr>
      <td class="tc">${d.No_Urut || (i + 1)}</td>
      <td>${d.Uraian_Tugas || ""}</td>
      <td>${d.Jangka_Waktu || ""}</td>
      <td class="tc">${d.Volume || ""}</td>
      <td class="tc">${d.Satuan || ""}</td>
      <td class="tr">Rp ${formatRupiah(d.Harga_Satuan)}</td>
      <td class="tr">Rp ${formatRupiah(d.Nilai_Perjanjian)}</td>
      <td style="font-size:7.5pt;">${d.Beban_Anggaran || ""}</td>
    </tr>`).join("\n");
}

/**
 * Bangun objek data lengkap untuk satu record spkBast.
 * Menggabungkan semua lookup (mitra, pegawai, detailPekerjaan) jadi satu flat object
 * siap dipakai oleh renderTemplate().
 */
function buildDataContext(record, { mitraArr, pegawaiArr, detailArr }) {
  const isPegawai = (record.Jenis_Petugas || "").toLowerCase() === "pegawai";
  let mitra = cariMitra(record.ID_Mitra, mitraArr);
  if (!mitra || isPegawai) {
    const p = cariPegawai(record.ID_Mitra, pegawaiArr);
    if (p) {
      mitra = {
        ID_Mitra: getPegawaiNip(p),
        Nama_Mitra: getPegawaiName(p),
        NIK: getPegawaiNip(p),
        Posisi: p.Jabatan || "Pegawai BPS",
        Asal: "BPS Kota Subulussalam"
      };
    }
  }
  mitra = mitra || {};

  const ppk      = cariPegawai(record.PPK,        pegawaiArr) || {};
  let isPmlMitra = false;
  let pml        = cariPegawai(record.PML,        pegawaiArr);
  if (!pml && record.PML) {
    const m = cariMitra(record.PML, mitraArr);
    if (m) {
      isPmlMitra = true;
      pml = {
        Nama_Pegawai: getMitraName(m),
        NIP: m.NIK || getMitraId(m),
        NIK: m.NIK || getMitraId(m),
        Jabatan: getMitraPosisi(m) || "Mitra Pemeriksa Lapangan"
      };
    }
  }
  pml = pml || {};
  const ketuaTim = cariPegawai(record.Ketua_Tim,  pegawaiArr) || {};
  const kepala   = cariPegawai(record["Kepala/PLH"], pegawaiArr) || {};
  const details  = getDetailByDokumen(detailArr, record.ID_Dokumen);

  // Hitung / validasi total honor
  const totalHonor = hitungTotalHonor(detailArr, record.ID_Dokumen) || record.Total_Honor || 0;
  const terbilangHonor = terbilang(totalHonor) + " Rupiah";

  // Tanggal SPK — support nama kolom baru ("Tanggal SPK") dan fallback ke lama (Tanggal_SPK)
  const tSPK = tanggalTerbilang(record["Tanggal SPK"] || record.Tanggal_SPK || record.Tanggal_Mulai);
  // Tanggal BAST PPL-PML
  const tBAST_PPL_PML = tanggalTerbilang(record.Tanggal_BAST_PPL_PML);
  // Tanggal BAST PPL-SM
  const tBAST_PPL_SM  = tanggalTerbilang(record.Tanggal_BAST_PPL_SM);
  // Tanggal BAST PML-SM
  const tBAST_PML_SM  = tanggalTerbilang(record.Tanggal_BAST_PML_SM);
  // Tanggal Kepka
  const tKepka        = tanggalTerbilang(record.Tanggal_Kepka);

  // Baris tabel lampiran (untuk SPK)
  const tabelRows = renderTabelLampiran(details);

  // SPK context (tanggal SPK dipakai)
  const spkCtx = {
    // === Header & nomor ===
    JUDUL_PEKERJAAN_DOKUMEN: record.Judul_Pekerjaan_Dokumen || "",
    NO_SPK:                  record.Nomor_SPK || record.No_SPK || "",
    URAIAN_PEKERJAAN:        record.Judul_Pekerjaan_Dokumen || "",

    // === Tanggal SPK (terbilang) ===
    HARI_TERBILANG:   tSPK.hari,
    TANGGAL_TERBILANG:tSPK.tanggal,
    BULAN_TERBILANG:  tSPK.bulan,
    TAHUN_TERBILANG:  tSPK.tahun,
    TANGGAL_BAST:     tSPK.tanggalFormat,
    TANGGAL:          tSPK.tanggalFormat,
    BULAN:            tSPK.bulan,
    TAHUN:            String(record.Tahun || ""),

    // === PPK (Pihak Pertama SPK) ===
    NAMA_PPK:              ppk.Nama_Pegawai || "",
    NIP_PPK:               ppk.NIP || "",
    "GOLONGAN/PANGKAT_PPK": `${ppk.Pangkat || ""} ${ppk.Golongan || ""}`.trim(),

    // === Mitra/PPL (Pihak Kedua SPK) ===
    NAMA_PETUGAS:      mitra.Nama_Mitra || "",
    NAMA_PIHAK_KEDUA:  mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA: mitra.NIK || "",   // di BAST PPL adalah pihak pertama
    JABATAN_PETUGAS:   mitra.Posisi || "Mitra Pendataan",
    JABATAN_PIHAK_KEDUA: `${mitra.Posisi || "Mitra Pendataan"}`,
    JABATAN_PIHAK_PERTAMA: mitra.Posisi || "Mitra Pendataan",
    NAMA_PIHAK_PERTAMA: ppk.Nama_Pegawai || "",  // SPK: pihak pertama = PPK
    ASAL:              mitra.Asal || "",

    // === Honor ===
    TOTAL_HONOR:            formatRupiah(totalHonor),
    TERBILANG_TOTAL_HONOR:  terbilangHonor,
    TERBILANG:              terbilangHonor,

    // === Tanggal selesai & batas ===
    TANGGAL_SELESAI:    formatTanggal(record.Tanggal_Selesai),
    BATAS_PENYERAHAN:   formatTanggal(record.Batas_Penyerahan),

    // === Tabel lampiran SPK ===
    TABEL_LAMPIRAN_ROWS: tabelRows,

    // === Buku pedoman (ambil dari detail pertama) ===
    BUKU_PEDOMAN: details.length > 0 ? details[0].Buku_Pedoman : "",
    BEBAN_ANGGARAN: details.length > 0 ? details[0].Beban_Anggaran : "",
  };

  // BAST PPL-PML context
  const bastPplPmlCtx = {
    ...spkCtx,
    NO_BAST_PPL_PML:          record.No_BAST_PPL_PML || "",
    "NO_BAST_PPL-PML":        record.No_BAST_PPL_PML || "",
    HARI_TERBILANG:           tBAST_PPL_PML.hari,
    TANGGAL_TERBILANG:        tBAST_PPL_PML.tanggal,
    BULAN_TERBILANG:          tBAST_PPL_PML.bulan,
    TAHUN_TERBILANG:          tBAST_PPL_PML.tahun,
    TANGGAL_BAST:             tBAST_PPL_PML.tanggalFormat,
    // BAST PPL-PML: Pihak Pertama = Mitra/PPL, Pihak Kedua = PML
    NAMA_PIHAK_PERTAMA:       mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA:        mitra.NIK || "",
    JABATAN_PIHAK_PERTAMA:    mitra.Posisi || "Mitra Pendataan",
    NAMA_PIHAK_KEDUA:         pml.Nama_Pegawai || "",
    NIP_PIHAK_KEDUA:          isPmlMitra ? "" : (pml.NIP || ""),
    NIK_PIHAK_KEDUA:          pml.NIK || pml.NIP || "",
    NIK_NIP_PIHAK_KEDUA:      pml.NIP || "",
    JABATAN_PIHAK_KEDUA:      pml.Jabatan || "",
    NOMOR_KEPKA:              record.Nomor_Kepka || "",
    TANGGAL_KEPKA:            tKepka.tanggalFormat,
    TANGGAL:                  tSPK.tanggalFormat,
    BULAN:                    tSPK.bulan,
    TAHUN:                    String(record.Tahun || ""),
    IS_PML_MITRA:             isPmlMitra,
  };

  // BAST PPL-SM context
  const bastPplSmCtx = {
    ...spkCtx,
    NO_BAST_PPL_SM:           record.No_BAST_PPL_SM || "",
    HARI_TERBILANG:           tBAST_PPL_SM.hari,
    TANGGAL_TERBILANG:        tBAST_PPL_SM.tanggal,
    BULAN_TERBILANG:          tBAST_PPL_SM.bulan,
    TAHUN_TERBILANG:          tBAST_PPL_SM.tahun,
    TANGGAL_BAST:             tBAST_PPL_SM.tanggalFormat,
    TANGGAL_BAST_SM_PPK:      tBAST_PPL_SM.tanggalFormat,
    // Pihak Pertama = Mitra/PPL
    NAMA_PIHAK_PERTAMA:       mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA:        mitra.NIK || "",
    JABATAN_PIHAK_PERTAMA:    mitra.Posisi || "Mitra Pendataan",
    // Pihak Kedua = Ketua Tim/SM
    NAMA_KETUA_TIM:           ketuaTim.Nama_Pegawai || "",
    NIP_KETUA_TIM:            ketuaTim.NIP || "",
    "GOLONGAN/PANGKAT_KETUA_TIM": `${ketuaTim.Pangkat || ""} ${ketuaTim.Golongan || ""}`.trim(),
    JABATAN_KETUA_TIM:        ketuaTim.Jabatan || "",
    NOMOR_KEPKA:              record.Nomor_Kepka || "",
    TANGGAL_KEPKA:            tKepka.tanggalFormat,
    TANGGAL:                  tSPK.tanggalFormat,
    BULAN:                    tSPK.bulan,
    TAHUN:                    String(record.Tahun || ""),
  };

  // BAST PML-SM context
  const bastPmlSmCtx = {
    ...bastPplSmCtx,
    NO_BAST_PML_SM:           record.No_BAST_PML_SM || "",
    HARI_TERBILANG:           tBAST_PML_SM.hari,
    TANGGAL_TERBILANG:        tBAST_PML_SM.tanggal,
    BULAN_TERBILANG:          tBAST_PML_SM.bulan,
    TAHUN_TERBILANG:          tBAST_PML_SM.tahun,
    TANGGAL_BAST:             tBAST_PML_SM.tanggalFormat,
    TANGGAL_BAST_SM_PPK:      tBAST_PML_SM.tanggalFormat,
    // Pihak Pertama = PML
    NAMA_PIHAK_PERTAMA:       pml.Nama_Pegawai || "",
    NIK_PIHAK_PERTAMA:        pml.NIK || pml.NIP || "",
    NIP_PIHAK_PERTAMA:        isPmlMitra ? "" : (pml.NIP || ""),
    JABATAN_PIHAK_PERTAMA:    pml.Jabatan || "",
    IS_PML_MITRA:             isPmlMitra,
  };  };

  return { spkCtx, bastPplPmlCtx, bastPplSmCtx, bastPmlSmCtx, details, totalHonor, terbilangHonor };
}

/**
 * Bangun context untuk BAST SM-PPK (dari record bastSmPpk{}, bukan spkBast)
 */
function buildBastSmPpkContext(record, pegawaiArr) {
  const ppk      = cariPegawai(record.PPK,       pegawaiArr) || {};
  const ketuaTim = cariPegawai(record.Ketua_Tim, pegawaiArr) || {};
  const tBAST    = tanggalTerbilang(record.Tanggal_BAST_SM_PPK || record.Tanggal || new Date().toISOString().slice(0, 10));
  const totalHonor = record.Total_Honor || 0;

  return {
    JUDUL_PEKERJAAN_DOKUMEN:   record.Judul_Pekerjaan_Dokumen || "",
    NO_BAST_SM_PPK:            record.No_BAST_SM_PPK || "",
    "NO_BAST_SM-PPK":          record.No_BAST_SM_PPK || "",
    HARI_TERBILANG:            tBAST.hari,
    TANGGAL_TERBILANG:         tBAST.tanggal,
    BULAN_TERBILANG:           tBAST.bulan,
    TAHUN_TERBILANG:           tBAST.tahun,
    TANGGAL_BAST:              tBAST.tanggalFormat,
    URAIAN_PEKERJAAN:          record.Uraian_Tugas || record.Judul_Pekerjaan_Dokumen || "",
    NAMA_KETUA_TIM:            ketuaTim.Nama_Pegawai || "",
    NIP_KETUA_TIM:             ketuaTim.NIP || "",
    "GOLONGAN/PANGKAT_KETUA_TIM": `${ketuaTim.Pangkat || ""} ${ketuaTim.Golongan || ""}`.trim(),
    JABATAN_KETUA_TIM:         ketuaTim.Jabatan || "",
    NAMA_PPK:                  ppk.Nama_Pegawai || "",
    NIP_PPK:                   ppk.NIP || "",
    "GOLONGAN/PANGKAT_PPK":    `${ppk.Pangkat || ""} ${ppk.Golongan || ""}`.trim(),
    TOTAL_HONOR:               formatRupiah(totalHonor),
    TERBILANG:                 terbilang(totalHonor) + " Rupiah",
  };
}
