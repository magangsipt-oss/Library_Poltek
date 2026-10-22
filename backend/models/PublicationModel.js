const toApiRow = require('./mapDatabaseRow');
const { query } = require('../config/db');

async function listPublications({ keyword = '', prodi = 'all', limit = 100 }) {
  const params = [keyword.trim(), prodi, limit];
  const whereClause = `($1 = '' OR judul ILIKE '%' || $1 || '%'
      OR para_penulis ILIKE '%' || $1 || '%' OR COALESCE(jurnal, '') ILIKE '%' || $1 || '%'
      OR COALESCE(kata_kunci, '') ILIKE '%' || $1 || '%')
    AND ($2 = 'all' OR prodi = $2)`;
  const [countResult, publicationsResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM publikasi WHERE ${whereClause}`, params.slice(0, 2)),
    query(`SELECT id, judul, para_penulis, prodi, jurnal, tahun_terbit, peringkat, doi,
                  informasi_volume, kata_kunci, abstrak, url_berkas, waktu_dibuat
           FROM publikasi
           WHERE ${whereClause}
           ORDER BY tahun_terbit DESC NULLS LAST, id DESC
           LIMIT $3`, params)
  ]);

  return { items: publicationsResult.rows.map(toApiRow), total: countResult.rows[0].total };
}

module.exports = { listPublications };