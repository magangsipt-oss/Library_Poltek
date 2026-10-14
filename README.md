# Portal Perpustakaan Politeknik Sinar Mas Berau Coal

Portal ini memakai frontend HTML/JavaScript, API Express, dan PostgreSQL.

## Menyiapkan database di komputer baru

Pastikan PostgreSQL sudah terpasang dan perintah `psql` tersedia. Dari folder utama proyek, jalankan:

```bash
psql -h localhost -U postgres -d postgres -f database/setup.sql
```

Ganti `postgres` dengan role administrator PostgreSQL di komputer tersebut bila namanya berbeda. Skrip membuat database `db_perpustakaan_poltek` jika belum ada, lalu membuat tabel dan mengisi data contoh. Skrip tidak menghapus tabel atau data yang sudah ada, kecuali tiga entri publikasi contoh lama yang bukan data resmi pustakawan. Isi `backend/.env` dengan nama database, role aplikasi, dan password lokal komputer tersebut sebelum menjalankan backend.

File `database/db_perpustakaan.sql` berisi skema tabel dan data contoh proyek, bukan salinan data privat dari database PostgreSQL lain. Untuk memindahkan data tambahan yang sudah dimasukkan ke database sumber, ekspor database tersebut dengan `pg_dump` dan sertakan dump-nya secara terpisah.

## Menjalankan di Linux

1. Salin `backend/.env.example` menjadi `backend/.env`.
2. Isi `PGDATABASE`, `PGUSER`, dan `PGPASSWORD` dengan database serta role PostgreSQL lokal Anda. Role tersebut perlu memiliki izin membuat tabel.
3. Pasang dependency dari direktori proyek:

	```bash
	npm install --prefix backend
	```

4. Buat/sinkronkan tabel dan data contoh tanpa menghapus data yang sudah ada:

	```bash
	npm run db:init --prefix backend
	```

5. Jalankan portal dan API:

	```bash
	npm run dev --prefix backend
	```

Buka `http://localhost:3000`. Status koneksi database dapat diperiksa di `/api/health`.

File `database/db_perpustakaan.sql` kompatibel dengan PostgreSQL. Seed data contoh bersifat idempotent berdasarkan judul; perintah ini tidak menjalankan `DROP TABLE`.

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
