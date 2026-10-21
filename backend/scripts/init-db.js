const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../config/db');

async function initializeDatabase() {
  const requiredVariables = ['PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missingVariables = requiredVariables.filter(name => !process.env[name]);
  if (missingVariables.length) {
    throw new Error(`Isi variabel ${missingVariables.join(', ')} di backend/.env terlebih dahulu.`);
  }

  const schemaPaths = [
    path.resolve(__dirname, '../../database/db_perpustakaan.sql'),
    path.resolve(__dirname, '../../database/admin_modules.sql')
  ];
  for (const schemaPath of schemaPaths) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  }
  console.log('Skema PostgreSQL, migrasi nama tabel, dan data contoh berhasil disinkronkan.');
}

initializeDatabase()
  .catch(error => {
    console.error(`Inisialisasi database gagal: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());