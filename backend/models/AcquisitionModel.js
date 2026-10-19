const { pool, query } = require('../config/db');

async function listSources() {
  const result = await query(`SELECT id, name, address, phone, exemplar_count, created_at
    FROM acquisition_sources ORDER BY name, id`);
  return result.rows;
}

async function saveSource({ id, name, address, phone, exemplar_count }) {
  const result = id
    ? await query(`UPDATE acquisition_sources
        SET name = $2, address = $3, phone = $4, exemplar_count = $5, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, address, phone, exemplar_count`, [id, name, address, phone, exemplar_count])
    : await query(`INSERT INTO acquisition_sources (name, address, phone, exemplar_count)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, address, phone, exemplar_count`, [name, address, phone, exemplar_count]);
  return result.rows[0] || null;
}

async function deleteSource(id) {
  const result = await query('DELETE FROM acquisition_sources WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function listCollections(status, keyword = '') {
  const result = await query(`SELECT a.id, b.id AS book_id, a.source_id, a.record_type, a.accession_no,
      a.barcode, a.rfid, COALESCE(a.acquisition_date, b.created_at::date) AS acquisition_date,
      COALESCE(a.quantity, b.total_copies) AS quantity, COALESCE(a.physical_form, 'Buku') AS physical_form,
      COALESCE(a.access_type, 'Dapat dipinjam') AS access_type, COALESCE(a.location, b.shelf_location, '') AS location,
      COALESCE(a.lifecycle_status, 'in_stock') AS lifecycle_status, a.rda_metadata,
      (a.id IS NULL) AS is_legacy, b.title, b.author, b.publisher, b.publication_year,
      b.isbn, b.material_type, b.category, s.name AS source_name
    FROM books b
    LEFT JOIN acquisitions a ON a.book_id = b.id
    LEFT JOIN acquisition_sources s ON s.id = a.source_id
    WHERE ($1 = 'all' OR COALESCE(a.lifecycle_status, 'in_stock') = $1)
      AND ($2 = '' OR b.title ILIKE '%' || $2 || '%' OR b.author ILIKE '%' || $2 || '%'
        OR a.barcode ILIKE '%' || $2 || '%' OR a.accession_no ILIKE '%' || $2 || '%')
    ORDER BY COALESCE(a.acquisition_date, b.created_at::date) DESC, COALESCE(a.id, b.id) DESC
    LIMIT 500`, [status, keyword]);
  return result.rows;
}

async function insertAcquisition(client, item) {
  const bookResult = await client.query(`INSERT INTO books
      (isbn, title, author, publisher, publication_year, material_type, category, subject,
       call_number, shelf_location, total_copies, available_copies)
    VALUES (NULLIF($1, ''), $2, $3, NULLIF($4, ''), $5, $6, NULLIF($7, ''), NULLIF($8, ''),
       NULLIF($9, ''), NULLIF($10, ''), $11, $11)
    ON CONFLICT (isbn) DO UPDATE SET
      title = EXCLUDED.title, author = EXCLUDED.author,
      publisher = COALESCE(EXCLUDED.publisher, books.publisher),
      publication_year = COALESCE(EXCLUDED.publication_year, books.publication_year),
      material_type = EXCLUDED.material_type,
      category = COALESCE(EXCLUDED.category, books.category),
      subject = COALESCE(EXCLUDED.subject, books.subject),
      call_number = COALESCE(EXCLUDED.call_number, books.call_number),
      shelf_location = COALESCE(EXCLUDED.shelf_location, books.shelf_location),
      total_copies = books.total_copies + EXCLUDED.total_copies,
      available_copies = books.available_copies + EXCLUDED.available_copies,
      updated_at = NOW()
    RETURNING id`, [
    item.isbn, item.title, item.author, item.publisher, item.publication_year,
    item.material_type, item.category, item.subject, item.call_number,
    item.location, item.quantity
  ]);

  const result = await client.query(`INSERT INTO acquisitions
      (book_id, source_id, record_type, accession_no, barcode, rfid, acquisition_date,
       quantity, physical_form, access_type, location, lifecycle_status, rda_metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'in_stock', $12::jsonb)
    RETURNING id`, [
    bookResult.rows[0].id, item.source_id, item.record_type, item.accession_no,
    item.barcode, item.rfid, item.acquisition_date, item.quantity,
    item.physical_form, item.access_type, item.location, JSON.stringify(item.rda_metadata)
  ]);
  return result.rows[0];
}

async function createAcquisition(item) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await insertAcquisition(client, item);
    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function importAcquisitions(items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const imported = [];
    for (const item of items) imported.push(await insertAcquisition(client, item));
    await client.query('COMMIT');
    return imported;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateLifecycle(id, status) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT book_id, quantity, lifecycle_status FROM acquisitions
      WHERE id = $1 FOR UPDATE`, [id]);
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const acquisition = current.rows[0];
    if (acquisition.lifecycle_status !== status) {
      const allowedTransitions = {
        in_stock: ['basket', 'quarantine'],
        basket: ['in_stock', 'quarantine'],
        quarantine: ['in_stock', 'basket'],
        shipped: []
      };
      if (!allowedTransitions[acquisition.lifecycle_status].includes(status)) {
        const error = new Error('Perubahan status koleksi tidak diizinkan.');
        error.statusCode = 400;
        throw error;
      }
      const difference = (status === 'in_stock' ? acquisition.quantity : 0)
        - (acquisition.lifecycle_status === 'in_stock' ? acquisition.quantity : 0);
      await client.query(`UPDATE books SET available_copies = GREATEST(0, available_copies + $2),
        updated_at = NOW() WHERE id = $1`, [acquisition.book_id, difference]);
      await client.query(`UPDATE acquisitions SET lifecycle_status = $2, updated_at = NOW()
        WHERE id = $1`, [id, status]);
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteAcquisition(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`DELETE FROM acquisitions
      WHERE id = $1 RETURNING book_id, quantity, lifecycle_status`, [id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const item = result.rows[0];
    await client.query(`UPDATE books SET total_copies = GREATEST(0, total_copies - $2),
      available_copies = GREATEST(0, available_copies - $3), updated_at = NOW()
      WHERE id = $1`, [
      item.book_id, item.quantity, item.lifecycle_status === 'in_stock' ? item.quantity : 0
    ]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listBindings() {
  const result = await query(`SELECT cb.id, cb.book_id, cb.binding_year, cb.volume_number,
      cb.quantity, b.title, b.author
    FROM collection_bindings cb JOIN books b ON b.id = cb.book_id
    ORDER BY cb.binding_year DESC, cb.id DESC`);
  return result.rows;
}

async function createBinding({ book_id, binding_year, volume_number, quantity }) {
  const result = await query(`INSERT INTO collection_bindings
      (book_id, binding_year, volume_number, quantity)
    VALUES ($1, $2, $3, $4) RETURNING id, book_id, binding_year, volume_number, quantity`,
  [book_id, binding_year, volume_number, quantity]);
  return result.rows[0];
}

async function listPeriodicals() {
  const result = await query(`SELECT p.id, p.bibid, p.title, p.author, p.publication_place,
      p.publisher, p.publication_year, COUNT(i.id)::int AS issue_count,
      COALESCE(SUM(i.copies), 0)::int AS copies
    FROM periodical_titles p LEFT JOIN periodical_issues i ON i.periodical_id = p.id
    GROUP BY p.id ORDER BY p.title`);
  return result.rows;
}

async function savePeriodical(item) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO periodical_titles
        (bibid, title, author, publication_place, publisher, publication_year)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [item.bibid, item.title, item.author, item.publication_place, item.publisher, item.publication_year]);
    let issue = null;
    if (item.issue_number) {
      issue = (await client.query(`INSERT INTO periodical_issues
          (periodical_id, volume, issue_number, publication_date, received_date, copies)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [result.rows[0].id, item.volume, item.issue_number, item.publication_date || null,
        item.received_date, item.copies])).rows[0];
    }
    await client.query('COMMIT');
    return { id: result.rows[0].id, issue };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listProposals() {
  const result = await query(`SELECT id, title, author, publisher, requester, member_number,
      status, requested_at FROM collection_proposals ORDER BY requested_at DESC, id DESC`);
  return result.rows;
}

async function createProposal(item) {
  const result = await query(`INSERT INTO collection_proposals
      (title, author, publisher, requester, member_number)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, title, author, publisher, requester, member_number, status, requested_at`,
  [item.title, item.author, item.publisher, item.requester, item.member_number]);
  return result.rows[0];
}

async function updateProposalStatus(id, status) {
  const result = await query(`UPDATE collection_proposals SET status = $2, updated_at = NOW()
    WHERE id = $1 RETURNING id`, [id, status]);
  return Boolean(result.rowCount);
}

async function listShipments() {
  const result = await query(`SELECT s.id, s.destination, s.sent_at, s.status,
      COUNT(si.acquisition_id)::int AS item_count
    FROM acquisition_shipments s LEFT JOIN acquisition_shipment_items si ON si.shipment_id = s.id
    GROUP BY s.id ORDER BY s.sent_at DESC, s.id DESC`);
  return result.rows;
}

async function createShipment(destination, acquisitionIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT id FROM acquisitions
      WHERE id = ANY($1::bigint[]) AND lifecycle_status = 'basket'
      FOR UPDATE`, [acquisitionIds]);
    if (locked.rowCount !== acquisitionIds.length) {
      const error = new Error('Koleksi keranjang berubah atau tidak tersedia. Muat ulang daftar dan coba lagi.');
      error.statusCode = 400;
      throw error;
    }
    const shipment = await client.query(`INSERT INTO acquisition_shipments (destination)
      VALUES ($1) RETURNING id, destination, sent_at, status`, [destination]);
    for (const id of acquisitionIds) {
      await client.query(`INSERT INTO acquisition_shipment_items (shipment_id, acquisition_id)
        VALUES ($1, $2)`, [shipment.rows[0].id, id]);
    }
    await client.query(`UPDATE acquisitions SET lifecycle_status = 'shipped', updated_at = NOW()
      WHERE id = ANY($1::bigint[])`, [acquisitionIds]);
    await client.query('COMMIT');
    return shipment.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createAcquisition,
  createBinding,
  createProposal,
  createShipment,
  deleteAcquisition,
  deleteSource,
  importAcquisitions,
  listBindings,
  listCollections,
  listPeriodicals,
  listProposals,
  listShipments,
  listSources,
  savePeriodical,
  saveSource,
  updateLifecycle,
  updateProposalStatus
};
