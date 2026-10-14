const path = require('node:path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const { checkDatabase, pool } = require('./config/db');

const app = express();
const frontendPath = path.resolve(__dirname, '../frontend');

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/health', async (req, res) => {
  try {
    await checkDatabase();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/opac', require('./routes/opacRoutes'));
app.use('/api/publikasi', require('./routes/publikasiRoutes'));
app.use('/api/layanan', require('./routes/layananRoutes'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

app.use(express.static(frontendPath, { extensions: ['html'] }));

app.use((error, req, res, next) => {
  console.error('API error:', error.message);
  const databaseUnavailable = ['28P01', '28000', '3D000', 'ECONNREFUSED'].includes(error.code)
    || /client password must be a string|SASL.*password/i.test(error.message);
  const status = databaseUnavailable ? 503 : 500;
  const message = databaseUnavailable
    ? 'Koneksi PostgreSQL gagal. Periksa PGDATABASE, PGUSER, dan PGPASSWORD di backend/.env.'
    : 'Terjadi kesalahan pada server.';
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3000);

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Portal perpustakaan berjalan di http://localhost:${port}`);
  });

  process.on('SIGINT', () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
  process.on('SIGTERM', () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
}

module.exports = app;