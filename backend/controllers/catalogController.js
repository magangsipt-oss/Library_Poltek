const CatalogModel = require('../models/CatalogModel');

const statuses = new Set(['active', 'basket', 'quarantine']);
const materialTypes = new Set(['Monograf', 'Serial', 'Peta', 'Musik', 'Video', 'Bahan khusus', 'Lainnya']);
const allowedFileTypes = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'text/plain',
  'audio/mpeg'
]);

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function idValue(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw invalid(`${label} tidak valid.`);
  return id;
}

function text(value, label, maximum, required = false) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (required && !result) throw invalid(`${label} wajib diisi.`);
  if (result.length > maximum) throw invalid(`${label} maksimal ${maximum} karakter.`);
  return result;
}

function jsonObject(value, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw invalid(`${label} harus berformat JSON yang valid.`);
  }
}

function recordInput(body, recordType) {
  const type = recordType || 'standard';
  if (!['standard', 'rda'].includes(type)) throw invalid('Jenis entri katalog tidak valid.');
  const materialType = body.material_type || 'Monograf';
  if (!materialTypes.has(materialType)) throw invalid('Jenis bahan tidak valid.');
  const marc = jsonObject(body.marc_data, 'Data MARC', []);
  if (!Array.isArray(marc) || marc.length > 100) throw invalid('Data MARC harus berupa daftar maksimal 100 ruas.');
  for (const field of marc) {
    if (!field || typeof field !== 'object' || Array.isArray(field)
      || !/^\d{3}$/.test(String(field.tag || ''))
      || !['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' '].includes(String(field.indicator1 || ' '))
      || !['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' '].includes(String(field.indicator2 || ' '))
      || typeof field.value !== 'string' || field.value.length > 5000) {
      throw invalid('Setiap ruas MARC memerlukan tag tiga digit, dua indikator, dan isi maksimal 5000 karakter.');
    }
  }
  const rda = jsonObject(body.rda_data, 'Data RDA', {});
  if (!rda || typeof rda !== 'object' || Array.isArray(rda)) throw invalid('Data RDA harus berupa objek JSON.');
  const year = body.publication_year ? Number(body.publication_year) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1000 || year > 9999)) {
    throw invalid('Tahun terbit harus berupa tahun yang valid.');
  }
  return {
    record_type: type,
    material_type: materialType,
    title: text(body.title, 'Judul utama', 500, true),
    subtitle: text(body.subtitle, 'Anak judul', 500),
    responsibility: text(body.responsibility, 'Penanggung jawab', 500),
    creator: text(body.creator, 'Tajuk pengarang', 500),
    edition: text(body.edition, 'Edisi', 255),
    publication_statement: text(body.publication_statement, 'Penerbitan/publikasi', 500),
    physical_description: text(body.physical_description, 'Deskripsi fisik', 500),
    subject: text(body.subject, 'Subjek', 5000),
    call_number: text(body.call_number, 'Nomor panggil', 120),
    isbn: text(body.isbn, 'ISBN', 32),
    digital_content_url: text(body.digital_content_url, 'Tautan konten digital', 2000),
    bibid: text(body.bibid, 'BIBID', 80) || `CAT-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    publication_year: year,
    publisher: text(body.publisher, 'Penerbit', 255),
    link_book: body.link_book !== false && body.link_book !== 'false',
    marc_data: marc,
    rda_data: rda
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
        res.status(409).json({ error: 'BIBID duplikat. Masukkan BIBID lain.' });
        return;
      }
      if (error.code === '23503') {
        res.status(400).json({ error: 'Data katalog yang dipilih tidak ditemukan.' });
        return;
      }
      next(error);
    });
  };
}

const listRecords = asyncHandler(async (req, res) => {
  const status = statuses.has(req.query.status) ? req.query.status : 'all';
  const keyword = text(req.query.keyword, 'Kata kunci', 150);
  res.json({ items: await CatalogModel.listRecords(status, keyword) });
});

const createRecord = asyncHandler(async (req, res) => {
  const item = await CatalogModel.createRecord(recordInput(req.body, req.body.record_type));
  res.status(201).json({ item });
});

const copyRecord = asyncHandler(async (req, res) => {
  const item = await CatalogModel.copyRecord(idValue(req.params.id, 'Katalog'));
  if (!item) return res.status(404).json({ error: 'Data katalog tidak ditemukan.' });
  return res.status(201).json({ item });
});

const catalogizeBook = asyncHandler(async (req, res) => {
  const bibid = text(req.body.bibid, 'BIBID', 80) || `CAT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const item = await CatalogModel.catalogizeBook(idValue(req.params.bookId, 'Koleksi'), bibid);
  if (!item) return res.status(404).json({ error: 'Koleksi tidak ditemukan.' });
  return res.status(201).json({ item });
});

const updateStatus = asyncHandler(async (req, res) => {
  if (!statuses.has(req.body.status)) throw invalid('Status katalog tidak valid.');
  if (!await CatalogModel.updateLifecycle(idValue(req.params.id, 'Katalog'), req.body.status)) {
    return res.status(404).json({ error: 'Data katalog tidak ditemukan.' });
  }
  return res.json({ message: 'Status katalog berhasil diperbarui.' });
});

const deleteRecord = asyncHandler(async (req, res) => {
  if (!await CatalogModel.deleteRecord(idValue(req.params.id, 'Katalog'))) {
    return res.status(404).json({ error: 'Data katalog tidak ditemukan.' });
  }
  return res.status(204).end();
});

const exportRecords = asyncHandler(async (req, res) => {
  const rawIds = req.query.ids ? String(req.query.ids).split(',') : [];
  if (rawIds.length > 500) throw invalid('Ekspor maksimal 500 katalog dalam satu kali proses.');
  const ids = [...new Set(rawIds.map(id => idValue(id, 'Katalog')))];
  const items = await CatalogModel.exportRecords(ids);
  res.json({ exported_at: new Date().toISOString(), count: items.length, items });
});

const listDigitalContent = asyncHandler(async (req, res) => {
  res.json({ items: await CatalogModel.listDigitalContent() });
});

const uploadDigitalContent = asyncHandler(async (req, res) => {
  const recordId = idValue(req.params.id, 'Katalog');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw invalid('Pilih berkas konten digital.');
  if (req.body.length > 20 * 1024 * 1024) throw invalid('Ukuran berkas maksimal 20 MB.');
  const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  if (!allowedFileTypes.has(mimeType)) {
    throw invalid('Jenis berkas tidak didukung. Gunakan PDF, ZIP, JPG, PNG, TXT, atau MP3.');
  }
  let fileName;
  try {
    fileName = decodeURIComponent(String(req.headers['x-file-name'] || 'konten-digital'));
  } catch {
    throw invalid('Nama berkas tidak valid.');
  }
  fileName = fileName.replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 255);
  const item = await CatalogModel.addDigitalContent(recordId, { fileName, mimeType, fileData: req.body });
  if (!item) return res.status(404).json({ error: 'Data katalog tidak ditemukan.' });
  return res.status(201).json({ item });
});

const downloadDigitalContent = asyncHandler(async (req, res) => {
  const item = await CatalogModel.getDigitalContent(idValue(req.params.id, 'Konten digital'));
  if (!item) return res.status(404).json({ error: 'Berkas konten digital tidak ditemukan.' });
  res.set({
    'Content-Type': item.mime_type,
    'Content-Length': item.file_data.length,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(item.file_name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store'
  });
  return res.send(item.file_data);
});

const deleteDigitalContent = asyncHandler(async (req, res) => {
  if (!await CatalogModel.deleteDigitalContent(idValue(req.params.id, 'Konten digital'))) {
    return res.status(404).json({ error: 'Berkas konten digital tidak ditemukan.' });
  }
  return res.status(204).end();
});

const listArticles = asyncHandler(async (req, res) => {
  const keyword = text(req.query.keyword, 'Kata kunci', 150);
  res.json({ items: await CatalogModel.listArticles(keyword) });
});

const saveArticle = asyncHandler(async (req, res) => {
  const item = {
    id: req.params.id ? idValue(req.params.id, 'Artikel') : null,
    title: text(req.body.title, 'Judul artikel', 500, true),
    creator: text(req.body.creator, 'Kreator', 500),
    subject: text(req.body.subject, 'Subjek', 5000),
    serial_edition: text(req.body.serial_edition, 'Edisi serial', 255),
    catalog_title: text(req.body.catalog_title, 'Judul katalog', 500),
    digital_content_url: text(req.body.digital_content_url, 'Tautan konten digital', 2000)
  };
  const result = await CatalogModel.saveArticle(item);
  if (!result) return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
  return res.status(item.id ? 200 : 201).json({ item: result });
});

const deleteArticle = asyncHandler(async (req, res) => {
  if (!await CatalogModel.deleteArticle(idValue(req.params.id, 'Artikel'))) {
    return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
  }
  return res.status(204).end();
});

module.exports = {
  catalogizeBook,
  copyRecord,
  createRecord,
  deleteArticle,
  deleteDigitalContent,
  deleteRecord,
  downloadDigitalContent,
  exportRecords,
  listArticles,
  listDigitalContent,
  listRecords,
  saveArticle,
  updateStatus,
  uploadDigitalContent
};
