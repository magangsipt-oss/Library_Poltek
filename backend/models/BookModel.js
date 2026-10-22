const toApiRow = require('./mapDatabaseRow');
const { query } = require('../config/db');

const searchExpressions = {
  judul: "COALESCE(judul, '')",
  pengarang: "COALESCE(pengarang, '')",
  subjek: "COALESCE(subjek, '') || ' ' || COALESCE(kategori, '')",
  isbn: "COALESCE(isbn, '') || ' ' || COALESCE(nomor_panggil, '')"
};

async function listBooks({ keyword = '', field = 'judul', material = 'all', order = 'latest', limit = 100 }) {
  const searchExpression = searchExpressions[field] || searchExpressions.judul;
  const orderExpression = order === 'popular'
    ? 'jumlah_peminjaman DESC, judul ASC'
    : 'waktu_dibuat DESC, id DESC';
  const params = [keyword.trim(), material, limit];
  const whereClause = `($1 = '' OR ${searchExpression} ILIKE '%' || $1 || '%')
    AND ($2 = 'all' OR jenis_bahan = $2)`;
  const [countResult, booksResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM buku WHERE ${whereClause}`, params.slice(0, 2)),
    query(`SELECT id, isbn, judul, pengarang, penerbit, tahun_terbit, jenis_bahan,
                  kategori, subjek, nomor_panggil, lokasi_rak, deskripsi, url_sampul,
                  total_eksemplar, eksemplar_tersedia, jumlah_peminjaman, waktu_dibuat
           FROM buku
           WHERE ${whereClause}
           ORDER BY ${orderExpression}
           LIMIT $3`, params)
  ]);

  return { items: booksResult.rows.map(toApiRow), total: countResult.rows[0].total };
}

module.exports = { listBooks };