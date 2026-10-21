const { pool, query } = require('../config/db');

async function listRecords(status = 'all', keyword = '') {
  const result = await query(`WITH entries AS (
      SELECT c.id, c.book_id, c.bibid, c.record_type, c.material_type, c.title, c.subtitle,
        c.responsibility, c.creator, c.edition, c.publication_statement, c.physical_description,
        c.subject, c.call_number, c.isbn, c.digital_content_url, c.marc_data, c.rda_data,
        c.lifecycle_status, c.created_at, c.updated_at, d.id AS digital_content_id,
        d.file_name AS digital_file_name, d.mime_type AS digital_mime_type,
        d.file_size AS digital_file_size, FALSE AS is_legacy
      FROM katalog c
      LEFT JOIN LATERAL (
        SELECT id, file_name, mime_type, file_size FROM konten_digital_katalog
        WHERE catalog_record_id = c.id ORDER BY uploaded_at DESC, id DESC LIMIT 1
      ) d ON TRUE
      UNION ALL
      SELECT NULL::bigint, b.id, 'BOOK-' || b.id::text, 'standard', b.material_type,
        b.title, '', '', b.author, '', COALESCE(b.publisher, '') || COALESCE(', ' || b.publication_year, ''),
        '', COALESCE(b.subject, ''), COALESCE(b.call_number, ''), COALESCE(b.isbn, ''),
        COALESCE(b.cover_url, ''), '[]'::jsonb, '{}'::jsonb, 'active',
        b.created_at, b.updated_at, NULL::bigint, NULL::varchar, NULL::varchar, NULL::bigint, TRUE
      FROM buku b
      WHERE NOT EXISTS (SELECT 1 FROM katalog c WHERE c.book_id = b.id)
        AND NOT EXISTS (SELECT 1 FROM buku_tidak_tampil_di_katalog h WHERE h.book_id = b.id)
    )
    SELECT * FROM entries
    WHERE ($1 = 'all' OR lifecycle_status = $1)
      AND ($2 = '' OR title ILIKE '%' || $2 || '%' OR creator ILIKE '%' || $2 || '%'
        OR bibid ILIKE '%' || $2 || '%')
    ORDER BY created_at DESC, id DESC NULLS LAST LIMIT 500`, [status, keyword]);
  return result.rows;
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
          (isbn, title, author, publisher, publication_year, material_type, subject, call_number)
        VALUES (NULLIF($1, ''), $2, $3, NULLIF($4, ''), $5, $6, NULLIF($7, ''), NULLIF($8, ''))
        ON CONFLICT (isbn) DO UPDATE SET
          title = EXCLUDED.title, author = EXCLUDED.author,
          publisher = COALESCE(EXCLUDED.publisher, buku.publisher),
          publication_year = COALESCE(EXCLUDED.publication_year, buku.publication_year),
          material_type = EXCLUDED.material_type,
          subject = COALESCE(EXCLUDED.subject, buku.subject),
          call_number = COALESCE(EXCLUDED.call_number, buku.call_number),
          updated_at = NOW()
        RETURNING id`, [
        item.isbn, item.title, item.creator, item.publisher, item.publication_year,
          bookMaterial, item.subject, item.call_number
      ]);
      bookId = book.rows[0].id;
    }
    const result = await client.query(`INSERT INTO katalog
        (book_id, bibid, record_type, material_type, title, subtitle, responsibility,
         creator, edition, publication_statement, physical_description, subject, call_number,
         isbn, digital_content_url, marc_data, rda_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb)
      RETURNING id, bibid`, [
      bookId, item.bibid, item.record_type, item.material_type, item.title, item.subtitle,
      item.responsibility, item.creator, item.edition, item.publication_statement,
      item.physical_description, item.subject, item.call_number, item.isbn,
      item.digital_content_url, JSON.stringify(item.marc_data), JSON.stringify(item.rda_data)
    ]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function copyRecord(id) {
  const result = await query(`INSERT INTO katalog
      (bibid, record_type, material_type, title, subtitle, responsibility, creator, edition,
       publication_statement, physical_description, subject, call_number, isbn,
       digital_content_url, marc_data, rda_data)
    SELECT 'COPY-' || id || '-' || md5(random()::text || clock_timestamp()::text),
       record_type, material_type, title, subtitle, responsibility, creator, edition,
       publication_statement, physical_description, subject, call_number, isbn,
       digital_content_url, marc_data, rda_data
    FROM katalog WHERE id = $1
    RETURNING id, bibid, title`, [id]);
  return result.rows[0] || null;
}

async function catalogizeBook(id, bibid) {
  const result = await query(`INSERT INTO katalog
      (book_id, bibid, material_type, title, creator, publication_statement, subject, call_number, isbn)
    SELECT b.id, $2, b.material_type, b.title, b.author,
      COALESCE(b.publisher, '') || COALESCE(', ' || b.publication_year, ''),
      COALESCE(b.subject, ''), COALESCE(b.call_number, ''), COALESCE(b.isbn, '')
    FROM buku b WHERE b.id = $1
    RETURNING id, bibid`, [id, bibid]);
  return result.rows[0] || null;
}

async function deleteRecord(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const record = await client.query('SELECT book_id FROM katalog WHERE id = $1 FOR UPDATE', [id]);
    if (!record.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    if (record.rows[0].book_id) {
      await client.query(`INSERT INTO buku_tidak_tampil_di_katalog (book_id) VALUES ($1)
        ON CONFLICT (book_id) DO NOTHING`, [record.rows[0].book_id]);
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
  const result = await query(`UPDATE katalog SET lifecycle_status = $2, updated_at = NOW()
    WHERE id = $1 RETURNING id`, [id, status]);
  return Boolean(result.rowCount);
}

async function listDigitalContent() {
  const result = await query(`SELECT d.id, d.catalog_record_id, d.file_name, d.mime_type,
      d.file_size, d.uploaded_at, c.bibid, c.title
    FROM konten_digital_katalog d
    JOIN katalog c ON c.id = d.catalog_record_id
    ORDER BY d.uploaded_at DESC, d.id DESC`);
  return result.rows;
}

async function addDigitalContent(recordId, { fileName, mimeType, fileData }) {
  const record = await query('SELECT id FROM katalog WHERE id = $1', [recordId]);
  if (!record.rowCount) return null;
  const result = await query(`INSERT INTO konten_digital_katalog
      (catalog_record_id, file_name, mime_type, file_size, file_data)
    VALUES ($1, $2, $3, $4, $5) RETURNING id, catalog_record_id, file_name, mime_type, file_size, uploaded_at`,
  [recordId, fileName, mimeType, fileData.length, fileData]);
  return result.rows[0] || null;
}

async function getDigitalContent(id) {
  const result = await query(`SELECT file_name, mime_type, file_data
    FROM konten_digital_katalog WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function deleteDigitalContent(id) {
  const result = await query('DELETE FROM konten_digital_katalog WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function listArticles(keyword = '') {
  const result = await query(`SELECT id, title, creator, subject, serial_edition, catalog_title,
      digital_content_url, created_at
    FROM artikel_katalog
    WHERE ($1 = '' OR title ILIKE '%' || $1 || '%' OR creator ILIKE '%' || $1 || '%')
    ORDER BY created_at DESC, id DESC LIMIT 500`, [keyword]);
  return result.rows;
}

async function saveArticle(item) {
  const result = item.id
    ? await query(`UPDATE artikel_katalog SET title = $2, creator = $3, subject = $4,
        serial_edition = $5, catalog_title = $6, digital_content_url = $7, updated_at = NOW()
      WHERE id = $1 RETURNING id, title`, [
      item.id, item.title, item.creator, item.subject, item.serial_edition,
      item.catalog_title, item.digital_content_url
    ])
    : await query(`INSERT INTO artikel_katalog
        (title, creator, subject, serial_edition, catalog_title, digital_content_url)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title`, [
      item.title, item.creator, item.subject, item.serial_edition,
      item.catalog_title, item.digital_content_url
    ]);
  return result.rows[0] || null;
}

async function deleteArticle(id) {
  const result = await query('DELETE FROM artikel_katalog WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function exportRecords(ids) {
  const result = await query(`SELECT bibid, record_type, material_type, title, subtitle,
      responsibility, creator, edition, publication_statement, physical_description,
      subject, call_number, isbn, marc_data, rda_data
    FROM katalog
    WHERE ($1::bigint[] IS NULL OR id = ANY($1::bigint[]))
    ORDER BY id`, [ids.length ? ids : null]);
  return result.rows;
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
