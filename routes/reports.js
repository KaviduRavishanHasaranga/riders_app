const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/reports/dashboard — Today's overview (user-scoped)
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    const todayStats = db.prepare(`
      SELECT
        COUNT(*) as total_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(SUM(amount_received), 0) as total_earnings,
        COALESCE(SUM(fees), 0) as total_fees,
        COALESCE(SUM(fuel_cost), 0) as total_fuel_cost,
        COALESCE(SUM(net_profit), 0) as total_net_profit
      FROM trips
      WHERE date = ? AND user_id = ?
    `).get(todayStr, req.userId);

    const appBreakdown = db.prepare(`
      SELECT
        app_name,
        COUNT(*) as trips,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date = ? AND user_id = ?
      GROUP BY app_name
    `).all(todayStr, req.userId);

    res.json({
      date: todayStr,
      summary: todayStats,
      by_app: appBreakdown,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/reports/daily?date=YYYY-MM-DD — Daily report (user-scoped)
router.get('/daily', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(SUM(amount_received), 0) as total_earnings,
        COALESCE(SUM(fees), 0) as total_fees,
        COALESCE(SUM(fuel_cost), 0) as total_fuel_cost,
        COALESCE(SUM(net_profit), 0) as total_net_profit
      FROM trips
      WHERE date = ? AND user_id = ?
    `).get(date, req.userId);

    const trips = db.prepare(`
      SELECT * FROM trips WHERE date = ? AND user_id = ? ORDER BY trip_time DESC, created_at DESC
    `).all(date, req.userId);

    const appBreakdown = db.prepare(`
      SELECT
        app_name,
        COUNT(*) as trips,
        COALESCE(SUM(amount_received), 0) as earnings,
        COALESCE(SUM(fees), 0) as fees,
        COALESCE(SUM(fuel_cost), 0) as fuel_cost,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date = ? AND user_id = ?
      GROUP BY app_name
    `).all(date, req.userId);

    res.json({
      date,
      summary,
      trips,
      by_app: appBreakdown,
    });
  } catch (err) {
    console.error('Error fetching daily report:', err);
    res.status(500).json({ error: 'Failed to fetch daily report' });
  }
});

// GET /api/reports/monthly?year=YYYY&month=MM — Monthly report (user-scoped)
router.get('/monthly', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month query parameters are required' });
    }

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const rawSummary = db.prepare(`
      SELECT
        COUNT(*) as total_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(SUM(amount_received), 0) as total_earnings,
        COALESCE(SUM(fees), 0) as total_fees,
        COALESCE(SUM(fuel_cost), 0) as total_fuel_cost,
        COALESCE(SUM(net_profit), 0) as total_net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
    `).get(monthPrefix, req.userId);

    const dailyBreakdown = db.prepare(`
      SELECT
        date,
        COUNT(*) as trips,
        COALESCE(SUM(distance_km), 0) as distance,
        COALESCE(SUM(amount_received), 0) as earnings,
        COALESCE(SUM(fees), 0) as fees,
        COALESCE(SUM(fuel_cost), 0) as fuel_cost,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
      GROUP BY date
      ORDER BY date
    `).all(monthPrefix, req.userId);

    const appBreakdown = db.prepare(`
      SELECT
        app_name,
        COUNT(*) as trips,
        COALESCE(SUM(amount_received), 0) as earnings,
        COALESCE(SUM(fees), 0) as fees,
        COALESCE(SUM(fuel_cost), 0) as fuel_cost,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
      GROUP BY app_name
    `).all(monthPrefix, req.userId);

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      summary: rawSummary,
      daily_breakdown: dailyBreakdown,
      by_app: appBreakdown,
    });
  } catch (err) {
    console.error('Error fetching monthly report:', err);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

// GET /api/reports/annual?year=YYYY — Annual report (user-scoped)
router.get('/annual', (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({ error: 'year query parameter is required' });
    }

    const yearPrefix = `${year}`;

    const rawSummary = db.prepare(`
      SELECT
        COUNT(*) as total_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(SUM(amount_received), 0) as total_earnings,
        COALESCE(SUM(fees), 0) as total_fees,
        COALESCE(SUM(fuel_cost), 0) as total_fuel_cost,
        COALESCE(SUM(net_profit), 0) as total_net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
    `).get(yearPrefix, req.userId);

    const monthlyBreakdown = db.prepare(`
      SELECT
        substr(date, 1, 7) as month,
        COUNT(*) as trips,
        COALESCE(SUM(distance_km), 0) as distance,
        COALESCE(SUM(amount_received), 0) as earnings,
        COALESCE(SUM(fees), 0) as fees,
        COALESCE(SUM(fuel_cost), 0) as fuel_cost,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
      GROUP BY substr(date, 1, 7)
      ORDER BY month
    `).all(yearPrefix, req.userId);

    const appBreakdown = db.prepare(`
      SELECT
        app_name,
        COUNT(*) as trips,
        COALESCE(SUM(amount_received), 0) as earnings,
        COALESCE(SUM(fees), 0) as fees,
        COALESCE(SUM(fuel_cost), 0) as fuel_cost,
        COALESCE(SUM(net_profit), 0) as net_profit
      FROM trips
      WHERE date LIKE ? || '%' AND user_id = ?
      GROUP BY app_name
    `).all(yearPrefix, req.userId);

    res.json({
      year: parseInt(year),
      summary: rawSummary,
      monthly_breakdown: monthlyBreakdown,
      by_app: appBreakdown,
    });
  } catch (err) {
    console.error('Error fetching annual report:', err);
    res.status(500).json({ error: 'Failed to fetch annual report' });
  }
});

module.exports = router;
