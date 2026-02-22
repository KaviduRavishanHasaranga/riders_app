const express = require('express');
const router = express.Router();
const db = require('../db/database');

// --- Validation helper ---
function validateTrip(body) {
  const errors = [];
  if (!body.date) errors.push('date is required');
  if (!body.app_name) errors.push('app_name is required');
  if (!body.trip_type) errors.push('trip_type is required');
  if (body.distance_km === undefined || body.distance_km < 0) errors.push('distance_km must be >= 0');
  if (body.amount_received === undefined || body.amount_received < 0) errors.push('amount_received must be >= 0');
  if (body.fees === undefined || body.fees < 0) errors.push('fees must be >= 0');
  if (body.fuel_cost !== undefined && body.fuel_cost < 0) errors.push('fuel_cost must be >= 0');

  const validApps = ['Pickme', 'Helago', 'Uber', 'Other'];
  if (body.app_name && !validApps.includes(body.app_name)) {
    errors.push(`app_name must be one of: ${validApps.join(', ')}`);
  }

  const validTypes = ['Passenger', 'Goods'];
  if (body.trip_type && !validTypes.includes(body.trip_type)) {
    errors.push(`trip_type must be one of: ${validTypes.join(', ')}`);
  }

  return errors;
}

// POST /api/trips — Create a new trip
router.post('/', (req, res) => {
  try {
    const errors = validateTrip(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { date, trip_time = '', trip_id = '', app_name, trip_type, distance_km, amount_received, fees, fuel_cost = 0, notes = '' } = req.body;
    const net_profit = amount_received - fees - fuel_cost;

    const stmt = db.prepare(`
      INSERT INTO trips (user_id, date, trip_time, trip_id, app_name, trip_type, distance_km, amount_received, fees, fuel_cost, net_profit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.userId, date, trip_time, trip_id, app_name, trip_type, distance_km, amount_received, fees, fuel_cost, net_profit, notes);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(trip);
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// GET /api/trips — List all trips (with optional filters)
router.get('/', (req, res) => {
  try {
    let query = 'SELECT * FROM trips WHERE user_id = ?';
    const params = [req.userId];

    if (req.query.date) {
      query += ' AND date = ?';
      params.push(req.query.date);
    }
    if (req.query.start_date && req.query.end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(req.query.start_date, req.query.end_date);
    }
    if (req.query.app_name) {
      query += ' AND app_name = ?';
      params.push(req.query.app_name);
    }
    if (req.query.trip_type) {
      query += ' AND trip_type = ?';
      params.push(req.query.trip_type);
    }

    query += ' ORDER BY date DESC, trip_time DESC, created_at DESC';

    const trips = db.prepare(query).all(...params);
    res.json(trips);
  } catch (err) {
    console.error('Error fetching trips:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:id — Get a single trip
router.get('/:id', (req, res) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (err) {
    console.error('Error fetching trip:', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// PUT /api/trips/:id — Update a trip
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const errors = validateTrip(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { date, trip_time = '', trip_id = '', app_name, trip_type, distance_km, amount_received, fees, fuel_cost = 0, notes = '' } = req.body;
    const net_profit = amount_received - fees - fuel_cost;

    const stmt = db.prepare(`
      UPDATE trips
      SET date = ?, trip_time = ?, trip_id = ?, app_name = ?, trip_type = ?, distance_km = ?, amount_received = ?,
          fees = ?, fuel_cost = ?, net_profit = ?, notes = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(date, trip_time, trip_id, app_name, trip_type, distance_km, amount_received, fees, fuel_cost, net_profit, notes, req.params.id, req.userId);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    res.json(trip);
  } catch (err) {
    console.error('Error updating trip:', err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// DELETE /api/trips/:id — Delete a trip
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error('Error deleting trip:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

module.exports = router;
