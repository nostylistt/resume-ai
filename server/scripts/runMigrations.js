const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function run() {
  const client = await pool.connect();

  try {
    await ensureSchemaMigrationsTable(client);

    const appliedRows = await client.query('SELECT name FROM schema_migrations');
    const appliedNames = new Set(appliedRows.rows.map((row) => row.name));

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort((first, second) => first.localeCompare(second));

    for (const fileName of migrationFiles) {
      if (appliedNames.has(fileName)) {
        continue;
      }

      const migrationSql = fs.readFileSync(path.join(MIGRATIONS_DIR, fileName), 'utf8');
      console.log(`Applying migration: ${fileName}`);

      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [fileName]);
      await client.query('COMMIT');
    }

    console.log('Migrations completed.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
