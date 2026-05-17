const { rateLimit } = require('express-rate-limit');

function createLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });
}

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many registration attempts. Please try again later.',
});

const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many password reset requests. Please try again later.',
});

const resetPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many password reset attempts. Please try again later.',
});

const changePasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many password change attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

const resumeUploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: 'Too many resume uploads. Please try again later.',
});

const writingImproverLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many writing improvement requests. Please try again later.',
});

const pdfExportLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many PDF export requests. Please try again later.',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
  resumeUploadLimiter,
  writingImproverLimiter,
  pdfExportLimiter,
};
