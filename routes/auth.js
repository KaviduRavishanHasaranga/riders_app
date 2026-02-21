const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '30d'; // Token valid for 30 days

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!email || !email.includes('@')) errors.push('Valid email is required');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), passwordHash);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me — Get current user profile (requires auth)
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
