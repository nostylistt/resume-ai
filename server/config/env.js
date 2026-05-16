const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://resumatch.fun',
  'https://www.resumatch.fun',
];

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTrustProxy(value, isProduction) {
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return isProduction ? 1 : false;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const configuredOrigins = parseCsv(process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS);
const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];

const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 4000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, isProduction),
  jwtSecret: process.env.JWT_SECRET || '',
  appUrl: process.env.APP_URL || '',
  clientOrigins: configuredOrigins,
  allowedOrigins,
  db: {
    user: process.env.DB_USER || '',
    host: process.env.DB_HOST || '',
    database: process.env.DB_NAME || '',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 5432),
  },
  authCookie: {
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || '',
    secure: process.env.AUTH_COOKIE_SECURE || '',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
  },
};

module.exports = {
  env,
};
