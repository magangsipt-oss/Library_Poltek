const toApiRow = require('./mapDatabaseRow');
const { pool, query } = require('../config/db');

async function listSources() {
  const result = await query(`SELECT id, nama, alamat, telepon, jumlah_eksemplar, waktu_dibuat
    FROM sumber_perolehan ORDER BY nama, id`);
  return result.rows.map(toApiRow);
}

async function saveSource({ id, name, address, phone, exemplar_count }) {
  const result = id
    ? await query(`UPDATE sumber_perolehan
        SET nama = $2, alamat = $3, telepon = $4, jumlah_eksemplar = $5, waktu_diperbarui = NOW()
        WHERE id = $1
        RETURNING id, nama, alamat, telepon, jumlah_eksemplar`, [id, name, address, phone, exemplar_count])
    : await query(`INSERT INTO sumber_perolehan (nama, alamat, telepon, jumlah_eksemplar)
        VALUES ($1, $2, $3, $4)
        RETURNING id, nama, alamat, telepon, jumlah_eksemplar`, [name, address, phone, exemplar_count]);
  return toApiRow(result.rows[0]) || null;
}

async function deleteSource(id) {
  const result = await query('DELETE FROM sumber_perolehan WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rowCount);
}

async function listCollections(status, keyword = '') {
  const result = await query(`SELECT a.id, b.id AS id_buku, a.id_sumber_perolehan, a.jenis_rekaman, a.nomor_induk,
      a.kode_batang, a.rfid, COALESCE(a.tanggal_perolehan, b.waktu_dibuat::date) AS tanggal_perolehan,
      COALESCE(a.jumlah, b.total_eksemplar) AS jumlah, COALESCE(a.bentuk_fisik, 'Buku') AS bentuk_fisik,
      COALESCE(a.jenis_akses, 'Dapat dipinjam') AS jenis_akses, COALESCE(a.lokasi, b.lokasi_rak, '') AS lokasi,
      COALESCE(a.status_koleksi, 'in_stock') AS status_koleksi, a.metadata_rda,
      (a.id IS NULL) AS is_legacy, b.judul, b.pengarang, b.penerbit, b.tahun_terbit,
      b.isbn, b.jenis_bahan, b.kategori, s.nama AS source_name
    FROM buku b
    LEFT JOIN akuisisi a ON a.id_buku = b.id
    LEFT JOIN sumber_perolehan s ON s.id = a.id_sumber_perolehan
    WHERE ($1 = 'all' OR COALESCE(a.status_koleksi, 'in_stock') = $1)
      AND ($2 = '' OR b.judul ILIKE '%' || $2 || '%' OR b.pengarang ILIKE '%' || $2 || '%'
        OR a.kode_batang ILIKE '%' || $2 || '%' OR a.nomor_induk ILIKE '%' || $2 || '%')
    ORDER BY COALESCE(a.tanggal_perolehan, b.waktu_dibuat::date) DESC, COALESCE(a.id, b.id) DESC
    LIMIT 500`, [status, keyword]);
  return result.rows.map(toApiRow);
}

async function insertAcquisition(client, item) {
  const bookResult = await client.query(`INSERT INTO buku
      (isbn, judul, pengarang, penerbit, tahun_terbit, jenis_bahan, kategori, subjek,
       nomor_panggil, lokasi_rak, total_eksemplar, eksemplar_tersedia)
    VALUES (NULLIF($1, ''), $2, $3, NULLIF($4, ''), $5, $6, NULLIF($7, ''), NULLIF($8, ''),
       NULLIF($9, ''), NULLIF($10, ''), $11, $11)
    ON CONFLICT (isbn) DO UPDATE SET
      judul = EXCLUDED.judul, pengarang = EXCLUDED.pengarang,
      penerbit = COALESCE(EXCLUDED.penerbit, buku.penerbit),
      tahun_terbit = COALESCE(EXCLUDED.tahun_terbit, buku.tahun_terbit),
      jenis_bahan = EXCLUDED.jenis_bahan,
      kategori = COALESCE(EXCLUDED.kategori, buku.kategori),
      subjek = COALESCE(EXCLUDED.subjek, buku.subjek),
      nomor_panggil = COALESCE(EXCLUDED.nomor_panggil, buku.nomor_panggil),
      lokasi_rak = COALESCE(EXCLUDED.lokasi_rak, buku.lokasi_rak),
      total_eksemplar = buku.total_eksemplar + EXCLUDED.total_eksemplar,
      eksemplar_tersedia = buku.eksemplar_tersedia + EXCLUDED.eksemplar_tersedia,
      waktu_diperbarui = NOW()
    RETURNING id`, [
    item.isbn, item.title, item.author, item.publisher, item.publication_year,
    item.material_type, item.category, item.subject, item.call_number,
    item.location, item.quantity
  ]);

  const result = await client.query(`INSERT INTO akuisisi
      (id_buku, id_sumber_perolehan, jenis_rekaman, nomor_induk, kode_batang, rfid, tanggal_perolehan,
       jumlah, bentuk_fisik, jenis_akses, lokasi, status_koleksi, metadata_rda)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'in_stock', $12::jsonb)
    RETURNING id`, [
    bookResult.rows[0].id, item.source_id, item.record_type, item.accession_no,
    item.barcode, item.rfid, item.acquisition_date, item.quantity,
    item.physical_form, item.access_type, item.location, JSON.stringify(item.rda_metadata)
  ]);
  return toApiRow(result.rows[0]);
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
    const current = await client.query(`SELECT id_buku, jumlah, status_koleksi FROM akuisisi
      WHERE id = $1 FOR UPDATE`, [id]);
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const acquisition = toApiRow(current.rows[0]);
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
      await client.query(`UPDATE buku SET eksemplar_tersedia = GREATEST(0, eksemplar_tersedia + $2),
        waktu_diperbarui = NOW() WHERE id = $1`, [acquisition.book_id, difference]);
      await client.query(`UPDATE akuisisi SET status_koleksi = $2, waktu_diperbarui = NOW()
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
    const result = await client.query(`DELETE FROM akuisisi
      WHERE id = $1 RETURNING id_buku, jumlah, status_koleksi`, [id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const item = toApiRow(result.rows[0]);
    await client.query(`UPDATE buku SET total_eksemplar = GREATEST(0, total_eksemplar - $2),
      eksemplar_tersedia = GREATEST(0, eksemplar_tersedia - $3), waktu_diperbarui = NOW()
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
  const result = await query(`SELECT cb.id, cb.id_buku, cb.tahun_jilid, cb.nomor_jilid,
      cb.jumlah, b.judul, b.pengarang
    FROM jilid_koleksi cb JOIN buku b ON b.id = cb.id_buku
    ORDER BY cb.tahun_jilid DESC, cb.id DESC`);
  return result.rows.map(toApiRow);
}

async function createBinding({ book_id, binding_year, volume_number, quantity }) {
  const result = await query(`INSERT INTO jilid_koleksi
      (id_buku, tahun_jilid, nomor_jilid, jumlah)
    VALUES ($1, $2, $3, $4) RETURNING id, id_buku, tahun_jilid, nomor_jilid, jumlah`,
  [book_id, binding_year, volume_number, quantity]);
  return toApiRow(result.rows[0]);
}

async function listPeriodicals() {
  const result = await query(`SELECT p.id, p.bibid, p.judul, p.pengarang, p.tempat_terbit,
      p.penerbit, p.tahun_terbit, COUNT(i.id)::int AS issue_count,
      COALESCE(SUM(i.eksemplar), 0)::int AS eksemplar
    FROM judul_terbitan_berkala p LEFT JOIN edisi_terbitan_berkala i ON i.id_terbitan_berkala = p.id
    GROUP BY p.id ORDER BY p.judul`);
  return result.rows.map(toApiRow);
}

async function savePeriodical(item) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO judul_terbitan_berkala
        (bibid, judul, pengarang, tempat_terbit, penerbit, tahun_terbit)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [item.bibid, item.title, item.author, item.publication_place, item.publisher, item.publication_year]);
    let issue = null;
    if (item.issue_number) {
      issue = (await client.query(`INSERT INTO edisi_terbitan_berkala
          (id_terbitan_berkala, volume, nomor_edisi, tanggal_terbit, tanggal_diterima, eksemplar)
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
  const result = await query(`SELECT id, judul, pengarang, penerbit, pengusul, nomor_anggota,
      status, waktu_diusulkan FROM usulan_koleksi ORDER BY waktu_diusulkan DESC, id DESC`);
  return result.rows.map(toApiRow);
}

async function createProposal(item) {
  const result = await query(`INSERT INTO usulan_koleksi
      (judul, pengarang, penerbit, pengusul, nomor_anggota)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, judul, pengarang, penerbit, pengusul, nomor_anggota, status, waktu_diusulkan`,
  [item.title, item.author, item.publisher, item.requester, item.member_number]);
  return toApiRow(result.rows[0]);
}

async function updateProposalStatus(id, status) {
  const result = await query(`UPDATE usulan_koleksi SET status = $2, waktu_diperbarui = NOW()
    WHERE id = $1 RETURNING id`, [id, status]);
  return Boolean(result.rowCount);
}

async function listShipments() {
  const result = await query(`SELECT s.id, s.tujuan, s.waktu_dikirim, s.status,
      COUNT(si.id_akuisisi)::int AS item_count
    FROM pengiriman_koleksi s LEFT JOIN rincian_pengiriman_koleksi si ON si.id_pengiriman = s.id
    GROUP BY s.id ORDER BY s.waktu_dikirim DESC, s.id DESC`);
  return result.rows.map(toApiRow);
}

async function createShipment(destination, acquisitionIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT id FROM akuisisi
      WHERE id = ANY($1::bigint[]) AND status_koleksi = 'basket'
      FOR UPDATE`, [acquisitionIds]);
    if (locked.rowCount !== acquisitionIds.length) {
      const error = new Error('Koleksi keranjang berubah atau tidak tersedia. Muat ulang daftar dan coba lagi.');
      error.statusCode = 400;
      throw error;
    }
    const shipment = await client.query(`INSERT INTO pengiriman_koleksi (tujuan)
      VALUES ($1) RETURNING id, tujuan, waktu_dikirim, status`, [destination]);
    for (const id of acquisitionIds) {
      await client.query(`INSERT INTO rincian_pengiriman_koleksi (id_pengiriman, id_akuisisi)
        VALUES ($1, $2)`, [shipment.rows[0].id, id]);
    }
    await client.query(`UPDATE akuisisi SET status_koleksi = 'shipped', waktu_diperbarui = NOW()
      WHERE id = ANY($1::bigint[])`, [acquisitionIds]);
    await client.query('COMMIT');
    return toApiRow(shipment.rows[0]);
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
