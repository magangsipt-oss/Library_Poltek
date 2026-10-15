# Menyiapkan file `.env` setelah pull

File `backend/.env` berisi password dan secret lokal, jadi file tersebut tidak di-push. Buat salinan dari template yang aman di folder utama proyek:

```powershell
Copy-Item backend\.env.example backend\.env
```

Buka `backend/.env`, lalu isi `PGDATABASE`, `PGUSER`, dan `PGPASSWORD` sesuai PostgreSQL di komputer masing-masing. Pastikan database proyek sudah dibuat dan diinisialisasi; lihat panduan di [README.md](./README.md).

Pilih username dan password admin sendiri, lalu buat secret sesi baru di PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Salin hasilnya ke `ADMIN_SESSION_SECRET` di `backend/.env`. Jangan menaruh password atau secret asli di README, `.env.example`, atau GitHub. Setelah konfigurasi selesai, jalankan backend sesuai panduan di `README.md`.
