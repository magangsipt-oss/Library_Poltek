const { query } = require('../config/db');

async function createServiceRequest({ full_name, email, phone, service_type, message }) {
  const result = await query(
    `INSERT INTO permohonan_layanan (full_name, email, phone, service_type, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, phone, service_type, message, status, created_at`,
    [full_name, email, phone || null, service_type, message]
  );

  return result.rows[0];
}

module.exports = { createServiceRequest };