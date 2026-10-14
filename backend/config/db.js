const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PGPOOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

pool.on('error', error => {
  console.error('Koneksi PostgreSQL idle mengalami error:', error.message);
});

function query(text, params) {
  return pool.query(text, params);
}

async function checkDatabase() {
  await pool.query('SELECT 1');
}

module.exports = { pool, query, checkDatabase };