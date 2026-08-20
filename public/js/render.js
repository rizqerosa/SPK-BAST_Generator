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
 * Bangun judul pekerjaan dokumen lengkap dengan periode yang sesuai (Bulan/Triwulan/Tahap/Subround/Semester/Tahun).
 */
function buildJudulDenganPeriode(record, details = []) {
  const d0 = details.length > 0 ? details[0] : {};
  const rawJudul = (record.Judul_Pekerjaan_Dokumen || record.Uraian_Tugas || d0.Uraian_Tugas || "").trim();
  if (!rawJudul) return "";

  const tipePeriode = String(record.Tipe_Periode || record.tipePeriode || d0.Tipe_Periode || d0.tipePeriode || "").toLowerCase().trim();
  const subroundVal = record.Subround || d0.Subround || "";
  const semesterVal = record.Semester || d0.Semester || "";
  const triwulanVal = record.Triwulan || d0.Triwulan || "";
  const tahapVal    = record.Tahap    || d0.Tahap    || "";
  const bulanVal    = record.Bulan    || d0.Bulan    || "";
  const tahunVal    = record.Tahun    || d0.Tahun    || (record.Tanggal_SPK ? new Date(record.Tanggal_SPK).getFullYear() : (record.Tanggal ? new Date(record.Tanggal).getFullYear() : ""));

  const periodeInfoParts = [];

  if (tipePeriode === "subround" && subroundVal) {
    periodeInfoParts.push(`Subround ${subroundVal}`);
  } else if (tipePeriode === "semester" && semesterVal) {
    periodeInfoParts.push(`Semester ${semesterVal}`);
  } else if (tipePeriode === "triwulan" && triwulanVal) {
    periodeInfoParts.push(`Triwulan ${triwulanVal}`);
  } else if (tipePeriode === "tahap" && tahapVal) {
    periodeInfoParts.push(`Tahap ${tahapVal}`);
  } else if (tipePeriode === "bulan" && bulanVal) {
    periodeInfoParts.push(`Bulan ${bulanVal}`);
  } else {
    // Fallback cerdas: jika tidak ada tipePeriode eksplisit
    const rawLower = rawJudul.toLowerCase();
    if (tahapVal && (rawLower.includes("tahap") || !bulanVal)) {
      periodeInfoParts.push(`Tahap ${tahapVal}`);
    } else if (semesterVal && (rawLower.includes("semester") || !bulanVal)) {
      periodeInfoParts.push(`Semester ${semesterVal}`);
    } else if (subroundVal && (rawLower.includes("subround") || rawLower.includes("ksa") || (!bulanVal && !triwulanVal))) {
      periodeInfoParts.push(`Subround ${subroundVal}`);
    } else if (triwulanVal && (rawLower.includes("triwulan") || !bulanVal)) {
      periodeInfoParts.push(`Triwulan ${triwulanVal}`);
    } else if (bulanVal) {
      periodeInfoParts.push(`Bulan ${bulanVal}`);
    } else if (subroundVal && !triwulanVal) {
      periodeInfoParts.push(`Subround ${subroundVal}`);
    } else if (triwulanVal) {
      periodeInfoParts.push(`Triwulan ${triwulanVal}`);
    }
  }

  if (tahunVal) {
    periodeInfoParts.push(`Tahun ${tahunVal}`);
  }

  let judulFinal = rawJudul;
  if (periodeInfoParts.length > 0) {
    const periodeStr = periodeInfoParts.join(" ");
    const rawLower = rawJudul.toLowerCase();

    // Jangan duplikasi jika rawJudul sudah menyebutkan periode terkait
    const hasPeriodeAlready =
      rawLower.includes(periodeStr.toLowerCase()) ||
      rawLower.includes("subround") ||
      rawLower.includes("semester") ||
      rawLower.includes("triwulan") ||
      rawLower.includes("tahap") ||
      (bulanVal && rawLower.includes(String(bulanVal).toLowerCase()));

    if (!hasPeriodeAlready) {
      judulFinal = (rawJudul + " " + periodeStr).trim();
    }
  }

  return judulFinal;
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
        Asal: "BPS Kota Subulussalam",
        _isOrganik: true
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
  let details  = getDetailByDokumen(detailArr, record.ID_Dokumen);

  if ((!details || details.length === 0) && (record.Judul_Pekerjaan_Dokumen || record.Total_Honor)) {
    const jw = (record.Tanggal_Mulai && record.Tanggal_Selesai)
      ? `${formatTanggal(record.Tanggal_Mulai)} s.d. ${formatTanggal(record.Tanggal_Selesai)}`
      : (record.Tanggal_Mulai || record.Tanggal_Selesai || "-");
    details = [{
      No_Urut: 1,
      Uraian_Tugas: record.Judul_Pekerjaan_Dokumen || "Pendataan Lapangan",
      Jangka_Waktu: jw,
      Volume: 1,
      Satuan: "Dokumen",
      Harga_Satuan: Number(record.Total_Honor) || 0,
      Nilai_Perjanjian: Number(record.Total_Honor) || 0,
      Beban_Anggaran: record.Beban_Anggaran || "BPS Kota Subulussalam"
    }];
  }

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

  // === Helper: Build judul & uraian pekerjaan dengan periode ===
  const judulDenganPeriode = buildJudulDenganPeriode(record, details);

  // === Helper: Clean NO_SPK — strip "Nomor" prefix, uppercase ===
  let cleanNoSpk = record.Nomor_SPK || record.No_SPK || "";
  cleanNoSpk = cleanNoSpk.replace(/^\s*nomor\s+/i, "").toUpperCase();

  // === Helper: URAIAN_PEKERJAAN lowercase (bersihkan awalan 'hasil ' jika ada, dan sertakan periode) ===
  let cleanUraian = judulDenganPeriode;
  if (cleanUraian.toLowerCase().startsWith("hasil ")) {
    cleanUraian = cleanUraian.substring(6).trim();
  }
  const uraianPekerjaanLower = cleanUraian.toLowerCase();

  // === Helper: Parse tanggal SPK into components ===
  const _parseDateComponents = (tglObj) => {
    // tglObj is from tanggalTerbilang() → { hari, tanggal, bulan, tahun, tanggalFormat: "dd-mm-yyyy" }
    const fmt = tglObj.tanggalFormat || "";
    const fParts = fmt.split("-");
    return {
      angka: fParts[0] || "-",   // dd
      bulanNama: tglObj.bulan || "-", // nama bulan
      tahunAngka: fParts[2] || (fParts.length >= 3 ? fParts[2] : "-"), // yyyy
    };
  };
  const spkDateParts = _parseDateComponents(tSPK);

  // === Helper: Jabatan petugas di lapangan (organik override) ===
  // Untuk petugas organik di BAST, jabatan = jabatan lapangan, bukan jabatan database
  const peranPetugas = (record.No_BAST_PML_SM && !record.No_BAST_PPL_PML && !record.No_BAST_PPL_SM) ? "pml" : "ppl";
  let jabatanPetugasLapangan = mitra.Posisi || "Mitra Pendataan";
  if (isPegawai || mitra._isOrganik) {
    jabatanPetugasLapangan = peranPetugas === "pml" ? "Petugas Pengawas Lapangan" : "Petugas Pencacah Lapangan";
  }

  // SPK context (tanggal SPK dipakai)
  const spkCtx = {
    // === Header & nomor ===
    JUDUL_PEKERJAAN_DOKUMEN: judulDenganPeriode,
    NO_SPK:                  cleanNoSpk,
    URAIAN_PEKERJAAN:        uraianPekerjaanLower,

    // === Tanggal SPK (terbilang) ===
    HARI_TERBILANG:   tSPK.hari,
    TANGGAL_TERBILANG:tSPK.tanggal,
    BULAN_TERBILANG:  tSPK.bulan,
    TAHUN_TERBILANG:  tSPK.tahun,
    TANGGAL_BAST:     tSPK.tanggalFormat,
    TANGGAL:          tSPK.tanggalFormat,
    BULAN:            tSPK.bulan,
    TAHUN:            String(record.Tahun || ""),
    // Komponen tanggal terpisah (untuk BAST: "tanggal xx, bulan yy, tahun zzzz")
    TANGGAL_ANGKA:    spkDateParts.angka,
    BULAN_NAMA:       spkDateParts.bulanNama,
    TAHUN_ANGKA:      spkDateParts.tahunAngka,

    // === PPK (Pihak Pertama SPK) ===
    NAMA_PPK:              ppk.Nama_Pegawai || "",
    NIP_PPK:               ppk.NIP || "",
    "GOLONGAN/PANGKAT_PPK": `${ppk.Pangkat || ""} ${ppk.Golongan || ""}`.trim(),

    // === Mitra/PPL (Pihak Kedua SPK) ===
    NAMA_PETUGAS:      mitra.Nama_Mitra || "",
    NAMA_PIHAK_KEDUA:  mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA: mitra.NIK || "",   // di BAST PPL adalah pihak pertama
    JABATAN_PETUGAS:   jabatanPetugasLapangan,
    JABATAN_PIHAK_KEDUA: jabatanPetugasLapangan,
    JABATAN_PIHAK_PERTAMA: jabatanPetugasLapangan,
    NAMA_PIHAK_PERTAMA: ppk.Nama_Pegawai || "",  // SPK: pihak pertama = PPK
    ASAL:              mitra.Asal || "",

    // === Honor ===
    TOTAL_HONOR:            formatRupiah(totalHonor),
    TERBILANG_TOTAL_HONOR:  terbilangHonor,
    TERBILANG:              terbilangHonor,

    // === Tanggal selesai & batas ===
    TANGGAL_SELESAI:    formatTanggal(record.Tanggal_Selesai),
    BATAS_PENYERAHAN:   formatTanggal(record.Batas_Penyerahan || record.Batas_Penyerahan_Telat),

    // === Tabel lampiran SPK ===
    TABEL_LAMPIRAN_ROWS: tabelRows,

    // === Buku pedoman (ambil dari detail pertama) ===
    BUKU_PEDOMAN: details.length > 0 ? details[0].Buku_Pedoman : "",
    BEBAN_ANGGARAN: details.length > 0 ? details[0].Beban_Anggaran : "",

    // === Nomor Kepka & Tanggal ===
    NOMOR_KEPKA:  (record.Nomor_Kepka || "").replace(/^\s*nomor\s+/i, "").trim(),
    TANGGAL_KEPKA: tKepka.tanggalFormat,
  };

  // BAST PPL-PML context
  // isPmlMitra = true  → PML adalah Mitra Lapangan → template-bast-ppl-pml-mitra.html
  // isPmlMitra = false → PML adalah Pegawai Organik → template-bast-ppl-pml-organik.html
  const bastPplPmlDateParts = _parseDateComponents(tBAST_PPL_PML);
  // Jabatan PML di BAST: organik → "Petugas Pengawas Lapangan", mitra → dari database
  const jabatanPmlBast = isPmlMitra ? (pml.Jabatan || "Mitra Pemeriksa Lapangan") : "Petugas Pengawas Lapangan";
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
    // Komponen tanggal BAST terpisah
    TANGGAL_ANGKA:            bastPplPmlDateParts.angka,
    BULAN_NAMA:               bastPplPmlDateParts.bulanNama,
    TAHUN_ANGKA:              bastPplPmlDateParts.tahunAngka,
    // BAST PPL-PML: Pihak Pertama = Mitra/PPL, Pihak Kedua = PML
    NAMA_PIHAK_PERTAMA:       mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA:        mitra.NIK || "",
    JABATAN_PIHAK_PERTAMA:    jabatanPetugasLapangan,
    NAMA_PIHAK_KEDUA:         pml.Nama_Pegawai || "",
    NIP_PIHAK_KEDUA:          isPmlMitra ? "" : (pml.NIP || ""),
    NIK_PIHAK_KEDUA:          pml.NIK || pml.NIP || "",
    NIK_NIP_PIHAK_KEDUA:      isPmlMitra ? "" : (pml.NIP || ""),
    JABATAN_PIHAK_KEDUA:      jabatanPmlBast,
    NOMOR_KEPKA:              record.Nomor_Kepka || "",
    TANGGAL_KEPKA:            tKepka.tanggalFormat,
    TANGGAL:                  spkDateParts.angka,
    BULAN:                    spkDateParts.bulanNama,
    TAHUN:                    spkDateParts.tahunAngka,
    IS_PML_MITRA:             isPmlMitra,
  };

  // BAST PPL-SM context
  const bastPplSmDateParts = _parseDateComponents(tBAST_PPL_SM);
  const bastPplSmCtx = {
    ...spkCtx,
    NO_BAST_PPL_SM:           record.No_BAST_PPL_SM || "",
    HARI_TERBILANG:           tBAST_PPL_SM.hari,
    TANGGAL_TERBILANG:        tBAST_PPL_SM.tanggal,
    BULAN_TERBILANG:          tBAST_PPL_SM.bulan,
    TAHUN_TERBILANG:          tBAST_PPL_SM.tahun,
    TANGGAL_BAST:             tBAST_PPL_SM.tanggalFormat,
    TANGGAL_BAST_SM_PPK:      tBAST_PPL_SM.tanggalFormat,
    // Komponen tanggal BAST terpisah
    TANGGAL_ANGKA:            bastPplSmDateParts.angka,
    BULAN_NAMA:               bastPplSmDateParts.bulanNama,
    TAHUN_ANGKA:              bastPplSmDateParts.tahunAngka,
    // Pihak Pertama = Mitra/PPL
    NAMA_PIHAK_PERTAMA:       mitra.Nama_Mitra || "",
    NIK_PIHAK_PERTAMA:        mitra.NIK || "",
    JABATAN_PIHAK_PERTAMA:    jabatanPetugasLapangan,
    // Pihak Kedua = Ketua Tim/SM
    NAMA_KETUA_TIM:           ketuaTim.Nama_Pegawai || "",
    NIP_KETUA_TIM:            ketuaTim.NIP || "",
    "GOLONGAN/PANGKAT_KETUA_TIM": `${ketuaTim.Pangkat || ""} ${ketuaTim.Golongan || ""}`.trim(),
    JABATAN_KETUA_TIM:        ketuaTim.Jabatan || "",
    NOMOR_KEPKA:              record.Nomor_Kepka || "",
    TANGGAL_KEPKA:            tKepka.tanggalFormat,
    TANGGAL:                  spkDateParts.angka,
    BULAN:                    spkDateParts.bulanNama,
    TAHUN:                    spkDateParts.tahunAngka,
  };

  // BAST PML-SM context
  // isPmlMitra = true  → PML (Pihak Pertama) adalah Mitra Lapangan → template-bast-pml-sm-mitra.html (pakai NIK)
  // isPmlMitra = false → PML (Pihak Pertama) adalah Pegawai Organik → template-bast-pml-sm-organik.html (pakai NIP)
  const bastPmlSmDateParts = _parseDateComponents(tBAST_PML_SM);
  const bastPmlSmCtx = {
    ...bastPplSmCtx,
    NO_BAST_PML_SM:           record.No_BAST_PML_SM || "",
    HARI_TERBILANG:           tBAST_PML_SM.hari,
    TANGGAL_TERBILANG:        tBAST_PML_SM.tanggal,
    BULAN_TERBILANG:          tBAST_PML_SM.bulan,
    TAHUN_TERBILANG:          tBAST_PML_SM.tahun,
    TANGGAL_BAST:             tBAST_PML_SM.tanggalFormat,
    TANGGAL_BAST_SM_PPK:      tBAST_PML_SM.tanggalFormat,
    // Komponen tanggal BAST terpisah
    TANGGAL_ANGKA:            bastPmlSmDateParts.angka,
    BULAN_NAMA:               bastPmlSmDateParts.bulanNama,
    TAHUN_ANGKA:              bastPmlSmDateParts.tahunAngka,
    // Pihak Pertama = PML
    NAMA_PIHAK_PERTAMA:       pml.Nama_Pegawai || "",
    NIK_PIHAK_PERTAMA:        pml.NIK || pml.NIP || "",
    NIP_PIHAK_PERTAMA:        isPmlMitra ? "" : (pml.NIP || ""),
    JABATAN_PIHAK_PERTAMA:    jabatanPmlBast,
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

  // Parse date components
  const fmt = tBAST.tanggalFormat || "";
  const fParts = fmt.split("-");
  const smPpkAngka = fParts[0] || "-";
  const smPpkBulan = tBAST.bulan || "-";
  const smPpkTahun = fParts[2] || (fParts.length >= 3 ? fParts[2] : "-");

  // Build judul dengan periode
  const judulDenganPeriode = buildJudulDenganPeriode(record);

  // URAIAN_PEKERJAAN lowercase (bersihkan 'hasil ' jika ada)
  let cleanUraian = judulDenganPeriode;
  if (cleanUraian.toLowerCase().startsWith("hasil ")) {
    cleanUraian = cleanUraian.substring(6).trim();
  }
  const uraianLower = cleanUraian.toLowerCase();

  // Clean NO_SPK
  let cleanNoSpk = record.Nomor_SPK || record.No_SPK || "";
  cleanNoSpk = cleanNoSpk.replace(/^\s*nomor\s+/i, "").toUpperCase();

  return {
    JUDUL_PEKERJAAN_DOKUMEN:   judulDenganPeriode,
    NO_SPK:                    cleanNoSpk,
    NO_BAST_SM_PPK:            record.No_BAST_SM_PPK || "",
    "NO_BAST_SM-PPK":          record.No_BAST_SM_PPK || "",
    HARI_TERBILANG:            tBAST.hari,
    TANGGAL_TERBILANG:         tBAST.tanggal,
    BULAN_TERBILANG:           tBAST.bulan,
    TAHUN_TERBILANG:           tBAST.tahun,
    TANGGAL_BAST:              tBAST.tanggalFormat,
    // Komponen tanggal terpisah
    TANGGAL_ANGKA:             smPpkAngka,
    BULAN_NAMA:                smPpkBulan,
    TAHUN_ANGKA:               smPpkTahun,
    TANGGAL:                   smPpkAngka,
    BULAN:                     smPpkBulan,
    TAHUN:                     smPpkTahun,
    URAIAN_PEKERJAAN:          uraianLower,
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
