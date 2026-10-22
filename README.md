# Portal Perpustakaan Politeknik Sinar Mas Berau Coal

Portal ini memakai frontend HTML/JavaScript, API Express, dan PostgreSQL.

## Database lokal proyek di Linux

Workspace ini sudah disiapkan dengan database baru `db_perpustakaan` pada `127.0.0.1:5433` dan role `postgres`. Password koneksi disimpan di `backend/.env`. Instance ini dikelola oleh user Linux yang menyiapkannya dan hanya menerima koneksi dari komputer lokal.

Setelah komputer direstart, nyalakan PostgreSQL lokal, lalu jalankan aplikasi dari folder `Library_Poltek`:

```bash
npm run db:start --prefix backend
npm run dev --prefix backend
```

Periksa status dengan `npm run db:status --prefix backend`, atau hentikan database dengan `npm run db:stop --prefix backend` setelah aplikasi ditutup. Data disimpan di `.local-postgres/` dan tidak masuk Git. Perintah tersebut mengelola instance yang sudah dibuat di komputer ini; untuk komputer baru, gunakan panduan setup berikut. Jika memakai instalasi PostgreSQL biasa, sesuaikan `PGPORT` di `backend/.env` dengan port server tersebut, umumnya `5432`.

## Menyiapkan database di komputer baru

Pastikan PostgreSQL sudah terpasang dan perintah `psql` tersedia. Dari folder utama proyek, jalankan:

```bash
psql -h localhost -U postgres -d postgres -f database/setup.sql
```

Ganti `postgres` dengan role administrator PostgreSQL di komputer tersebut bila namanya berbeda. Skrip membuat database `db_perpustakaan` jika belum ada, lalu membuat tabel dan mengisi data contoh. Tabel aplikasi menggunakan nama Bahasa Indonesia, misalnya `buku`, `anggota`, `peminjaman`, dan `permohonan_layanan`. Inisialisasi database juga memigrasikan nama tabel dan kolom proyek yang lama tanpa menghapus baris atau mengganti identitas tabel. Skrip tidak menghapus tabel atau data yang sudah ada, kecuali tiga entri publikasi contoh lama yang bukan data resmi pustakawan. Isi `backend/.env` dengan `PGDATABASE=db_perpustakaan`, role aplikasi, dan password lokal komputer tersebut sebelum menjalankan backend.

File `database/db_perpustakaan.sql` berisi skema tabel dan data contoh proyek, bukan salinan data privat dari database PostgreSQL lain. Untuk memindahkan data tambahan yang sudah dimasukkan ke database sumber, ekspor database tersebut dengan `pg_dump` dan sertakan dump-nya secara terpisah.

## Menjalankan di Linux

1. Salin `backend/.env.example` menjadi `backend/.env`.
2. Gunakan `PGDATABASE=db_perpustakaan`, lalu isi `PGUSER` dan `PGPASSWORD` dengan role PostgreSQL lokal Anda. Sesuaikan `PGPORT`: `5433` untuk instance khusus proyek ini atau `5432` untuk instalasi PostgreSQL biasa. Role tersebut perlu memiliki izin membuat tabel. Jika database belum ada, jalankan `database/setup.sql` seperti panduan di atas sebelum menjalankan `db:init`.
3. Pasang dependency dari direktori proyek:

	```bash
	npm install --prefix backend
	```

4. Buat/sinkronkan skema, migrasikan nama tabel dan kolom ke Bahasa Indonesia, dan siapkan data contoh tanpa menghapus data yang sudah ada:

	```bash
	npm run db:init --prefix backend
	```

5. Jalankan portal dan API:

	```bash
	npm run dev --prefix backend
	```

Buka `http://localhost:3000`. Status koneksi database dapat diperiksa di `/api/health`.

File `database/db_perpustakaan.sql` dan `database/admin_modules.sql` kompatibel dengan PostgreSQL. Seed data contoh bersifat idempotent berdasarkan judul; perintah ini tidak menjalankan `DROP TABLE`.

## Nama kolom database

Seluruh tabel aplikasi menggunakan nama kolom Bahasa Indonesia. Singkatan umum seperti `id`, `isbn`, `rfid`, `doi`, dan `email` tetap dipakai. Contoh perubahan:

| Nama lama | Nama sekarang |
|---|---|
| `book_id` | `id_buku` |
| `source_id` | `id_sumber_perolehan` |
| `title` | `judul` |
| `author` | `pengarang` |
| `accession_no` | `nomor_induk` |
| `quantity` | `jumlah` |
| `acquisition_date` | `tanggal_perolehan` |
| `created_at` | `waktu_dibuat` |
| `updated_at` | `waktu_diperbarui` |

Pemetaan lengkap berada di `database/nama_kolom.json`. Untuk memperbarui database lama tanpa menambahkan seed atau mengubah isi data, jalankan:

```bash
npm run db:migrate --prefix backend
```

Migrasi memakai `ALTER TABLE ... RENAME COLUMN` dalam satu transaksi dan aman dijalankan ulang. Identitas baris, relasi, dan indeks dipertahankan; jika nama lama dan nama baru sudah ada bersamaan, migrasi dibatalkan. `db:init` dan `database/setup.sql` juga menjalankan migrasi ini sebelum menyiapkan skema. Format data API dipertahankan melalui pemetaan di backend sehingga form aplikasi tetap bekerja.

Cadangan database sebelum perubahan nama disimpan secara lokal di `.local-postgres/backups/sebelum-kolom-indonesia-.../database.dump`, disertai salinan kode sebelumnya pada folder `source/`. Untuk membatalkan perubahan nama kolom, jalankan `database/rollback_nama_kolom.sql` melalui `psql`, lalu pulihkan kode backend sebelumnya dari cadangan yang sama sebelum menjalankan aplikasi kembali.

Pengujian integrasi dapat dijalankan dengan `npm run test:database --prefix backend`. Pengujian membuat database sementara dan menghapusnya setelah selesai; role PostgreSQL pengujian memerlukan izin membuat database.

## Login dan beranda admin

Halaman login tersedia di `http://localhost:3000/admin/login.html`; setelah login, dashboard berada di `http://localhost:3000/admin/`. Sebelum menjalankan backend, tambahkan konfigurasi berikut ke `backend/.env` tanpa mengganti pengaturan PostgreSQL yang sudah ada:

```dotenv
ADMIN_USERNAME=username_admin_anda
ADMIN_PASSWORD=password_admin_anda
ADMIN_SESSION_SECRET=secret_acak_minimal_32_karakter
```

Gunakan username dan password admin yang Anda pilih. Buat secret sesi acak dengan Node.js, lalu salin hasilnya ke `ADMIN_SESSION_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Jangan masukkan nilai rahasia tersebut ke repositori atau mengganti placeholder di `.env.example` dengan kredensial asli. Login memakai cookie `HttpOnly` selama 8 jam, sedangkan dashboard hanya membaca ringkasan dari tabel koleksi, publikasi, dan permohonan layanan yang sudah tersedia. Data peminjaman pada grafik koleksi mengikuti nilai `loan_count`; tabel transaksi sirkulasi belum tersedia dalam skema proyek.

Menu Akuisisi menyediakan pengelolaan sumber perolehan, entri koleksi standar/RDA, daftar koleksi, jilid, kardeks terbitan berkala, usulan koleksi, impor data, keranjang, karantina, dan pengiriman. Data disimpan di PostgreSQL dan setiap API Akuisisi memerlukan sesi admin. Setelah memperbarui kode, jalankan `npm run db:init --prefix backend` untuk membuat tabel Akuisisi; skrip inisialisasi aman dijalankan ulang. Impor memakai template CSV yang dapat dibuka di Excel, maksimal 200 baris dalam satu proses.

Menu Katalog menyediakan entri katalog standar/RDA, salin katalog, daftar dan ekspor ruas MARC dalam JSON, pengelolaan konten digital, keranjang, karantina, dan daftar artikel. Rekaman katalog baru ditautkan ke koleksi buku agar dapat dipakai pada katalog publik. Berkas digital dibatasi 20 MB dan disimpan di PostgreSQL. Jalankan kembali `npm run db:init --prefix backend` setelah memperbarui skema agar tabel katalog tersedia.

## Menyiapkan database di Windows

Jika PostgreSQL lokal memakai instalasi default versi 18 dan password user `postgres` tidak diketahui, buka PowerShell dengan **Run as administrator**, lalu jalankan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\database\setup-windows.ps1
```

Skrip meminta password baru dua kali lewat prompt tersembunyi, mengatur ulang password user `postgres`, membuat database dan tabel, serta menyiapkan `backend/.env`. Aturan autentikasi sementara hanya mengizinkan koneksi `postgres` dari `127.0.0.1` dan langsung dipulihkan setelah reset. Setelah skrip berhasil, buka PowerShell biasa dan jalankan:

```powershell
npm ci --prefix backend
npm run dev --prefix backend
```

Buka `http://localhost:3000`. Jika password PostgreSQL masih diketahui, tidak perlu reset; buat `backend/.env` dari `.env.example`, isi kredensial lokal, lalu jalankan `psql` dan perintah backend seperti panduan di atas.
