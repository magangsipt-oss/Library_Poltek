const toApiRow = require('./mapDatabaseRow');
const { pool, query } = require('../config/db');

async function listRecords(status = 'all', keyword = '') {
  const result = await query(`WITH entries AS (
      SELECT c.id, c.id_buku, c.bibid, c.jenis_rekaman, c.jenis_bahan, c.judul, c.anak_judul,
        c.pernyataan_tanggung_jawab, c.pencipta, c.edisi, c.pernyataan_penerbitan, c.deskripsi_fisik,
        c.subjek, c.nomor_panggil, c.isbn, c.url_konten_digital, c.data_marc, c.data_rda,
        c.status_koleksi, c.waktu_dibuat, c.waktu_diperbarui, d.id AS digital_content_id,
        d.nama_berkas AS digital_file_name, d.tipe_mime AS digital_mime_type,
        d.ukuran_berkas AS digital_file_size, FALSE AS is_legacy
      FROM katalog c
      LEFT JOIN LATERAL (
        SELECT id, nama_berkas, tipe_mime, ukuran_berkas FROM konten_digital_katalog
        WHERE id_katalog = c.id ORDER BY waktu_diunggah DESC, id DESC LIMIT 1
      ) d ON TRUE
      UNION ALL
      SELECT NULL::bigint, b.id, 'BOOK-' || b.id::text, 'standard', b.jenis_bahan,
        b.judul, '', '', b.pengarang, '', COALESCE(b.penerbit, '') || COALESCE(', ' || b.tahun_terbit, ''),
        '', COALESCE(b.subjek, ''), COALESCE(b.nomor_panggil, ''), COALESCE(b.isbn, ''),
        COALESCE(b.url_sampul, ''), '[]'::jsonb, '{}'::jsonb, 'active',
        b.waktu_dibuat, b.waktu_diperbarui, NULL::bigint, NULL::varchar, NULL::varchar, NULL::bigint, TRUE
      FROM buku b
      WHERE NOT EXISTS (SELECT 1 FROM katalog c WHERE c.id_buku = b.id)
        AND NOT EXISTS (SELECT 1 FROM buku_tidak_tampil_di_katalog h WHERE h.id_buku = b.id)
    )
    SELECT * FROM entries
    WHERE ($1 = 'all' OR status_koleksi = $1)
      AND ($2 = '' OR judul ILIKE '%' || $2 || '%' OR pencipta ILIKE '%' || $2 || '%'
        OR bibid ILIKE '%' || $2 || '%')
    ORDER BY waktu_dibuat DESC, id DESC NULLS LAST LIMIT 500`, [status, keyword]);
  return result.rows.map(toApiRow);
}

async function createRecord(item) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let bookId = null;
    if (item.link_book) {
      const bookMaterial = item.material_type === 'Monograf' ? 'buku'
        : item.material_type === 'Serial' ? 'jurnal' : item.material_type.toLowerCase();
      const book = await client.query(`INSERT INTO buku
          (isbn, judul, pengarang, penerbit, tahun_terbit, jenis_bahan, subjek, nomor_panggil)
        VALUES (NULLIF($1, ''), $2, $3, NULLIF($4, ''), $5, $6, NULLIF($7, ''), NULLIF($8, ''))
        ON CONFLICT (isbn) DO UPDATE SET
          judul = EXCLUDED.judul, pengarang = EXCLUDED.pengarang,
          penerbit = COALESCE(EXCLUDED.penerbit, buku.penerbit),
          tahun_terbit = COALESCE(EXCLUDED.tahun_terbit, buku.tahun_terbit),
          jenis_bahan = EXCLUDED.jenis_bahan,
          subjek = COALESCE(EXCLUDED.subjek, buku.subjek),
          nomor_panggil = COALESCE(EXCLUDED.nomor_panggil, buku.nomor_panggil),
          waktu_diperbarui = NOW()
        RETURNING id`, [
        item.isbn, item.title, item.creator, item.publisher, item.publication_year,
          bookMaterial, item.subject, item.call_number
      ]);
      bookId = book.rows[0].id;
    }
    const result = await client.query(`INSERT INTO katalog
        (id_buku, bibid, jenis_rekaman, jenis_bahan, judul, anak_judul, pernyataan_tanggung_jawab,
         pencipta, edisi, pernyataan_penerbitan, deskripsi_fisik, subjek, nomor_panggil,
         isbn, url_konten_digital, data_marc, data_rda)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb)
      RETURNING id, bibid`, [
      bookId, item.bibid, item.record_type, item.material_type, item.title, item.subtitle,
      item.responsibility, item.creator, item.edition, item.publication_statement,
      item.physical_description, item.subject, item.call_number, item.isbn,
      item.digital_content_url, JSON.stringify(item.marc_data), JSON.stringify(item.rda_data)
    ]);
    await client.query('COMMIT');
    return toApiRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function copyRecord(id) {
  const result = await query(`INSERT INTO katalog
      (bibid, jenis_rekaman, jenis_bahan, judul, anak_judul, pernyataan_tanggung_jawab, pencipta, edisi,
       pernyataan_penerbitan, deskripsi_fisik, subjek, nomor_panggil, isbn,
       url_konten_digital, data_marc, data_rda)
    SELECT 'COPY-' || id || '-' || md5(random()::text || clock_timestamp()::text),
       jenis_rekaman, jenis_bahan, judul, anak_judul, pernyataan_tanggung_jawab, pencipta, edisi,
       pernyataan_penerbitan, deskripsi_fisik, subjek, nomor_panggil, isbn,
       url_konten_digital, data_marc, data_rda
    FROM katalog WHERE id = $1
    RETURNING id, bibid, judul`, [id]);
  return toApiRow(result.rows[0]) || null;
}

async function catalogizeBook(id, bibid) {
  const result = await query(`INSERT INTO katalog
      (id_buku, bibid, jenis_bahan, judul, pencipta, pernyataan_penerbitan, subjek, nomor_panggil, isbn)
    SELECT b.id, $2, b.jenis_bahan, b.judul, b.pengarang,
      COALESCE(b.penerbit, '') || COALESCE(', ' || b.tahun_terbit, ''),
      COALESCE(b.subjek, ''), COALESCE(b.nomor_panggil, ''), COALESCE(b.isbn, '')
    FROM buku b WHERE b.id = $1
    RETURNING id, bibid`, [id, bibid]);
  return toApiRow(result.rows[0]) || null;
}

async function deleteRecord(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const record = await client.query('SELECT id_buku FROM katalog WHERE id = $1 FOR UPDATE', [id]);
    if (!record.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    if (record.rows[0].id_buku) {
      await client.query(`INSERT INTO buku_tidak_tampil_di_katalog (id_buku) VALUES ($1)
        ON CONFLICT (id_buku) DO NOTHING`, [record.rows[0].id_buku]);
    }
    await client.query('DELETE FROM katalog WHERE id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateLifecycle(id, status) {
  const result = await query(`UPDATE katalog SET status_koleksi = $2, waktu_diperbarui = NOW()
    WHERE id = $1 RETURNING id`, [id, status]);
  return Boolean(result.rowCount);
}

async function listDigitalContent() {
  const result = await query(`SELECT d.id, d.id_katalog, d.nama_berkas, d.tipe_mime,
      d.ukuran_berkas, d.waktu_diunggah, c.bibid, c.judul
    FROM konten_digital_katalog d
    JOIN katalog c ON c.id = d.id_katalog
    ORDER BY d.waktu_diunggah DESC, d.id DESC`);
  return result.rows.map(toApiRow);
}

async function addDigitalContent(recordId, { fileName, mimeType, fileData }) {
  const record = await query('SELECT id FROM katalog WHERE id = $1', [recordId]);
  if (!record.rowCount) return null;
  const result = await query(`INSERT INTO konten_digital_katalog
      (id_katalog, nama_berkas, tipe_mime, ukuran_berkas, data_berkas)
    VALUES ($1, $2, $3, $4, $5) RETURNING id, id_katalog, nama_berkas, tipe_mime, ukuran_berkas, waktu_diunggah`,
  [recordId, fileName, mimeType, fileData.length, fileData]);
  return toApiRow(result.rows[0]) || null;
}

async function getDigitalContent(id) {
  const result = await query(`SELECT nama_berkas, tipe_mime, data_berkas
    FROM konten_digital_katalog WHERE id = $1`, [id]);
  return toApiRow(result.rows[0]) || null;
}

async function deleteDigitalContent(id) {
  const result = await query('DELETE FROM konten_digital_katalog WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function listArticles(keyword = '') {
  const result = await query(`SELECT id, judul, pencipta, subjek, edisi_terbitan_berkala, judul_katalog,
      url_konten_digital, waktu_dibuat
    FROM artikel_katalog
    WHERE ($1 = '' OR judul ILIKE '%' || $1 || '%' OR pencipta ILIKE '%' || $1 || '%')
    ORDER BY waktu_dibuat DESC, id DESC LIMIT 500`, [keyword]);
  return result.rows.map(toApiRow);
}

async function saveArticle(item) {
  const result = item.id
    ? await query(`UPDATE artikel_katalog SET judul = $2, pencipta = $3, subjek = $4,
        edisi_terbitan_berkala = $5, judul_katalog = $6, url_konten_digital = $7, waktu_diperbarui = NOW()
      WHERE id = $1 RETURNING id, judul`, [
      item.id, item.title, item.creator, item.subject, item.serial_edition,
      item.catalog_title, item.digital_content_url
    ])
    : await query(`INSERT INTO artikel_katalog
        (judul, pencipta, subjek, edisi_terbitan_berkala, judul_katalog, url_konten_digital)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, judul`, [
      item.title, item.creator, item.subject, item.serial_edition,
      item.catalog_title, item.digital_content_url
    ]);
  return toApiRow(result.rows[0]) || null;
}

async function deleteArticle(id) {
  const result = await query('DELETE FROM artikel_katalog WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function exportRecords(ids) {
  const result = await query(`SELECT bibid, jenis_rekaman, jenis_bahan, judul, anak_judul,
      pernyataan_tanggung_jawab, pencipta, edisi, pernyataan_penerbitan, deskripsi_fisik,
      subjek, nomor_panggil, isbn, data_marc, data_rda
    FROM katalog
    WHERE ($1::bigint[] IS NULL OR id = ANY($1::bigint[]))
    ORDER BY id`, [ids.length ? ids : null]);
  return result.rows.map(toApiRow);
}

module.exports = {
  addDigitalContent,
  catalogizeBook,
  copyRecord,
  createRecord,
  deleteArticle,
  deleteDigitalContent,
  deleteRecord,
  exportRecords,
  getDigitalContent,
  listArticles,
  listDigitalContent,
  listRecords,
  saveArticle,
  updateLifecycle
};
