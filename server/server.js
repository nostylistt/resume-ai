require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');

const app = express();
const trustProxyValue = process.env.TRUST_PROXY;

if (typeof trustProxyValue === 'string' && trustProxyValue.length > 0) {
  const parsedTrustProxy = Number(trustProxyValue);
  app.set('trust proxy', Number.isNaN(parsedTrustProxy) ? trustProxyValue : parsedTrustProxy);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://resumatch.fun',
  'https://www.resumatch.fun',
];

const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? undefined : false,
  referrerPolicy: {
    policy: 'no-referrer',
  },
}));
app.disable('x-powered-by');
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/resume', resumeRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
