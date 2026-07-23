// ============================================================
// DATA.JS — DUMMY DATA (Tahap Awal)
// Field names IDENTIK dengan kolom di Google Sheets/Excel.
// Swap ke /api/data nanti tidak perlu ubah kode form/render.
// ============================================================

const pegawai = [
  { Nama_Pegawai: "Adi Putra, SP",                       NIP: "197208131993011001", Jabatan: "Kepala BPS Kota Subulussalam",   Pangkat: "Pembina",          Golongan: "(IV/a)" },
  { Nama_Pegawai: "Erni Lusiani, S.Stat.",                NIP: "199604202019032003", Jabatan: "Kasubbag Umum",                Pangkat: "Penata",            Golongan: "(III/c)" },
  { Nama_Pegawai: "Arpian, SE",                           NIP: "198203282011011010", Jabatan: "Statistisi Ahli Muda",         Pangkat: "Penata TK.I",       Golongan: "(III/d)" },
  { Nama_Pegawai: "Arma Juwita, S.Tr.Stat",              NIP: "199602202019012001", Jabatan: "Statistisi Ahli Pertama",      Pangkat: "Penata Muda TK.I",  Golongan: "(III/b)" },
  { Nama_Pegawai: "Suciarti Pertiwi, S.Tr.Stat",         NIP: "199712012021042001", Jabatan: "Statistisi Ahli Pertama",      Pangkat: "Penata Muda TK.I",  Golongan: "(III/b)" },
  { Nama_Pegawai: "M. Thariq Alfatih, S.Tr.Stat",        NIP: "199809092022011002", Jabatan: "Statistisi Ahli Pertama",      Pangkat: "Penata Muda",       Golongan: "(III/a)" },
  { Nama_Pegawai: "Raden Daffa Ivan Febrio, S.Tr. Stat.",NIP: "200002202023021003", Jabatan: "Statistisi Ahli Pertama",      Pangkat: "Penata Muda",       Golongan: "(III/a)" },
  { Nama_Pegawai: "Tri Wahyudi, S.Stat",                 NIP: "199703012019031001", Jabatan: "Statistisi Ahli Pertama",      Pangkat: "Penata Muda TK.I",  Golongan: "(III/b)" },
];

const mitra = [
  { ID_Mitra: "M2026001", Kategori: "Kepka", Email: "Abdussalambako540@gmail.com",  Nama_Mitra: "Abdus salam",       NIK: "1175011210960001", Sobat_ID: "117523030040", Posisi: "Mitra Pendataan", Asal: "Simpang Kiri",  Alamat_Detail: "JL SYECH HAMZAH FANSURI",                                        Tanggal_Lahir: "1996-11-10", Jenis_Kelamin: "Lk", No_Telp: "62 857-6248-0561"  },
  { ID_Mitra: "M2026002", Kategori: "Kepka", Email: "ainunmardiah2604@gmail.com",    Nama_Mitra: "Ainun Mardiah",    NIK: "1175015604000001", Sobat_ID: "117523110039", Posisi: "Mitra Pendataan", Asal: "Simpang Kiri",  Alamat_Detail: "Jalan Hamzah Fansuri Kota Subulussalam",                         Tanggal_Lahir: "2000-04-26", Jenis_Kelamin: "Pr", No_Telp: "62 813-1356-4280"  },
  { ID_Mitra: "M2026003", Kategori: "Kepka", Email: "akbaraja288@gmail.com",          Nama_Mitra: "Ali Akbar",        NIK: "1175011612920001", Sobat_ID: "117523110024", Posisi: "Mitra Pendataan", Asal: "Simpang Kiri",  Alamat_Detail: "Jln. Syeh Hamzah Fansyuri, Desa Subulussalam Barat",            Tanggal_Lahir: "1992-12-16", Jenis_Kelamin: "Lk", No_Telp: "62 081-2601-43546" },
  { ID_Mitra: "M2026004", Kategori: "Kepka", Email: "arkamfda10@gmail.com",           Nama_Mitra: "Arika mufida",     NIK: "1175016010000001", Sobat_ID: "117525110033", Posisi: "Mitra Pendataan", Asal: "Simpang Kiri",  Alamat_Detail: "Lr Cikditiro No.15,Desa Subulussalam,Kecamatan Simpang Kiri",   Tanggal_Lahir: "2000-10-20", Jenis_Kelamin: "Pr", No_Telp: "62 822-1552-0338"  },
  { ID_Mitra: "M2026005", Kategori: "Kepka", Email: "aufamusfidah@gmail.com",         Nama_Mitra: "Aufa Musfidah",    NIK: "1101155412980001", Sobat_ID: "110323110421", Posisi: "Mitra Pendataan", Asal: "Simpang Kiri",  Alamat_Detail: "Desa pasar panjang, kec. Simpang kiri",                          Tanggal_Lahir: "1997-12-14", Jenis_Kelamin: "Pr", No_Telp: "62 822-1399-2258"  },
];

const kegiatan = [
  { ID_Kegiatan: "KEG001", Uraian_Tugas: "Pendataan SKTNP Tahap I 2026",                                           Satuan: "Dokumen", Harga_Satuan: 66000,  Beban_Anggaran: "2893.EBA.001.001.011.022.A.521213", Nama_Tim_Teknis: "" },
  { ID_Kegiatan: "KEG002", Uraian_Tugas: "Pengawasan SKTNP Tahap I 2026",                                          Satuan: "Dokumen", Harga_Satuan: 100000, Beban_Anggaran: "2893.EBA.001.001.011.022.A.521213", Nama_Tim_Teknis: "" },
  { ID_Kegiatan: "KEG003", Uraian_Tugas: "Pendataan Survei Harga Perdagangan Besar (SHPB) Bulanan Januari 2026",   Satuan: "Dokumen", Harga_Satuan: 48000,  Beban_Anggaran: "2895.EBA.001.001.B.521213",          Nama_Tim_Teknis: "" },
  { ID_Kegiatan: "KEG004", Uraian_Tugas: "Pemeriksaan Survei Harga Perdagangan Besar (SHPB) Bulanan Januari 2026", Satuan: "Dokumen", Harga_Satuan: 72000,  Beban_Anggaran: "2895.EBA.001.001.B.521213",          Nama_Tim_Teknis: "" },
  { ID_Kegiatan: "KEG009", Uraian_Tugas: "Pendataan Sektor Industri Pengolahan dan Pertambangan (HP) Januari 2026",Satuan: "Dokumen", Harga_Satuan: 48000,  Beban_Anggaran: "2896.EBA.001.001.B.521213",          Nama_Tim_Teknis: "" },
];

const spkBast = [
  {
    ID_Dokumen:             "DOC001",
    Tahun:                  2026,
    Bulan:                  "Januari",
    Jenis_Petugas:          "Mitra",
    ID_Mitra:               "M2026001",
    PML:                    "199712012021042001",   // NIP → lookup pegawai
    PPK:                    "199604202019032003",   // NIP → lookup pegawai
    Ketua_Tim:              "199712012021042001",   // NIP → lookup pegawai
    "Kepala/PLH":           "197208131993011001",   // NIP → lookup pegawai
    Nomor_Kepka:            "001/BPS-1172/I/2026",
    Tanggal_Kepka:          "2026-01-05",
    No_SPK:                 "SPK-001/BPS-1172/I/2026",
    Tanggal_SPK:            "2026-01-05",
    No_BAST_PPL_PML:        "BAST-PPL-PML-001/BPS-1172/I/2026",
    Tanggal_BAST_PPL_PML:   "2026-01-20",
    No_BAST_PPL_SM:         "BAST-PPL-SM-001/BPS-1172/I/2026",
    Tanggal_BAST_PPL_SM:    "2026-01-21",
    No_BAST_PML_SM:         "BAST-PML-SM-001/BPS-1172/I/2026",
    Tanggal_BAST_PML_SM:    "2026-01-22",
    Judul_Pekerjaan_Dokumen:"PENDATAAN SKTNP TAHAP I 2026",
    Tanggal_Mulai:          "2026-01-05",
    Tanggal_Selesai:        "2026-01-19",
    Batas_Penyerahan:       "2026-01-22",
    Total_Honor:            660000,
    Terbilang:              "Enam Ratus Enam Puluh Ribu Rupiah",
    Status_Generate_SPK:    "Sudah",
  },
  {
    ID_Dokumen:             "DOC002",
    Tahun:                  2026,
    Bulan:                  "Januari",
    Jenis_Petugas:          "Mitra",
    ID_Mitra:               "M2026002",
    PML:                    "199712012021042001",
    PPK:                    "199604202019032003",
    Ketua_Tim:              "199712012021042001",
    "Kepala/PLH":           "197208131993011001",
    Nomor_Kepka:            "001/BPS-1172/I/2026",
    Tanggal_Kepka:          "2026-01-05",
    No_SPK:                 "SPK-002/BPS-1172/I/2026",
    Tanggal_SPK:            "2026-01-05",
    No_BAST_PPL_PML:        "BAST-PPL-PML-002/BPS-1172/I/2026",
    Tanggal_BAST_PPL_PML:   "2026-01-20",
    No_BAST_PPL_SM:         "BAST-PPL-SM-002/BPS-1172/I/2026",
    Tanggal_BAST_PPL_SM:    "2026-01-21",
    No_BAST_PML_SM:         "BAST-PML-SM-002/BPS-1172/I/2026",
    Tanggal_BAST_PML_SM:    "2026-01-22",
    Judul_Pekerjaan_Dokumen:"PENDATAAN SKTNP TAHAP I 2026",
    Tanggal_Mulai:          "2026-01-05",
    Tanggal_Selesai:        "2026-01-19",
    Batas_Penyerahan:       "2026-01-22",
    Total_Honor:            480000,
    Terbilang:              "Empat Ratus Delapan Puluh Ribu Rupiah",
    Status_Generate_SPK:    "Belum",
  },
  {
    ID_Dokumen:             "DOC003",
    Tahun:                  2026,
    Bulan:                  "Februari",
    Jenis_Petugas:          "Mitra",
    ID_Mitra:               "M2026003",
    PML:                    "199712012021042001",
    PPK:                    "199604202019032003",
    Ketua_Tim:              "199712012021042001",
    "Kepala/PLH":           "197208131993011001",
    Nomor_Kepka:            "002/BPS-1172/II/2026",
    Tanggal_Kepka:          "2026-02-03",
    No_SPK:                 "SPK-001/BPS-1172/II/2026",
    Tanggal_SPK:            "2026-02-03",
    No_BAST_PPL_PML:        "BAST-PPL-PML-001/BPS-1172/II/2026",
    Tanggal_BAST_PPL_PML:   "2026-02-18",
    No_BAST_PPL_SM:         "BAST-PPL-SM-001/BPS-1172/II/2026",
    Tanggal_BAST_PPL_SM:    "2026-02-19",
    No_BAST_PML_SM:         "BAST-PML-SM-001/BPS-1172/II/2026",
    Tanggal_BAST_PML_SM:    "2026-02-20",
    Judul_Pekerjaan_Dokumen:"PENDATAAN SHPB BULANAN FEBRUARI 2026",
    Tanggal_Mulai:          "2026-02-03",
    Tanggal_Selesai:        "2026-02-17",
    Batas_Penyerahan:       "2026-02-20",
    Total_Honor:            528000,
    Terbilang:              "Lima Ratus Dua Puluh Delapan Ribu Rupiah",
    Status_Generate_SPK:    "Belum",
  },
];

const detailPekerjaan = [
  // DOC001 — Abdus salam
  { ID_Detail: "D001", ID_Dokumen: "DOC001", No_Urut: 1, ID_Kegiatan: "KEG001", Uraian_Tugas: "Pendataan SKTNP Tahap I 2026",   Buku_Pedoman: "Buku Pedoman Pewawancara SKTNP 2026", Jangka_Waktu: "5 Jan – 19 Jan 2026", Volume: 10, Satuan: "Dokumen", Harga_Satuan: 66000, Nilai_Perjanjian: 660000, Beban_Anggaran: "2893.EBA.001.001.011.022.A.521213" },
  // DOC002 — Ainun Mardiah
  { ID_Detail: "D002", ID_Dokumen: "DOC002", No_Urut: 1, ID_Kegiatan: "KEG001", Uraian_Tugas: "Pendataan SKTNP Tahap I 2026",   Buku_Pedoman: "Buku Pedoman Pewawancara SKTNP 2026", Jangka_Waktu: "5 Jan – 19 Jan 2026", Volume: 8,  Satuan: "Dokumen", Harga_Satuan: 60000, Nilai_Perjanjian: 480000, Beban_Anggaran: "2893.EBA.001.001.011.022.A.521213" },
  // DOC003 — Ali Akbar (2 baris)
  { ID_Detail: "D003", ID_Dokumen: "DOC003", No_Urut: 1, ID_Kegiatan: "KEG003", Uraian_Tugas: "Pendataan SHPB Bulanan Februari 2026",  Buku_Pedoman: "Buku Pedoman SHPB 2026", Jangka_Waktu: "3 Feb – 17 Feb 2026", Volume: 7, Satuan: "Dokumen", Harga_Satuan: 48000, Nilai_Perjanjian: 336000, Beban_Anggaran: "2895.EBA.001.001.B.521213" },
  { ID_Detail: "D004", ID_Dokumen: "DOC003", No_Urut: 2, ID_Kegiatan: "KEG009", Uraian_Tugas: "Pendataan Sektor Industri Pengolahan dan Pertambangan (HP) Februari 2026", Buku_Pedoman: "Buku Pedoman HP 2026", Jangka_Waktu: "3 Feb – 17 Feb 2026", Volume: 4, Satuan: "Dokumen", Harga_Satuan: 48000, Nilai_Perjanjian: 192000, Beban_Anggaran: "2896.EBA.001.001.B.521213" },
];

const bastSmPpk = [
  {
    ID_BAST_SM_PPK:           "BAST-SM-PPK-001/2026",
    Tahun:                    2026,
    Bulan:                    "Januari",
    Uraian_Tugas:             "PENDATAAN SKTNP TAHAP I 2026",
    PPK:                      "199604202019032003",
    Ketua_Tim:                "199712012021042001",
    "Kepala/Plh":             "197208131993011001",
    No_BAST_SM_PPK:           "BAST-SM-PPK-001/BPS-1172/I/2026",
    Judul_Pekerjaan_Dokumen:  "PENDATAAN SKTNP TAHAP I 2026",
    Total_Honor:              1140000,
    Terbilang:                "Satu Juta Seratus Empat Puluh Ribu Rupiah",
  }
];

const parameter = {
  NAMA_KANTOR:          "BPS Kota Subulussalam",
  ALAMAT_KANTOR:        "Jl. Raja Tua Lae Oram Komplek Perkantoran Walikota Subulussalam",
  TAHUN_AKTIF:          2026,
  BATAS_HONOR_MAKSIMUM: 3500000,
};
