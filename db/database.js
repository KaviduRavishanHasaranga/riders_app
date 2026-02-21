const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const dbPath = path.resolve(
  __dirname,
  "..",
  process.env.DB_PATH || "./db/riders.db",
);

// Ensure the db directory exists
const fs = require("fs");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Migration helper ---
function addColumnIfNotExists(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  ✓ Added column ${table}.${column}`);
  } catch (e) {
    // Column already exists — ignore
  }
}

// Create tables (IF NOT EXISTS — safe for existing DBs)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    app_name TEXT NOT NULL DEFAULT 'Other',
    trip_type TEXT NOT NULL DEFAULT 'Passenger',
    distance_km REAL NOT NULL DEFAULT 0,
    amount_received REAL NOT NULL DEFAULT 0,
    fees REAL NOT NULL DEFAULT 0,
    fuel_cost REAL NOT NULL DEFAULT 0,
    net_profit REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);
  CREATE INDEX IF NOT EXISTS idx_trips_app_name ON trips(app_name);

  CREATE TABLE IF NOT EXISTS fuel_settings_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fuel_efficiency_kmpl REAL NOT NULL,
    fuel_price_per_liter REAL NOT NULL,
    effective_from TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_fuel_effective ON fuel_settings_history(effective_from);
`);

// --- Run migrations for existing databases ---
console.log('Running database migrations...');
addColumnIfNotExists('trips', 'user_id', "INTEGER NOT NULL DEFAULT 0");
addColumnIfNotExists('trips', 'trip_time', "TEXT DEFAULT ''");
addColumnIfNotExists('fuel_settings_history', 'user_id', "INTEGER NOT NULL DEFAULT 0");

// Create indexes for new columns
try { db.exec('CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_fuel_user_id ON fuel_settings_history(user_id)'); } catch(e) {}

console.log('Database ready.');

module.exports = db;
