const toApiRow = require('../models/mapDatabaseRow');
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
    const [summaryResult, popularBooksResult, requestsResult, circulationResult] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*)::int FROM buku) AS title_count,
        (SELECT COALESCE(SUM(total_eksemplar), 0)::int FROM buku) AS copy_count,
        (SELECT COALESCE(SUM(eksemplar_tersedia), 0)::int FROM buku) AS available_count,
        (SELECT COUNT(*)::int FROM konten_digital_katalog) AS digital_content_count,
        (SELECT COUNT(*)::int FROM anggota) AS member_count,
        (SELECT COUNT(*)::int FROM publikasi) AS publication_count,
        (SELECT COUNT(*)::int FROM permohonan_layanan WHERE status = 'pending') AS pending_requests`),
      query(`SELECT id, judul, jumlah_peminjaman
        FROM buku
        ORDER BY jumlah_peminjaman DESC, judul ASC
        LIMIT 5`),
      query(`SELECT id, nama_lengkap, jenis_layanan, status, waktu_dibuat
        FROM permohonan_layanan
        ORDER BY waktu_dibuat DESC, id DESC
        LIMIT 5`),
      query(`SELECT
        (COUNT(DISTINCT judul) FILTER (WHERE tanggal_dikembalikan IS NULL))::int AS borrowed_title_count,
        (COUNT(*) FILTER (WHERE tanggal_dikembalikan IS NULL))::int AS borrowed_copy_count,
        (COUNT(DISTINCT nomor_anggota) FILTER (WHERE tanggal_dikembalikan IS NULL))::int AS borrowed_member_count,
        (COUNT(DISTINCT judul) FILTER (WHERE tanggal_dikembalikan IS NOT NULL))::int AS returned_title_count,
        (COUNT(*) FILTER (WHERE tanggal_dikembalikan IS NOT NULL))::int AS returned_copy_count,
        (COUNT(DISTINCT nomor_anggota) FILTER (WHERE tanggal_dikembalikan IS NOT NULL))::int AS returned_member_count
        FROM peminjaman`)
    ]);

    const circulation = circulationResult.rows[0];
    return res.json({
      summary: summaryResult.rows[0],
      circulation: {
        borrowed: {
          title_count: circulation.borrowed_title_count,
          copy_count: circulation.borrowed_copy_count,
          member_count: circulation.borrowed_member_count
        },
        returned: {
          title_count: circulation.returned_title_count,
          copy_count: circulation.returned_copy_count,
          member_count: circulation.returned_member_count
        }
      },
      visits: { available: false, member_count: null, non_member_count: null },
      onsiteReading: { available: false, title_count: null, copy_count: null, member_count: null, non_member_count: null },
      popularBooks: popularBooksResult.rows.map(toApiRow),
      recentRequests: requestsResult.rows.map(toApiRow)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOverview, getSession, login, logout };
