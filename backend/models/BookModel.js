const { query } = require('../config/db');

const searchExpressions = {
  judul: "COALESCE(title, '')",
  pengarang: "COALESCE(author, '')",
  subjek: "COALESCE(subject, '') || ' ' || COALESCE(category, '')",
  isbn: "COALESCE(isbn, '') || ' ' || COALESCE(call_number, '')"
};

async function listBooks({ keyword = '', field = 'judul', material = 'all', order = 'latest', limit = 100 }) {
  const searchExpression = searchExpressions[field] || searchExpressions.judul;
  const orderExpression = order === 'popular'
    ? 'loan_count DESC, title ASC'
    : 'created_at DESC, id DESC';
  const params = [keyword.trim(), material, limit];
  const whereClause = `($1 = '' OR ${searchExpression} ILIKE '%' || $1 || '%')
    AND ($2 = 'all' OR material_type = $2)`;
  const [countResult, booksResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM buku WHERE ${whereClause}`, params.slice(0, 2)),
    query(`SELECT id, isbn, title, author, publisher, publication_year, material_type,
                  category, subject, call_number, shelf_location, description, cover_url,
                  total_copies, available_copies, loan_count, created_at
           FROM buku
           WHERE ${whereClause}
           ORDER BY ${orderExpression}
           LIMIT $3`, params)
  ]);

  return { items: booksResult.rows, total: countResult.rows[0].total };
}

module.exports = { listBooks };