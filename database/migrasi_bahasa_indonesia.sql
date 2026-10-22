-- Migrasi nama tabel dan kolom aplikasi; dapat dijalankan ulang.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  nama_tabel RECORD;
  tabel_lama_ada BOOLEAN;
  tabel_baru_ada BOOLEAN;
BEGIN
  FOR nama_tabel IN
    SELECT * FROM (VALUES
      ('books', 'buku'),
      ('acquisition_sources', 'sumber_perolehan'),
      ('acquisitions', 'akuisisi'),
      ('collection_bindings', 'jilid_koleksi'),
      ('periodical_titles', 'judul_terbitan_berkala'),
      ('periodical_issues', 'edisi_terbitan_berkala'),
      ('collection_proposals', 'usulan_koleksi'),
      ('acquisition_shipments', 'pengiriman_koleksi'),
      ('acquisition_shipment_items', 'rincian_pengiriman_koleksi'),
      ('catalog_records', 'katalog'),
      ('catalog_digital_contents', 'konten_digital_katalog'),
      ('catalog_hidden_books', 'buku_tidak_tampil_di_katalog'),
      ('catalog_articles', 'artikel_katalog'),
      ('publications', 'publikasi'),
      ('service_requests', 'permohonan_layanan'),
      ('member_types', 'jenis_anggota'),
      ('members', 'anggota'),
      ('membership_donations', 'sumbangan_anggota'),
      ('membership_renewals', 'perpanjangan_anggota'),
      ('member_basket', 'keranjang_anggota'),
      ('surveys', 'survei'),
      ('circulation_loans', 'peminjaman'),
      ('circulation_renewals', 'perpanjangan_peminjaman'),
      ('circulation_returns', 'pengembalian'),
      ('circulation_reservations', 'reservasi_koleksi'),
      ('stock_opname_projects', 'proyek_stok_opname'),
      ('circulation_violations', 'pelanggaran_sirkulasi'),
      ('ready_service_collections', 'koleksi_siap_layan'),
      ('lockers', 'loker'),
      ('locker_loans', 'peminjaman_loker'),
      ('locker_returns', 'pengembalian_loker')
    ) AS pemetaan(nama_lama, nama_baru)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = nama_tabel.nama_lama
        AND table_type = 'BASE TABLE'
    ) INTO tabel_lama_ada;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = nama_tabel.nama_baru
        AND table_type = 'BASE TABLE'
    ) INTO tabel_baru_ada;

    IF tabel_lama_ada AND tabel_baru_ada THEN
      RAISE EXCEPTION 'Tabel lama "%" dan tabel baru "%" sama-sama ada; migrasi dibatalkan agar data tidak tercampur.',
        nama_tabel.nama_lama, nama_tabel.nama_baru;
    ELSIF tabel_lama_ada THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I',
        nama_tabel.nama_lama, nama_tabel.nama_baru);
    END IF;
  END LOOP;
END $$;

DO $migrasi_kolom$
DECLARE
  kolom RECORD;
BEGIN
  FOR kolom IN
    SELECT c.table_name, p.nama_lama, p.nama_baru
    FROM information_schema.columns c
    JOIN (VALUES
      ('book_id', 'id_buku'),
      ('source_id', 'id_sumber_perolehan'),
      ('record_type', 'jenis_rekaman'),
      ('accession_no', 'nomor_induk'),
      ('barcode', 'kode_batang'),
      ('acquisition_date', 'tanggal_perolehan'),
      ('quantity', 'jumlah'),
      ('physical_form', 'bentuk_fisik'),
      ('access_type', 'jenis_akses'),
      ('location', 'lokasi'),
      ('lifecycle_status', 'status_koleksi'),
      ('rda_metadata', 'metadata_rda'),
      ('created_at', 'waktu_dibuat'),
      ('updated_at', 'waktu_diperbarui'),
      ('title', 'judul'),
      ('author', 'pengarang'),
      ('publisher', 'penerbit'),
      ('publication_year', 'tahun_terbit'),
      ('material_type', 'jenis_bahan'),
      ('category', 'kategori'),
      ('subject', 'subjek'),
      ('call_number', 'nomor_panggil'),
      ('shelf_location', 'lokasi_rak'),
      ('description', 'deskripsi'),
      ('cover_url', 'url_sampul'),
      ('total_copies', 'total_eksemplar'),
      ('available_copies', 'eksemplar_tersedia'),
      ('loan_count', 'jumlah_peminjaman'),
      ('name', 'nama'),
      ('address', 'alamat'),
      ('phone', 'telepon'),
      ('exemplar_count', 'jumlah_eksemplar'),
      ('binding_year', 'tahun_jilid'),
      ('volume_number', 'nomor_jilid'),
      ('publication_place', 'tempat_terbit'),
      ('periodical_id', 'id_terbitan_berkala'),
      ('issue_number', 'nomor_edisi'),
      ('publication_date', 'tanggal_terbit'),
      ('received_date', 'tanggal_diterima'),
      ('copies', 'eksemplar'),
      ('requester', 'pengusul'),
      ('member_number', 'nomor_anggota'),
      ('requested_at', 'waktu_diusulkan'),
      ('destination', 'tujuan'),
      ('sent_at', 'waktu_dikirim'),
      ('shipment_id', 'id_pengiriman'),
      ('acquisition_id', 'id_akuisisi'),
      ('subtitle', 'anak_judul'),
      ('responsibility', 'pernyataan_tanggung_jawab'),
      ('creator', 'pencipta'),
      ('edition', 'edisi'),
      ('publication_statement', 'pernyataan_penerbitan'),
      ('physical_description', 'deskripsi_fisik'),
      ('digital_content_url', 'url_konten_digital'),
      ('marc_data', 'data_marc'),
      ('rda_data', 'data_rda'),
      ('catalog_record_id', 'id_katalog'),
      ('file_name', 'nama_berkas'),
      ('mime_type', 'tipe_mime'),
      ('file_size', 'ukuran_berkas'),
      ('file_data', 'data_berkas'),
      ('uploaded_at', 'waktu_diunggah'),
      ('hidden_at', 'waktu_disembunyikan'),
      ('serial_edition', 'edisi_terbitan_berkala'),
      ('catalog_title', 'judul_katalog'),
      ('authors', 'para_penulis'),
      ('journal', 'jurnal'),
      ('ranking', 'peringkat'),
      ('volume_info', 'informasi_volume'),
      ('keywords', 'kata_kunci'),
      ('abstract', 'abstrak'),
      ('file_url', 'url_berkas'),
      ('full_name', 'nama_lengkap'),
      ('service_type', 'jenis_layanan'),
      ('message', 'pesan'),
      ('member_type_id', 'id_jenis_anggota'),
      ('identity_type', 'jenis_identitas'),
      ('identity_number', 'nomor_identitas'),
      ('birth_place', 'tempat_lahir'),
      ('birth_date', 'tanggal_lahir'),
      ('gender', 'jenis_kelamin'),
      ('province', 'provinsi'),
      ('city', 'kota'),
      ('district', 'kecamatan'),
      ('village', 'kelurahan_desa'),
      ('current_address', 'alamat_sekarang'),
      ('current_province', 'provinsi_sekarang'),
      ('current_city', 'kota_sekarang'),
      ('work_unit', 'unit_kerja'),
      ('faculty', 'fakultas'),
      ('department', 'jurusan'),
      ('study_program', 'program_studi'),
      ('registration_date', 'tanggal_pendaftaran'),
      ('expiry_date', 'tanggal_berakhir'),
      ('registration_fee', 'biaya_pendaftaran'),
      ('member_id', 'id_anggota'),
      ('amount', 'jumlah_sumbangan'),
      ('donation_date', 'tanggal_sumbangan'),
      ('fee', 'biaya'),
      ('renewal_date', 'tanggal_perpanjangan'),
      ('added_at', 'waktu_ditambahkan'),
      ('start_date', 'tanggal_mulai'),
      ('end_date', 'tanggal_selesai'),
      ('sequence_number', 'nomor_urut'),
      ('respondent_count', 'jumlah_responden'),
      ('transaction_number', 'nomor_transaksi'),
      ('loan_date', 'tanggal_peminjaman'),
      ('due_date', 'tanggal_jatuh_tempo'),
      ('returned_at', 'tanggal_dikembalikan'),
      ('renewal_count', 'jumlah_perpanjangan'),
      ('loan_id', 'id_peminjaman'),
      ('previous_due_date', 'tanggal_jatuh_tempo_lama'),
      ('new_due_date', 'tanggal_jatuh_tempo_baru'),
      ('return_date', 'tanggal_pengembalian'),
      ('late_days', 'hari_keterlambatan'),
      ('reservation_date', 'tanggal_reservasi'),
      ('project_name', 'nama_proyek'),
      ('year', 'tahun'),
      ('coordinator', 'koordinator'),
      ('note', 'catatan'),
      ('violation_type', 'jenis_pelanggaran'),
      ('fine', 'denda'),
      ('suspension_days', 'hari_penangguhan'),
      ('responsible', 'penanggung_jawab'),
      ('verified_at', 'waktu_diverifikasi'),
      ('locker_number', 'nomor_loker'),
      ('is_active', 'aktif'),
      ('locker_id', 'id_loker'),
      ('guarantee_type', 'jenis_jaminan'),
      ('guarantee_note', 'catatan_jaminan'),
      ('violation', 'pelanggaran'),
      ('locker_loan_id', 'id_peminjaman_loker')
    ) AS p(nama_lama, nama_baru) ON c.column_name = p.nama_lama
    WHERE c.table_schema = 'public' AND c.table_name IN (
      'akuisisi',
      'anggota',
      'artikel_katalog',
      'buku',
      'buku_tidak_tampil_di_katalog',
      'edisi_terbitan_berkala',
      'jenis_anggota',
      'jilid_koleksi',
      'judul_terbitan_berkala',
      'katalog',
      'keranjang_anggota',
      'koleksi_siap_layan',
      'konten_digital_katalog',
      'loker',
      'pelanggaran_sirkulasi',
      'peminjaman',
      'peminjaman_loker',
      'pengembalian',
      'pengembalian_loker',
      'pengiriman_koleksi',
      'permohonan_layanan',
      'perpanjangan_anggota',
      'perpanjangan_peminjaman',
      'proyek_stok_opname',
      'publikasi',
      'reservasi_koleksi',
      'rincian_pengiriman_koleksi',
      'sumbangan_anggota',
      'sumber_perolehan',
      'survei',
      'usulan_koleksi'
    )
    ORDER BY c.table_name, c.ordinal_position
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = kolom.table_name
        AND column_name = kolom.nama_baru
    ) THEN
      RAISE EXCEPTION 'Kolom %.% dan % sudah ada; migrasi dibatalkan untuk menjaga data.',
        kolom.table_name, kolom.nama_lama, kolom.nama_baru;
    END IF;
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      kolom.table_name, kolom.nama_lama, kolom.nama_baru);
  END LOOP;
END $migrasi_kolom$;

COMMIT;
