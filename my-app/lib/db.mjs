import 'server-only';
import sql from 'mssql';
import { getDbConfig } from './db-config.mjs';

const key = Symbol.for('apimaestrodetalle.sqlPool');
export async function getPool() {
  if (!globalThis[key]) {
    const pool = new sql.ConnectionPool(getDbConfig());
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

