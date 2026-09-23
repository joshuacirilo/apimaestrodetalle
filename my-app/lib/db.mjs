import 'server-only';
import sql from 'mssql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';

function config() {
  // Leer exclusivamente .env: no heredar credenciales de .env.local.
  const env = expand({ parsed: parse(readFileSync(resolve(process.cwd(), '.env'))), processEnv: {} }).parsed;
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!env[key]) throw new Error(`Falta ${key} en .env`);
  }
  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT inválido');
  const flag = (key, fallback) => {
    if (env[key] === undefined) return fallback;
    if (!['true', 'false'].includes(env[key])) throw new Error(`${key} debe ser true o false`);
    return env[key] === 'true';
  };
  return {
    server: env.DB_HOST, port, user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
    connectionTimeout: 15000, requestTimeout: 15000,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: flag('DB_ENCRYPT', true), trustServerCertificate: flag('DB_TRUST_SERVER_CERTIFICATE', false) },
  };
}

const key = Symbol.for('apimaestrodetalle.sqlPool');
export async function getPool() {
  if (!globalThis[key]) {
    const pool = new sql.ConnectionPool(config());
    pool.on('error', () => console.error('Error en el pool de SQL Server.'));
    globalThis[key] = pool.connect().catch(async (error) => {
      delete globalThis[key];
      await pool.close().catch(() => {});
      throw error;
    });
  }
  return globalThis[key];
}

export async function closePool() {
  const pending = globalThis[key];
  delete globalThis[key];
  if (pending) await (await pending).close();
}

export { sql };

