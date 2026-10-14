const BookModel = require('../models/BookModel');

const allowedFields = new Set(['judul', 'pengarang', 'subjek', 'isbn']);
const allowedMaterials = new Set(['all', 'buku', 'ta', 'jurnal', 'modul']);

async function searchBooks(req, res, next) {
  try {
    const field = allowedFields.has(req.query.field) ? req.query.field : 'judul';
    const material = allowedMaterials.has(req.query.material) ? req.query.material : 'all';
    const order = req.path === '/popular' || req.query.order === 'popular' ? 'popular' : 'latest';
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
    const result = await BookModel.listBooks({
      keyword: String(req.query.keyword || '').slice(0, 150),
      field,
      material,
      order,
      limit
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { searchBooks };