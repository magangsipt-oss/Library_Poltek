const AcquisitionModel = require('../models/AcquisitionModel');

const lifecycleStatuses = new Set(['in_stock', 'basket', 'quarantine', 'shipped']);
const proposalStatuses = new Set(['pending', 'approved', 'rejected', 'acquired']);
const materialTypeAliases = new Map([
  ['buku', 'buku'],
  ['tugas akhir', 'ta'],
  ['ta', 'ta'],
  ['jurnal', 'jurnal'],
  ['modul', 'modul'],
  ['lainnya', 'lainnya']
]);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function text(value, maxLength, field, required = false) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) throw validationError(`${field} wajib diisi.`);
  if (normalized.length > maxLength) throw validationError(`${field} maksimal ${maxLength} karakter.`);
  return normalized;
}

function positiveInteger(value, field, maximum = 1000000) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw validationError(`${field} harus berupa bilangan bulat antara 1 sampai ${maximum}.`);
  }
  return parsed;
}

function optionalInteger(value, field, min = 1000, max = 9999) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw validationError(`${field} harus berupa bilangan bulat antara ${min} sampai ${max}.`);
  }
  return parsed;
}

function yearValue(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1000 || parsed > 9999) {
    throw validationError(`${field} wajib berupa tahun antara 1000 sampai 9999.`);
  }
  return parsed;
}

function idValue(value, field = 'ID') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw validationError(`${field} tidak valid.`);
  return id;
}

function dateValue(value, field, fallbackToday = false) {
  const date = value ? String(value) : (fallbackToday ? new Date().toISOString().slice(0, 10) : '');
  if (date) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== date) {
      throw validationError(`${field} tidak valid.`);
    }
  }
  return date || null;
}

function acquisitionInput(body, recordType = 'standard') {
  const type = recordType === 'rda' ? 'rda' : 'standard';
  const metadata = body.rda_metadata && typeof body.rda_metadata === 'object'
    && !Array.isArray(body.rda_metadata) ? body.rda_metadata : {};
  const price = text(body.price, 16, 'Harga');
  if (price && !/^\d{1,12}(?:\.\d{1,2})?$/.test(price)) {
    throw validationError('Harga harus berupa angka positif dengan maksimal dua angka desimal.');
  }
  const rawMaterialType = text(body.material_type || 'buku', 30, 'Jenis bahan', true);
  const materialType = materialTypeAliases.get(rawMaterialType.toLocaleLowerCase('id-ID')) || rawMaterialType;
  return {
    book_id: body.book_id ? idValue(body.book_id, 'Judul') : null,
    record_type: type,
    title: text(body.title, 255, 'Judul', true),
    author: text(body.author, 255, 'Pengarang'),
    publisher: text(body.publisher, 255, 'Penerbit'),
    publication_year: optionalInteger(body.publication_year, 'Tahun terbit', 1000, 9999),
    isbn: text(body.isbn, 32, 'ISBN'),
    material_type: materialType,
    category: text(body.category, 120, 'Kategori'),
    subject: text(body.subject, 5000, 'Subjek'),
    call_number: text(body.call_number, 80, 'Nomor panggil'),
    source_id: body.source_id ? idValue(body.source_id, 'Sumber perolehan') : null,
    accession_no: text(body.accession_no, 80, 'Nomor induk'),
    barcode: text(body.barcode, 80, 'Barcode'),
    rfid: text(body.rfid, 80, 'RFID'),
    acquisition_date: dateValue(body.acquisition_date, 'Tanggal pengadaan', true),
    quantity: positiveInteger(body.quantity === '' || body.quantity === undefined ? 1 : body.quantity, 'Jumlah eksemplar', 100000),
    physical_form: text(body.physical_form || 'Buku', 80, 'Bentuk fisik', true),
    access_type: text(body.access_type || 'Dapat dipinjam', 80, 'Akses', true),
    location: text(body.location, 160, 'Lokasi'),
    acquisition_metadata: {
      source_type: text(body.source_type, 40, 'Jenis sumber'),
      room_location: text(body.room_location, 160, 'Lokasi ruang'),
      availability: text(body.availability || 'Tersedia', 40, 'Ketersediaan', true),
      currency: text(body.currency || 'IDR', 3, 'Mata uang', true),
      price: price || '0',
      price_unit: text(body.price_unit || 'Per eksemplar', 40, 'Satuan harga', true),
      show_in_opac: body.show_in_opac !== 'false' && body.show_in_opac !== false
    },
    rda_metadata: metadata
  };
}

function asyncHandler(handler) {
  return (req, res, next) => {
    req.body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    return Promise.resolve(handler(req, res, next)).catch(error => {
      if (error instanceof Error && error.statusCode === 400) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.code === '23505') {
        res.status(409).json({ error: 'Data duplikat. Periksa ISBN, nomor induk, barcode, atau BIBID.' });
        return;
      }
      if (error.code === '23503') {
        res.status(400).json({ error: 'Sumber atau koleksi yang dipilih tidak ditemukan.' });
        return;
      }
      next(error);
    });
  };
}

const listSources = asyncHandler(async (req, res) => {
  res.json({ items: await AcquisitionModel.listSources() });
});

const saveSource = asyncHandler(async (req, res) => {
  const source = {
    id: req.params.id ? idValue(req.params.id) : null,
    name: text(req.body.name, 180, 'Nama sumber', true),
    address: text(req.body.address, 5000, 'Alamat'),
    phone: text(req.body.phone, 40, 'Nomor telepon'),
    exemplar_count: req.body.exemplar_count === '' || req.body.exemplar_count === undefined
      ? 0 : Number(req.body.exemplar_count)
  };
  if (!Number.isInteger(source.exemplar_count) || source.exemplar_count < 0 || source.exemplar_count > 10000000) {
    throw validationError('Jumlah eksemplar harus berupa bilangan bulat 0 sampai 10000000.');
  }
  const item = await AcquisitionModel.saveSource(source);
  if (!item) return res.status(404).json({ error: 'Sumber perolehan tidak ditemukan.' });
  return res.status(source.id ? 200 : 201).json({ item });
});

const deleteSource = asyncHandler(async (req, res) => {
  if (!await AcquisitionModel.deleteSource(idValue(req.params.id))) {
    return res.status(404).json({ error: 'Sumber perolehan tidak ditemukan.' });
  }
  return res.status(204).end();
});

const listCollections = asyncHandler(async (req, res) => {
  const status = lifecycleStatuses.has(req.query.status) ? req.query.status : 'all';
  const keyword = text(req.query.keyword, 150, 'Kata kunci');
  res.json({ items: await AcquisitionModel.listCollections(status, keyword) });
});

const getCollection = asyncHandler(async (req, res) => {
  const item = await AcquisitionModel.getCollection(idValue(req.params.id, 'Koleksi'));
  if (!item) return res.status(404).json({ error: 'Data koleksi tidak ditemukan.' });
  return res.json({ item });
});

const createAcquisition = asyncHandler(async (req, res) => {
  const item = await AcquisitionModel.createAcquisition(acquisitionInput(req.body, req.body.record_type));
  res.status(201).json({ item });
});

const updateAcquisition = asyncHandler(async (req, res) => {
  const item = acquisitionInput(req.body, req.body.record_type);
  if (!await AcquisitionModel.updateAcquisition(idValue(req.params.id, 'Koleksi'), item)) {
    return res.status(404).json({ error: 'Data koleksi tidak ditemukan.' });
  }
  return res.json({ message: 'Data koleksi berhasil diperbarui.' });
});

const updateCollectionOpacVisibility = asyncHandler(async (req, res) => {
  if (typeof req.body.visible !== 'boolean') throw validationError('Status OPAC harus berupa pilihan tampil atau tidak tampil.');
  if (!await AcquisitionModel.setCollectionOpacVisibility(idValue(req.params.id, 'Koleksi'), req.body.visible)) {
    return res.status(404).json({ error: 'Data koleksi tidak ditemukan.' });
  }
  return res.json({ message: 'Pengaturan OPAC koleksi berhasil diperbarui.' });
});

const updateLifecycle = asyncHandler(async (req, res) => {
  const status = req.body.status;
  if (!lifecycleStatuses.has(status)) throw validationError('Status koleksi tidak valid.');
  if (!await AcquisitionModel.updateLifecycle(idValue(req.params.id), status)) {
    return res.status(404).json({ error: 'Data koleksi tidak ditemukan.' });
  }
  return res.json({ message: 'Status koleksi berhasil diperbarui.' });
});

const deleteAcquisition = asyncHandler(async (req, res) => {
  if (!await AcquisitionModel.deleteAcquisition(idValue(req.params.id))) {
    return res.status(404).json({ error: 'Data koleksi tidak ditemukan.' });
  }
  return res.status(204).end();
});

const importAcquisitions = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.items) || req.body.items.length < 1 || req.body.items.length > 200) {
    throw validationError('Impor harus berisi 1 sampai 200 data koleksi.');
  }
  const items = req.body.items.map(item => acquisitionInput(item, item.record_type));
  const imported = await AcquisitionModel.importAcquisitions(items);
  res.status(201).json({ count: imported.length, message: `${imported.length} koleksi berhasil diimpor.` });
});

const listBindings = asyncHandler(async (req, res) => {
  res.json({ items: await AcquisitionModel.listBindings() });
});

const createBinding = asyncHandler(async (req, res) => {
  const item = await AcquisitionModel.createBinding({
    book_id: idValue(req.body.book_id, 'Koleksi'),
    binding_year: yearValue(req.body.binding_year, 'Tahun jilid'),
    volume_number: text(req.body.volume_number, 80, 'Nomor jilid'),
    quantity: positiveInteger(req.body.quantity === '' || req.body.quantity === undefined ? 1 : req.body.quantity, 'Jumlah eksemplar', 100000)
  });
  res.status(201).json({ item });
});

const listPeriodicals = asyncHandler(async (req, res) => {
  res.json({ items: await AcquisitionModel.listPeriodicals() });
});

const createPeriodical = asyncHandler(async (req, res) => {
  const item = await AcquisitionModel.savePeriodical({
    bibid: text(req.body.bibid, 80, 'BIBID', true),
    title: text(req.body.title, 500, 'Judul', true),
    author: text(req.body.author, 255, 'Pengarang'),
    publication_place: text(req.body.publication_place, 180, 'Tempat terbit'),
    publisher: text(req.body.publisher, 255, 'Penerbit'),
    publication_year: optionalInteger(req.body.publication_year, 'Tahun terbit', 1000, 9999),
    volume: text(req.body.volume, 80, 'Volume'),
    issue_number: text(req.body.issue_number, 80, 'Nomor edisi'),
    publication_date: dateValue(req.body.publication_date, 'Tanggal terbit'),
    received_date: dateValue(req.body.received_date, 'Tanggal diterima', true),
    copies: positiveInteger(req.body.copies === '' || req.body.copies === undefined ? 1 : req.body.copies, 'Jumlah eksemplar', 100000)
  });
  res.status(201).json({ item });
});

const listProposals = asyncHandler(async (req, res) => {
  res.json({ items: await AcquisitionModel.listProposals() });
});

const createProposal = asyncHandler(async (req, res) => {
  const item = await AcquisitionModel.createProposal({
    title: text(req.body.title, 255, 'Judul', true),
    author: text(req.body.author, 255, 'Pengarang'),
    publisher: text(req.body.publisher, 255, 'Penerbit'),
    requester: text(req.body.requester, 150, 'Nama pengusul'),
    member_number: text(req.body.member_number, 80, 'Nomor anggota')
  });
  res.status(201).json({ item });
});

const updateProposalStatus = asyncHandler(async (req, res) => {
  if (!proposalStatuses.has(req.body.status)) throw validationError('Status usulan tidak valid.');
  if (!await AcquisitionModel.updateProposalStatus(idValue(req.params.id), req.body.status)) {
    return res.status(404).json({ error: 'Usulan koleksi tidak ditemukan.' });
  }
  return res.json({ message: 'Status usulan berhasil diperbarui.' });
});

const listShipments = asyncHandler(async (req, res) => {
  res.json({ items: await AcquisitionModel.listShipments() });
});

const createShipment = asyncHandler(async (req, res) => {
  const destination = text(req.body.destination, 180, 'Tujuan pengiriman', true);
  const ids = req.body.acquisition_ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 200) {
    throw validationError('Pilih 1 sampai 200 koleksi dari keranjang.');
  }
  const acquisitionIds = [...new Set(ids.map(id => idValue(id, 'Koleksi')))];
  if (acquisitionIds.length !== ids.length) throw validationError('Daftar koleksi memiliki ID duplikat.');
  const item = await AcquisitionModel.createShipment(destination, acquisitionIds);
  res.status(201).json({ item });
});

module.exports = {
  createAcquisition,
  createBinding,
  createPeriodical,
  createProposal,
  createShipment,
  deleteAcquisition,
  deleteSource,
  getCollection,
  importAcquisitions,
  listBindings,
  listCollections,
  listPeriodicals,
  listProposals,
  listShipments,
  listSources,
  saveSource,
  updateAcquisition,
  updateCollectionOpacVisibility,
  updateLifecycle,
  updateProposalStatus
};
