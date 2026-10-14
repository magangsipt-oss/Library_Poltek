const { query } = require('../config/db');
const {
  clearSessionCookie,
  getAdminConfiguration,
  issueSession,
  setSessionCookie,
  equalSecret
} = require('../middleware/adminAuth');

function login(req, res) {
  const configuration = getAdminConfiguration();
  if (!configuration) {
    console.error('Login admin ditolak: konfigurasi ADMIN_USERNAME, ADMIN_PASSWORD, atau ADMIN_SESSION_SECRET belum lengkap.');
    return res.status(503).json({ error: 'Login admin belum dikonfigurasi. Periksa pengaturan di backend/.env.' });
  }

  const body = req.body || {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password
    || !equalSecret(username, configuration.username)
    || !equalSecret(password, configuration.password)) {
    return res.status(401).json({ error: 'Username atau kata sandi tidak sesuai.' });
  }

  setSessionCookie(res, issueSession(configuration.username, configuration.secret));
  return res.json({ user: { username: configuration.username } });
}

function logout(req, res) {
  clearSessionCookie(res);
  return res.status(204).end();
}

function getSession(req, res) {
  return res.json({ user: { username: req.admin.username } });
}

async function getOverview(req, res, next) {
  try {
    const [summaryResult, popularBooksResult, requestsResult] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*)::int FROM books) AS title_count,
        (SELECT COALESCE(SUM(total_copies), 0)::int FROM books) AS copy_count,
        (SELECT COALESCE(SUM(available_copies), 0)::int FROM books) AS available_count,
        (SELECT COUNT(*)::int FROM publications) AS publication_count,
        (SELECT COUNT(*)::int FROM service_requests WHERE status = 'pending') AS pending_requests`),
      query(`SELECT id, title, loan_count
        FROM books
        ORDER BY loan_count DESC, title ASC
        LIMIT 5`),
      query(`SELECT id, full_name, service_type, status, created_at
        FROM service_requests
        ORDER BY created_at DESC, id DESC
        LIMIT 5`)
    ]);

    return res.json({
      summary: summaryResult.rows[0],
      popularBooks: popularBooksResult.rows,
      recentRequests: requestsResult.rows
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOverview, getSession, login, logout };
