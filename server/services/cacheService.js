const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const CACHE_DIR = path.join(__dirname, '..', 'data');
const CACHE_DB_PATH = path.join(CACHE_DIR, 'marketCache.db');
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// Creating a folder data if there is none
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// SQLite initialization
const db = new Database(CACHE_DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS market_cache (
    position TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

// Normalizes the position key for the cache: 'Front-End Developer' = 'frontend developer'

function normalizePositionKey(position) {
  return position
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')           // front-end = front end
    .replace(/\s+/g, ' ')            // multiple spaces
    .replace(/\bjr\.?\b/g, 'junior') // jr = junior
    .replace(/\bsr\.?\b/g, 'senior') // sr = senior
    .trim();
}

function getCachedMarketData(position) {
  if (!position) return null;

  const normalizedKey = normalizePositionKey(position);
  try {
    const row = db.prepare('SELECT * FROM market_cache WHERE position = ?').get(normalizedKey);

    if (row) {
      if (Date.now() - row.timestamp < CACHE_TTL_MS) {
        return JSON.parse(row.data);
      } else {
        db.prepare('DELETE FROM market_cache WHERE position = ?').run(normalizedKey);
      }
    }
  } catch (error) {
    console.error('SQLite Read Error:', error.message);
  }

  return null;
}

function setCachedMarketData(position, data) {
  if (!position || !data) return;

  const normalizedKey = normalizePositionKey(position);

  try {
    // updates data if such a key already exists
    const insert = db.prepare(`
      INSERT INTO market_cache (position, data, timestamp) 
      VALUES (?, ?, ?) 
      ON CONFLICT(position) DO UPDATE SET 
      data=excluded.data, 
      timestamp=excluded.timestamp
    `);

    insert.run(normalizedKey, JSON.stringify(data), Date.now());
  } catch (error) {
    console.error('SQLite Write Error:', error.message);
  }
}

// Automatic cleanup of old cache when the service starts
function cleanupOldCache() {
  try {
    const expiryTime = Date.now() - CACHE_TTL_MS;
    const result = db.prepare('DELETE FROM market_cache WHERE timestamp < ?').run(expiryTime);
    if (result.changes > 0) {
      console.log(`Deleted ${result.changes} outdated records from the database`);
    }
  } catch (error) {
    console.error('SQLite Cleanup Error:', error.message);
  }
}

cleanupOldCache();
console.log('Connected cache service');
module.exports = {
  getCachedMarketData,
  setCachedMarketData
};
