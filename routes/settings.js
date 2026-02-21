const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/settings — Get current (latest) fuel settings for this user
router.get('/', (req, res) => {
  try {
    const settings = db.prepare(`
      SELECT * FROM fuel_settings_history
      WHERE user_id = ?
      ORDER BY effective_from DESC, id DESC
      LIMIT 1
    `).get(req.userId);

    res.json({
      configured: !!settings,
      settings: settings || null,
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/for-date?date=YYYY-MM-DD — Get settings effective on a specific date
router.get('/for-date', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter required' });
    }

    const settings = db.prepare(`
      SELECT * FROM fuel_settings_history
      WHERE effective_from <= ? AND user_id = ?
      ORDER BY effective_from DESC, id DESC
      LIMIT 1
    `).get(date, req.userId);

    res.json({
      date,
      settings: settings || null,
    });
  } catch (err) {
    console.error('Error fetching settings for date:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/history — Get all settings changes for this user
router.get('/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM fuel_settings_history
      WHERE user_id = ?
      ORDER BY effective_from DESC, id DESC
    `).all(req.userId);

    res.json(history);
  } catch (err) {
    console.error('Error fetching settings history:', err);
    res.status(500).json({ error: 'Failed to fetch settings history' });
  }
});

// POST /api/settings — Create/update fuel settings for this user
router.post('/', (req, res) => {
  try {
    const { fuel_efficiency_kmpl, fuel_price_per_liter, effective_from } = req.body;
    const errors = [];

    if (fuel_efficiency_kmpl === undefined || fuel_efficiency_kmpl <= 0) {
      errors.push('fuel_efficiency_kmpl must be > 0');
    }
    if (fuel_price_per_liter === undefined || fuel_price_per_liter <= 0) {
      errors.push('fuel_price_per_liter must be > 0');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Default effective_from is today
    const today = new Date();
    const effectiveDate = effective_from || (
      today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0')
    );

    const result = db.prepare(`
      INSERT INTO fuel_settings_history (user_id, fuel_efficiency_kmpl, fuel_price_per_liter, effective_from)
      VALUES (?, ?, ?, ?)
    `).run(req.userId, fuel_efficiency_kmpl, fuel_price_per_liter, effectiveDate);

    const settings = db.prepare('SELECT * FROM fuel_settings_history WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(settings);
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
