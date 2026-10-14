const crypto = require('node:crypto');

const COOKIE_NAME = 'library_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

function getAdminConfiguration() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) {
    return null;
  }
  return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, secret: ADMIN_SESSION_SECRET };
}

function equalSecret(left, right) {
  const leftHash = crypto.createHash('sha256').update(left).digest();
  const rightHash = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function issueSession(username, secret) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_SECONDS * 1000
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const prefix = `${name}=`;
  const entry = cookies.find(cookie => cookie.trim().startsWith(prefix));
  return entry ? entry.trim().slice(prefix.length) : '';
}

function verifySession(req, configuration = getAdminConfiguration()) {
  if (!configuration) return null;
  const [payload, signature, extra] = readCookie(req, COOKIE_NAME).split('.');
  if (!payload || !signature || extra !== undefined
    || !equalSecret(signature, sign(payload, configuration.secret))) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.username !== configuration.username
      || !Number.isFinite(session.expiresAt)
      || session.expiresAt <= Date.now()) {
      return null;
    }
    return session;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_SECONDS}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/api/admin; Max-Age=0`);
}

function requireAdmin(req, res, next) {
  const configuration = getAdminConfiguration();
  if (!configuration) {
    return res.status(503).json({ error: 'Login admin belum dikonfigurasi. Isi ADMIN_USERNAME, ADMIN_PASSWORD, dan ADMIN_SESSION_SECRET di backend/.env.' });
  }

  req.admin = verifySession(req, configuration);
  if (!req.admin) {
    return res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir. Silakan masuk kembali.' });
  }
  return next();
}

module.exports = {
  COOKIE_NAME,
  SESSION_SECONDS,
  clearSessionCookie,
  getAdminConfiguration,
  issueSession,
  requireAdmin,
  setSessionCookie,
  verifySession,
  equalSecret
};
