import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Pool } = pg;

// Em Render, a env var DATABASE_URL é injetada automaticamente pela ligação
// à base de dados definida no render.yaml. Localmente, usa o .env.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres exige SSL em produção
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on('error', (err) => {
  console.error('[DB] erro inesperado:', err);
});

// Corre init.sql. Idempotente — pode chamar-se em cada arrancada.
export async function initDb() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sqlPath = join(__dirname, 'migrations', 'init.sql');
  try {
    const sql = await readFile(sqlPath, 'utf-8');
    await pool.query(sql);
    console.log('[DB] migrações aplicadas');
  } catch (err) {
    console.error('[DB] falha nas migrações:', err.message);
    throw err;
  }
}

// Helper: teste rápido de conectividade
export async function pingDb() {
  const res = await pool.query('SELECT NOW() AS now');
  return res.rows[0].now;
}
