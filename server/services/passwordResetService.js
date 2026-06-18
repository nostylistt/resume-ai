const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { env } = require('../config/env');
const { sendPasswordResetEmail } = require('./mailService');

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAppBaseUrl() {
  const configuredOrigin = env.appUrl || env.clientOrigins[0] || '';

  return configuredOrigin || 'http://localhost:5173';
}

async function createPasswordResetRequest(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const userResult = await pool.query(
    'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    return;
  }

  const user = userResult.rows[0];
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
      `,
      [user.id]
    );
    await client.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, tokenHash, expiresAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const resetUrl = `${getAppBaseUrl().replace(/\/+$/, '')}/?resetToken=${encodeURIComponent(rawToken)}`;

  await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  });
}

async function resetPassword({ token, password }) {
  const normalizedToken = String(token || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedToken) {
    throw new Error('Токен для скидання пароля відсутній');
  }

  if (normalizedPassword.length < 8) {
    throw new Error('Пароль повинен містити щонайменше 8 символів');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const tokenHash = hashResetToken(normalizedToken);
    const tokenResult = await client.query(
      `
        SELECT id, user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        FOR UPDATE
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Посилання для скидання пароля недійсне або вже протерміноване');
    }

    const resetToken = tokenResult.rows[0];

    if (resetToken.used_at || new Date(resetToken.expires_at).getTime() <= Date.now()) {
      throw new Error('Посилання для скидання пароля недійсне або вже протерміноване');
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
      `,
      [resetToken.user_id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createPasswordResetRequest,
  resetPassword,
};
