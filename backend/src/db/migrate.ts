import fs from 'fs/promises';
import path from 'path';
import { pool } from '../config/db';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Running ${files.length} migration(s)...`);

  // Drop schema for clean slate (dev only — en prod usaríamos versionado)
  await pool.query(`
    DROP TABLE IF EXISTS audit_log, sessions, files, area_management, users, areas, roles CASCADE;
    DROP FUNCTION IF EXISTS set_updated_at CASCADE;
  `);

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    console.log(`  → ${file}`);
    await pool.query(sql);
  }

  console.log('✓ Migrations complete');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
