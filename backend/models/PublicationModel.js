const { query } = require('../config/db');

async function listPublications({ keyword = '', prodi = 'all', limit = 100 }) {
  const params = [keyword.trim(), prodi, limit];
  const whereClause = `($1 = '' OR title ILIKE '%' || $1 || '%'
      OR authors ILIKE '%' || $1 || '%' OR COALESCE(journal, '') ILIKE '%' || $1 || '%'
      OR COALESCE(keywords, '') ILIKE '%' || $1 || '%')
    AND ($2 = 'all' OR prodi = $2)`;
  const [countResult, publicationsResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM publications WHERE ${whereClause}`, params.slice(0, 2)),
    query(`SELECT id, title, authors, prodi, journal, publication_year, ranking, doi,
                  volume_info, keywords, abstract, file_url, created_at
           FROM publications
           WHERE ${whereClause}
           ORDER BY publication_year DESC NULLS LAST, id DESC
           LIMIT $3`, params)
  ]);

  return { items: publicationsResult.rows, total: countResult.rows[0].total };
}

module.exports = { listPublications };