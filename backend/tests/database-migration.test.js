const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Semua penulisan dilakukan dalam database sementara, terpisah dari data aplikasi.
const temporaryDatabase = `uji_kolom_${randomUUID().replaceAll('-', '')}`;
const connection = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000
};
const administrator = new Client({ ...connection, database: 'postgres' });
const database = new Client({ ...connection, database: temporaryDatabase });
process.env.PGDATABASE = temporaryDatabase;
const { pool } = require('../config/db');
const Acquisition = require('../models/AcquisitionModel');
const Catalog = require('../models/CatalogModel');
const Book = require('../models/BookModel');
const Service = require('../models/ServiceRequestModel');
const app = require('../server');
const columnNames = require('../../database/nama_kolom.json');
const readSql = name => fs.readFileSync(path.resolve(__dirname, '../../database', name), 'utf8');
const forward = readSql('migrasi_bahasa_indonesia.sql');
const rollback = readSql('rollback_nama_kolom.sql');
let server;
let baseUrl;
let createdDatabase = false;

before(async () => {
  await administrator.connect();
  await administrator.query(`CREATE DATABASE ${temporaryDatabase}`);
  createdDatabase = true;
  await database.connect();
  for (let pass = 0; pass < 2; pass++) {
    await database.query(forward);
    await database.query(readSql('db_perpustakaan.sql'));
    await database.query(readSql('admin_modules.sql'));
  }
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
  await database.end();
  if (createdDatabase) await administrator.query(`DROP DATABASE ${temporaryDatabase} WITH (FORCE)`);
  await administrator.end();
});

function acquisitionInput(overrides = {}) {
  return {
    title: 'Buku uji migrasi', author: 'Pustakawan', publisher: 'Poltek', publication_year: 2026,
    material_type: 'buku', category: 'Teknik', subject: 'Pengujian', call_number: '001 UJI',
    isbn: '', source_id: null, record_type: 'standard', accession_no: randomUUID(),
    barcode: randomUUID(), rfid: '', acquisition_date: '2026-10-22', quantity: 2,
    physical_form: 'Buku', access_type: 'Dapat dipinjam', location: 'Rak Uji',
    rda_metadata: { content_type: 'teks' }, ...overrides
  };
}

test('instalasi baru membuat 31 tabel dengan kolom Indonesia tanpa menggandakan seed', async () => {
  const { rows } = await database.query(`SELECT table_name, column_name
    FROM information_schema.columns WHERE table_schema = 'public'`);
  assert.equal(new Set(rows.map(row => row.table_name)).size, 31);
  assert.deepEqual(rows.filter(row => Object.hasOwn(columnNames, row.column_name)), []);
  assert.equal((await database.query('SELECT count(*)::int AS total FROM buku')).rows[0].total, 8);
  assert.equal((await database.query('SELECT count(*)::int AS total FROM jenis_anggota')).rows[0].total, 4);
  const columns = rows.filter(row => row.table_name === 'akuisisi').map(row => row.column_name);
  for (const name of ['id_buku', 'id_sumber_perolehan', 'jumlah', 'tanggal_perolehan', 'waktu_dibuat']) {
    assert(columns.includes(name), name);
  }
});

test('migrasi dan rollback mempertahankan data, identitas tabel, indeks, dan relasi', async () => {
  const before = (await database.query(`SELECT oid, relname, relkind FROM pg_class
    WHERE relnamespace = 'public'::regnamespace ORDER BY oid`)).rows;
  const booksBefore = (await database.query('SELECT * FROM buku ORDER BY id')).rows;
  await database.query(rollback);
  assert.equal((await database.query('SELECT title FROM buku ORDER BY id LIMIT 1')).rows[0].title, booksBefore[0].judul);
  await database.query('ALTER TABLE buku RENAME TO books');
  await database.query('ALTER TABLE anggota RENAME TO members');
  await database.query(forward);
  await database.query(forward);
  const after = (await database.query(`SELECT oid, relname, relkind FROM pg_class
    WHERE relnamespace = 'public'::regnamespace ORDER BY oid`)).rows;
  assert.deepEqual(after, before);
  assert.deepEqual((await database.query('SELECT * FROM buku ORDER BY id')).rows, booksBefore);
  await assert.rejects(database.query('INSERT INTO akuisisi (id_buku) VALUES (-999999)'), { code: '23503' });
  await assert.rejects(database.query("INSERT INTO akuisisi (id_buku, jumlah) VALUES (1, 0)"), { code: '23514' });
});

test('konflik nama membatalkan seluruh migrasi tanpa perubahan sebagian', async () => {
  await database.query('ALTER TABLE akuisisi RENAME COLUMN id_buku TO book_id');
  await database.query('ALTER TABLE buku ADD COLUMN title text');
  try {
    await assert.rejects(database.query(forward), /migrasi dibatalkan/);
    await database.query('ROLLBACK');
    const { rows } = await database.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'akuisisi'`);
    assert(rows.some(row => row.column_name === 'book_id'));
    assert(!rows.some(row => row.column_name === 'id_buku'));
  } finally {
    await database.query('ALTER TABLE buku DROP COLUMN title');
    await database.query(forward);
  }
});

test('entri, upsert, impor, status, pengiriman, dan penghapusan koleksi tetap bekerja', async () => {
  const source = await Acquisition.saveSource({ name: 'Sumber Uji', address: 'Berau', phone: '08123', exemplar_count: 2 });
  assert.equal(source.name, 'Sumber Uji');
  await Acquisition.saveSource({ ...source, name: 'Sumber Diperbarui' });
  assert((await Acquisition.listSources()).some(row => row.name === 'Sumber Diperbarui'));
  const input = acquisitionInput({ source_id: source.id, isbn: '9780000000001' });
  const first = await Acquisition.createAcquisition(input);
  const [second] = await Acquisition.importAcquisitions([acquisitionInput({ source_id: source.id, isbn: input.isbn })]);
  const rows = await Acquisition.listCollections('all', input.title);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, input.title);
  assert.equal(rows[0].source_name, 'Sumber Diperbarui');
  assert.equal(rows[0].quantity, 2);
  assert.deepEqual(rows[0].rda_metadata, { content_type: 'teks' });
  const bookId = rows[0].book_id;
  assert.equal((await database.query('SELECT total_eksemplar FROM buku WHERE id=$1', [bookId])).rows[0].total_eksemplar, 4);
  await Acquisition.updateLifecycle(first.id, 'basket');
  assert.equal((await database.query('SELECT eksemplar_tersedia FROM buku WHERE id=$1', [bookId])).rows[0].eksemplar_tersedia, 2);
  const shipment = await Acquisition.createShipment('Kampus', [first.id]);
  assert.equal(shipment.destination, 'Kampus');
  assert((await Acquisition.listShipments()).some(row => row.id === shipment.id && row.item_count === 1));
  await assert.rejects(Acquisition.updateLifecycle(first.id, 'in_stock'), /tidak diizinkan/);
  assert.equal(await Acquisition.deleteAcquisition(second.id), true);
  assert.equal((await database.query('SELECT total_eksemplar FROM buku WHERE id=$1', [bookId])).rows[0].total_eksemplar, 2);
  const binding = await Acquisition.createBinding({ book_id: bookId, binding_year: 2026, volume_number: 'I', quantity: 1 });
  assert.equal(binding.book_id, bookId);
  assert((await Acquisition.listBindings()).some(row => row.id === binding.id && row.title === input.title));
  assert.equal(await Acquisition.deleteSource(source.id), true);
});

test('terbitan berkala, usulan, serta permohonan layanan tetap memakai kontrak API sebelumnya', async () => {
  const periodical = await Acquisition.savePeriodical({ bibid: 'SERIAL-UJI', title: 'Jurnal Uji', author: 'Penulis',
    publication_place: 'Berau', publisher: 'Poltek', publication_year: 2026, issue_number: '1',
    volume: '1', publication_date: '2026-10-21', received_date: '2026-10-22', copies: 3 });
  const listed = (await Acquisition.listPeriodicals()).find(row => row.id === periodical.id);
  assert.equal(listed.issue_count, 1);
  assert.equal(listed.copies, 3);
  const proposal = await Acquisition.createProposal({ title: 'Usulan Uji', author: 'Penulis', publisher: 'Poltek', requester: 'Mahasiswa', member_number: 'M-UJI' });
  assert.equal(proposal.requester, 'Mahasiswa');
  await Acquisition.updateProposalStatus(proposal.id, 'approved');
  assert((await Acquisition.listProposals()).some(row => row.id === proposal.id && row.status === 'approved'));
  const service = await Service.createServiceRequest({ full_name: 'Pemohon Uji', email: 'uji@example.test', phone: '08123', service_type: 'Referensi', message: 'Pesan uji' });
  assert.equal(service.full_name, 'Pemohon Uji');
  assert.equal(service.message, 'Pesan uji');
  assert(service.created_at instanceof Date);
});

test('katalog, konten biner, ekspor MARC, artikel, serta pencarian publik tetap bekerja', async () => {
  const record = await Catalog.createRecord({ link_book: true, bibid: 'KATALOG-UJI', record_type: 'standard',
    material_type: 'Monograf', title: 'Katalog Uji', subtitle: 'Anak Judul', responsibility: 'Pustakawan',
    creator: 'Penulis', edition: '1', publisher: 'Poltek', publication_year: 2026, publication_statement: 'Berau: Poltek',
    physical_description: '100 halaman', subject: 'Uji', call_number: '001 KAT', isbn: '9780000000002',
    digital_content_url: '', marc_data: [{ tag: '245', value: 'Katalog Uji' }], rda_data: { content_type: 'teks' } });
  const content = await Catalog.addDigitalContent(record.id, { fileName: 'uji.txt', mimeType: 'text/plain', fileData: Buffer.from('Data uji') });
  assert.equal(content.file_name, 'uji.txt');
  assert.equal((await Catalog.getDigitalContent(content.id)).file_data.toString(), 'Data uji');
  const listed = (await Catalog.listRecords('all', 'Katalog Uji')).find(row => row.id === record.id);
  assert.equal(listed.title, 'Katalog Uji');
  assert.equal(listed.digital_file_name, 'uji.txt');
  assert.equal((await Catalog.exportRecords([record.id]))[0].marc_data[0].tag, '245');
  const copy = await Catalog.copyRecord(record.id);
  assert.equal(copy.title, 'Katalog Uji');
  assert.equal(await Catalog.updateLifecycle(copy.id, 'quarantine'), true);
  const legacyBook = (await database.query('SELECT id FROM buku WHERE judul <> $1 ORDER BY id LIMIT 1', ['Katalog Uji'])).rows[0];
  assert((await Catalog.catalogizeBook(legacyBook.id, 'DARI-BUKU-UJI')).id);
  const article = await Catalog.saveArticle({ title: 'Artikel Uji', creator: 'Penulis', subject: 'Uji', serial_edition: '1', catalog_title: 'Jurnal', digital_content_url: '' });
  await Catalog.saveArticle({ ...article, title: 'Artikel Baru', creator: 'Penulis', subject: 'Uji', serial_edition: '2', catalog_title: 'Jurnal', digital_content_url: '' });
  assert((await Catalog.listArticles('Artikel Baru')).some(row => row.id === article.id));
  assert.equal(await Catalog.deleteArticle(article.id), true);
  const books = await Book.listBooks({ keyword: 'Katalog Uji' });
  assert.equal(books.total, 1);
  assert.equal(books.items[0].title, 'Katalog Uji');
  for (const field of ['judul', 'pengarang', 'subjek', 'isbn']) await Book.listBooks({ keyword: 'Uji', field, order: 'popular' });
  assert.equal(await Catalog.deleteDigitalContent(content.id), true);
  assert.equal(await Catalog.deleteRecord(record.id), true);
  assert(!(await Catalog.listRecords('all')).some(row => row.book_id === listed.book_id));
});

test('API publik, publikasi, login admin, dan ringkasan menggunakan database hasil migrasi', async () => {
  await database.query(`INSERT INTO publikasi (judul, para_penulis, prodi, jurnal, tahun_terbit)
    VALUES ('Publikasi Uji', 'Penulis Uji', 'TRL', 'Jurnal Uji', 2026)`);
  for (const endpoint of ['/api/health', '/api/opac', '/api/opac/popular', '/api/opac/latest', '/api/publikasi?keyword=Publikasi']) {
    const response = await fetch(baseUrl + endpoint);
    assert.equal(response.status, 200, endpoint);
    const body = await response.json();
    if (endpoint === '/api/health') assert.equal(body.database, 'connected');
    if (endpoint.startsWith('/api/publikasi')) assert.equal(body.items[0].authors, 'Penulis Uji');
  }
  const response = await fetch(baseUrl + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  for (const endpoint of ['/api/admin/overview', '/api/admin/acquisitions/collections', '/api/admin/catalog/records']) {
    const result = await fetch(baseUrl + endpoint, { headers: { Cookie: cookie } });
    assert.equal(result.status, 200, endpoint);
    if (endpoint.endsWith('/overview')) {
      const overview = await result.json();
      assert.equal(typeof overview.popularBooks[0].title, 'string');
      assert.equal(overview.recentRequests[0].full_name, 'Pemohon Uji');
    }
  }
});
