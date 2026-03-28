const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const register = async (req, res) => {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
        return res.status(400).json({ message: 'Всі поля обов’язкові' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
            [email, passwordHash, fullName]
        );

        const token = jwt.sign(
            { id: newUser.rows[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
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

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: expiresIn }
        );

        res.json({
            token,
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

const getMe = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Немає токена' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT id, email, full_name, created_at FROM users WHERE id = $1', [decoded.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(401).json({ message: 'Токен недійсний' });
    }
};

module.exports = {
    register,
    login,
    getMe
};
