const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { env } = require('../config/env');
const {
    AUTH_COOKIE_NAME,
    buildAuthCookieOptions,
    buildClearCookieOptions,
} = require('../config/auth');
const {
    createPasswordResetRequest,
    resetPassword,
} = require('../services/passwordResetService');

function createAuthToken(userId, expiresIn) {
    return jwt.sign(
        { id: userId },
        env.jwtSecret,
        { expiresIn }
    );
}

function validatePassword(value) {
    return String(value || '').trim().length >= 8;
}

const register = async (req, res) => {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
        return res.status(400).json({ message: 'Всі поля обов\'язкові' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Користувач з цим email вже існує' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
            [email, passwordHash, fullName]
        );

        const token = createAuthToken(newUser.rows[0].id, '24h');
        res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions());

        res.status(201).json({
            user: newUser.rows[0],
            message: 'Реєстрація успішна'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

const login = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }

        const expiresIn = rememberMe ? '30d' : '24h';

        const token = createAuthToken(user.id, expiresIn);
        res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions({ rememberMe }));

        res.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                created_at: user.created_at
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

const logout = async (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, buildClearCookieOptions());
    return res.status(204).send();
};

const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Вкажіть email' });
    }

    try {
        await createPasswordResetRequest(email);
        return res.json({
            message: 'Успішно! Ми надіслали лист на вашу пошту.',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Не вдалося обробити запит на скидання пароля' });
    }
};

const performPasswordReset = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Потрібні токен і новий пароль' });
    }

    try {
        await resetPassword({ token, password });
        return res.json({ message: 'Пароль успішно змінено' });
    } catch (err) {
        if (err instanceof Error) {
            if (
                err.message === 'Посилання для скидання пароля недійсне або вже протерміноване' ||
                err.message === 'Пароль повинен містити щонайменше 8 символів' ||
                err.message === 'Токен для скидання пароля відсутній'
            ) {
                return res.status(400).json({ message: err.message });
            }
        }

        console.error(err);
        return res.status(500).json({ message: 'Не вдалося змінити пароль' });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Потрібні поточний і новий пароль' });
    }

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: 'Новий пароль має містити щонайменше 8 символів' });
    }

    try {
        const result = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        const user = result.rows[0];
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Поточний пароль невірний' });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);

        if (isSamePassword) {
            return res.status(400).json({ message: 'Новий пароль має відрізнятися від поточного' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
        await pool.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
            [user.id]
        );

        res.clearCookie(AUTH_COOKIE_NAME, buildClearCookieOptions());

        return res.json({ message: 'Пароль успішно змінено. Увійдіть з новим паролем.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Не вдалося змінити пароль' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    performPasswordReset,
    changePassword,
};
