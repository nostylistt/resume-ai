const AUTH_COOKIE_NAME = 'resumatch_auth';

function normalizeSameSite(value) {
  const normalized = String(value || 'lax').toLowerCase();

  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return 'lax';
}

function isSecureCookie(sameSite) {
  if (process.env.AUTH_COOKIE_SECURE === 'true') return true;
  if (process.env.AUTH_COOKIE_SECURE === 'false') return false;
  if (sameSite === 'none') return true;
  return process.env.NODE_ENV === 'production';
}

function buildAuthCookieOptions({ rememberMe = false } = {}) {
  const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  const secure = isSecureCookie(sameSite);
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge,
  };
}

function buildClearCookieOptions() {
  const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  const secure = isSecureCookie(sameSite);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function extractAuthToken(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

module.exports = {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildClearCookieOptions,
  extractAuthToken,
};
