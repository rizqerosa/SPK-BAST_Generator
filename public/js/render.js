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
 * Format string jangka waktu ke format Indonesia yang baik.
 * Input bisa berupa:
 *  - "2026-04-24 s/d 2026-04-30"  → "24 s.d. 30 April 2026"
 *  - "2026-04-10 s/d 2026-05-10"  → "10 April s.d. 10 Mei 2026"
 *  - "2026-04-24T00:00:00 s/d 2026-04-30T00:00:00" (juga didukung)
 *  - Sudah dalam format baik → dikembalikan apa adanya
 */
function formatJangkaWaktu(str) {
  if (!str || !String(str).trim()) return "—";
  const _BULAN = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  const parseISO = s => {
    if (!s) return null;
    const clean = String(s).trim().includes("T") ? s.split("T")[0] : String(s).trim();
    const p = clean.split("-").map(Number);
    if (p.length === 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
      return { y: p[0], m: p[1], d: p[2] };
    }
    return null;
  };

  // Coba split separator s/d atau s.d.
  const sep = String(str).match(/\s*s[\/.]?d\.?\s*/i);
  if (sep) {
    const parts = String(str).split(/\s*s[\/.]?d\.?\s*/i);
    const a = parseISO(parts[0]);
    const b = parseISO(parts[1]);
    if (a && b) {
      if (a.m === b.m && a.y === b.y) {
        return `${a.d} s.d. ${b.d} ${_BULAN[b.m] || b.m} ${b.y}`;
      }
      const aSuffix = a.y === b.y ? "" : ` ${a.y}`;
      return `${a.d} ${_BULAN[a.m] || a.m}${aSuffix} s.d. ${b.d} ${_BULAN[b.m] || b.m} ${b.y}`;
    }
  }

  // Coba parse single date
  const single = parseISO(str);
  if (single) {
    return `${single.d} ${_BULAN[single.m] || single.m} ${single.y}`;
  }

  // Kembalikan apa adanya jika tidak bisa di-parse
  return String(str);
}

/**
 * Render baris-baris tabel lampiran SPK dari array detailPekerjaan.
 * @returns {string} HTML <tr>...</tr> yang di-join
 */
function renderTabelLampiran(detailPekerjaanArray) {
  // Filter baris yang valid (punya Uraian_Tugas atau Harga > 0)
  const valid = (detailPekerjaanArray || []).filter(d =>
    (d.Uraian_Tugas && String(d.Uraian_Tugas).trim() !== "") ||
    (Number(d.Harga_Satuan) > 0)
  );
  if (valid.length === 0) {
    return `<tr><td colspan="8" style="text-align:center;color:#999;">Tidak ada data pekerjaan</td></tr>`;
  }
  return valid.map((d, i) => `
    <tr>
      <td class="tc">${d.No_Urut || (i + 1)}</td>
      <td>${d.Uraian_Tugas || ""}</td>
      <td>${formatJangkaWaktu(d.Jangka_Waktu)}</td>
      <td class="tc">${d.Volume || 1}</td>
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
 *
 * Logika mitra vs organik:
 *   - isPmlMitra = true  → PML yang dipilih adalah Mitra Lapangan → pakai template *-mitra.html
 *   - isPmlMitra = false → PML yang dipilih adalah Pegawai Organik BPS → pakai template *-organik.html
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

  // Cek apakah PML dipilih dari Mitra atau Pegawai Organik
  let isPmlMitra = false;
  let pmlObj     = null;

  // Opsi A: Jika record.PML diisi & beda dari ID_Mitra
  if (record.PML && String(record.PML).trim() !== "" && String(record.PML).trim() !== String(record.ID_Mitra).trim()) {
    const rawPml = String(record.PML).trim();
    const p = cariPegawai(rawPml, pegawaiArr);
    if (p) {
      isPmlMitra = false;
      pmlObj = {
        Nama_Pegawai: getPegawaiName(p),
        NIP:          getPegawaiNip(p),
        NIK:          getPegawaiNip(p),
        Jabatan:      p.Jabatan || "Pegawai BPS",
      };
    } else {
      const m = cariMitra(rawPml, mitraArr);
      if (m) {
        isPmlMitra = true;
        pmlObj = {
          Nama_Pegawai: getMitraName(m),
          NIP:          "",
          NIK:          m.NIK || getMitraId(m),
          Jabatan:      getMitraPosisi(m) || "Mitra Pemeriksa Lapangan",
        };
      } else {
        // Jika PML berupa string nama langsung
        isPmlMitra = false;
        pmlObj = {
          Nama_Pegawai: rawPml,
          NIP:          "",
          NIK:          "-",
          Jabatan:      "Pemeriksa Lapangan",
        };
      }
    }
  }

  // Opsi B: Jika record.PML kosong (misalnya dokumen ini adalah dokumen PML itu sendiri),
  // atau record.PML == record.ID_Mitra
  if (!pmlObj) {
    if (isPegawai) {
      const p = cariPegawai(record.ID_Mitra, pegawaiArr);
      if (p) {
        isPmlMitra = false;
        pmlObj = {
          Nama_Pegawai: getPegawaiName(p),
          NIP:          getPegawaiNip(p),
          NIK:          getPegawaiNip(p),
          Jabatan:      p.Jabatan || "Pegawai BPS",
        };
      }
    } else {
      const m = cariMitra(record.ID_Mitra, mitraArr);
      if (m) {
        isPmlMitra = true;
        pmlObj = {
          Nama_Pegawai: getMitraName(m),
          NIP:          "",
          NIK:          m.NIK || getMitraId(m),
          Jabatan:      getMitraPosisi(m) || "Mitra Pemeriksa Lapangan",
        };
      }
    }
  }

  const pml = pmlObj || {};
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

    // === Nomor Kepka & Tanggal ===
    NOMOR_KEPKA:  record.Nomor_Kepka || "",
    TANGGAL_KEPKA: tKepka.tanggalFormat,
  };

  // BAST PPL-PML context
  // isPmlMitra = true  → PML adalah Mitra Lapangan → template-bast-ppl-pml-mitra.html
  // isPmlMitra = false → PML adalah Pegawai Organik → template-bast-ppl-pml-organik.html
  const bastPplPmlCtx = {
    ...spkCtx,
    NO_BAST_PPL_PML:          record.No_BAST_PPL_PML || "",
    "NO_BAST_PPL-PML":        record.No_BAST_PPL_PML || "",
    HARI_TERBILANG:           tBAST_PPL_PML.hari,
    TANGGAL_TERBILANG:        tBAST_PPL_PML.tanggal,
    BULAN_TERBILANG:          tBAST_PPL_PML.bulan,
    TAHUN_TERBILANG:          tBAST_PPL_PML.tahun,
    TANGGAL_BAST:             tBAST_PPL_PML.tanggalFormat,
    TANGGAL_BAST_SM_PPK:      tBAST_PPL_PML.tanggalFormat,
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
  // isPmlMitra = true  → PML (Pihak Pertama) adalah Mitra Lapangan → template-bast-pml-sm-mitra.html (pakai NIK)
  // isPmlMitra = false → PML (Pihak Pertama) adalah Pegawai Organik → template-bast-pml-sm-organik.html (pakai NIP)
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
  };

  const smPpkCtx = buildBastSmPpkContext(record, pegawaiArr);

  return { spkCtx, bastPplPmlCtx, bastPplSmCtx, bastPmlSmCtx, smPpkCtx, details, totalHonor, terbilangHonor };
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
