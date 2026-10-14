const ServiceRequestModel = require('../models/ServiceRequestModel');

async function createRequest(req, res, next) {
  try {
    const full_name = String(req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const service_type = String(req.body.service_type || '').trim();
    const message = String(req.body.message || '').trim();

    if (!full_name || !email || !service_type || !message) {
      return res.status(400).json({ error: 'Nama, email, jenis layanan, dan pesan wajib diisi.' });
    }
    if (full_name.length > 150 || email.length > 255 || phone.length > 40
      || service_type.length > 120 || message.length > 5000) {
      return res.status(400).json({ error: 'Ada isian yang melebihi batas panjang.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }

    const request = await ServiceRequestModel.createServiceRequest({
      full_name,
      email,
      phone,
      service_type,
      message
    });

    res.status(201).json({ item: request, message: 'Permohonan berhasil dikirim.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { createRequest };