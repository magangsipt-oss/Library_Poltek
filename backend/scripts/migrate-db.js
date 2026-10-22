const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../config/db');

async function migrateDatabase() {
  const requiredVariables = ['PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missingVariables = requiredVariables.filter(name => !process.env[name]);
  if (missingVariables.length) {
    throw new Error(`Isi variabel ${missingVariables.join(', ')} di backend/.env terlebih dahulu.`);
  }
  const migrationPath = path.resolve(__dirname, '../../database/migrasi_bahasa_indonesia.sql');
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  console.log('Nama tabel dan kolom PostgreSQL berhasil dimigrasikan ke Bahasa Indonesia.');
}

migrateDatabase()
  .catch(error => {
    console.error(`Migrasi database gagal: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
