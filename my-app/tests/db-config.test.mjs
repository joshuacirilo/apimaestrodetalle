import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDbConfig } from '../lib/db-config.mjs';
const values = { DB_HOST: 'sql.example.test', DB_PORT: '1433', DB_USER: 'test', DB_PASSWORD: 'literal$VALUE\\$end', DB_NAME: 'example' };
test('producción funciona sin .env y conserva la contraseña literal', () => {
  const config = getDbConfig({ ...values, NODE_ENV: 'production' }, '/nonexistent-config-directory');
  assert.equal(config.password, values.DB_PASSWORD);
  assert.equal(config.port, 1433);
  assert.equal(config.options.encrypt, true);
  assert.equal(config.options.trustServerCertificate, false);
});
test('Vercel usa variables inyectadas incluso fuera del modo production', () => {
  assert.equal(getDbConfig({ ...values, VERCEL: '1', DB_TRUST_SERVER_CERTIFICATE: 'true' }, '/nonexistent-config-directory').options.trustServerCertificate, true);
});
test('configuración inválida identifica la variable sin incluir su valor', () => {
  for (const [key, value] of [['DB_HOST', ''], ['DB_PORT', 'bad-port'], ['DB_ENCRYPT', 'invalid']]) {
    assert.throws(() => getDbConfig({ ...values, NODE_ENV: 'production', [key]: value }), (error) => error.variable === key && error.code.startsWith('DB_CONFIG_') && !error.message.includes(values.DB_PASSWORD));
  }
});
test('desarrollo lee .env y no hereda .env.local ni credenciales de process.env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'db-config-test-'));
  try {
    writeFileSync(join(dir, '.env'), 'DB_HOST=local.test\nDB_PORT=1433\nDB_USER=local\nDB_NAME=local\nDB_PASSWORD=abc\\$VALUE\n');
    writeFileSync(join(dir, '.env.local'), 'DB_PASSWORD=incorrecto\n');
    const config = getDbConfig({ ...values, NODE_ENV: 'development' }, dir);
    assert.equal(config.server, 'local.test');
    assert.equal(config.password, 'abc$VALUE');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
