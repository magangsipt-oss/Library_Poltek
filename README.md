# Portal Perpustakaan Politeknik Sinar Mas Berau Coal

Portal ini memakai frontend HTML/JavaScript, API Express, dan PostgreSQL.

## Menyiapkan database di komputer baru

Pastikan PostgreSQL sudah terpasang dan perintah `psql` tersedia. Dari folder utama proyek, jalankan:

```bash
psql -h localhost -U postgres -d postgres -f database/setup.sql
```

Ganti `postgres` dengan role administrator PostgreSQL di komputer tersebut bila namanya berbeda. Skrip membuat database `db_perpustakaan_poltek` jika belum ada, lalu membuat tabel dan mengisi data contoh. Skrip ini tidak menghapus tabel atau data yang sudah ada. Isi `backend/.env` dengan nama database, role aplikasi, dan password lokal komputer tersebut sebelum menjalankan backend.

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
