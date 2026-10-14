const PublicationModel = require('../models/PublicationModel');

const allowedPrograms = new Set(['all', 'TRL', 'PM', 'SVM']);

async function listPublications(req, res, next) {
  try {
    const requestedProgram = String(req.query.prodi || 'all').toUpperCase();
    const prodi = allowedPrograms.has(requestedProgram) ? requestedProgram : 'all';
    const result = await PublicationModel.listPublications({
      keyword: String(req.query.keyword || '').slice(0, 150),
      prodi,
      limit: Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listPublications };