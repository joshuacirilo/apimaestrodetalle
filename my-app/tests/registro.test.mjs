import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistro, errorResponse } from '../lib/api.mjs';
const body = () => ({ estudiante: { carnet: 'A-1', nombre: 'Ana', correo: 'ana@example.com' }, misiones: [{ misionId: 1, estado: false }] });
test('acepta false y lista vacía, normaliza espacios', () => {
  const value = body(); value.estudiante.nombre = ' Ana ';
  assert.equal(validateRegistro(value).estudiante.nombre, 'Ana');
  assert.equal(validateRegistro(value).misiones[0].estado, false);
  value.misiones = []; assert.deepEqual(validateRegistro(value).misiones, []);
});
test('rechaza JSON maestro-detalle inválido', () => {
  for (const value of [null, [], {}, { ...body(), misiones: null }, { ...body(), misiones: [{ misionId: 1, estado: 'false' }] }, { ...body(), misiones: [{ misionId: 1.5, estado: true }] }, { ...body(), misiones: [body().misiones[0], body().misiones[0]] }]) {
    assert.throws(() => validateRegistro(value), { status: 400 });
  }
  for (const [key, value] of [['carnet', 'x'.repeat(26)], ['nombre', ' '], ['correo', 'invalido']]) {
    const input = body(); input.estudiante[key] = value;
    assert.throws(() => validateRegistro(input), { status: 400 });
  }
});
test('errores SQL no filtran detalles', async () => {
  const response = errorResponse({ number: 2627, message: 'credencial privada' });
  assert.equal(response.status, 409);
  assert.equal((await response.text()).includes('privada'), false);
});
