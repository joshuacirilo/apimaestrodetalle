import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';

export function getDbConfig(runtimeEnv = process.env, directory = process.cwd()) {
  // Producci?n recibe los valores del hosting; local sigue leyendo solo .env.
  const hosted = runtimeEnv.NODE_ENV === 'production' || runtimeEnv.VERCEL === '1';
  const env = hosted ? runtimeEnv : expand({
    parsed: parse(readFileSync(resolve(directory, '.env'))), processEnv: {},
  }).parsed;
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!env[key]) throw Object.assign(new Error(`Falta ${key} en la configuraci?n de SQL Server`), { code: 'DB_CONFIG_MISSING', variable: key });
  }
  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Object.assign(new Error('DB_PORT invalid'), { code: 'DB_CONFIG_INVALID', variable: 'DB_PORT' });
  const flag = (key, fallback) => {
    if (env[key] === undefined) return fallback;
    if (!['true', 'false'].includes(env[key])) throw Object.assign(new Error(`${key} debe ser true o false`), { code: 'DB_CONFIG_INVALID', variable: key });
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

