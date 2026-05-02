const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const CACHE_DIR = path.join(__dirname, '..', 'data');
const CACHE_DB_PATH = path.join(CACHE_DIR, 'marketCache.db');
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 годин у мілісекундах

// Створюємо папку data, якщо її немає
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Ініціалізація SQLite бази
const db = new Database(CACHE_DB_PATH);

// Вмикаємо WAL-режим для кращої продуктивності (не блокує читання під час запису)
db.pragma('journal_mode = WAL');

// Створюємо таблицю кешу (якщо ще немає)
db.exec(`
  CREATE TABLE IF NOT EXISTS market_cache (
    position TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

/**
 * Отримує дані з кешу (Синхронно)
 */
function getCachedMarketData(position) {
  if (!position) return null;
  
  const normalizedKey = position.toLowerCase().trim();
  
  try {
    const row = db.prepare('SELECT * FROM market_cache WHERE position = ?').get(normalizedKey);
    
    if (row) {
      if (Date.now() - row.timestamp < CACHE_TTL_MS) {
        return JSON.parse(row.data);
      } else {
        // Якщо кеш старий - видаляємо його
        db.prepare('DELETE FROM market_cache WHERE position = ?').run(normalizedKey);
      }
    }
  } catch (error) {
    console.error('[Cache Service] SQLite Read Error:', error.message);
  }
  
  return null;
}

/**
 * Записує нові дані в кеш (Синхронно)
 */
function setCachedMarketData(position, data) {
  if (!position || !data) return;
  
  const normalizedKey = position.toLowerCase().trim();
  
  try {
    // INSERT ... ON CONFLICT (Upsert) - оновлює дані, якщо такий ключ вже є
    const insert = db.prepare(`
      INSERT INTO market_cache (position, data, timestamp) 
      VALUES (?, ?, ?) 
      ON CONFLICT(position) DO UPDATE SET 
      data=excluded.data, 
      timestamp=excluded.timestamp
    `);
    
    insert.run(normalizedKey, JSON.stringify(data), Date.now());
  } catch (error) {
    console.error('[Cache Service] SQLite Write Error:', error.message);
  }
}

// Автоматичне очищення старого кешу при старті сервісу (Housekeeping)
function cleanupOldCache() {
  try {
    const expiryTime = Date.now() - CACHE_TTL_MS;
    const result = db.prepare('DELETE FROM market_cache WHERE timestamp < ?').run(expiryTime);
    if (result.changes > 0) {
      console.log(`[Cache Service] 🧹 Видалено ${result.changes} застарілих записів з БД`);
    }
  } catch (error) {
    console.error('[Cache Service] SQLite Cleanup Error:', error.message);
  }
}

// Запускаємо очистку
cleanupOldCache();

console.log('[Cache Service] ✅ Підключено до бази SQLite (marketCache.db)');

module.exports = {
  getCachedMarketData,
  setCachedMarketData
};
