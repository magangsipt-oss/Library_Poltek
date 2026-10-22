const toApiRow = require('./mapDatabaseRow');
const { query } = require('../config/db');

async function createServiceRequest({ full_name, email, phone, service_type, message }) {
  const result = await query(
    `INSERT INTO permohonan_layanan (nama_lengkap, email, telepon, jenis_layanan, pesan)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nama_lengkap, email, telepon, jenis_layanan, pesan, status, waktu_dibuat`,
    [full_name, email, phone || null, service_type, message]
  );

  return toApiRow(result.rows[0]);
}

module.exports = { createServiceRequest };