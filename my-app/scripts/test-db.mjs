import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getPool, closePool, sql } from '../lib/db.mjs';
import { listMisiones, listEstudiantes, saveRegistro, registerStudent } from '../lib/estudiantes.mjs';
const carnet = `T${randomUUID().replaceAll('-', '').slice(0, 24)}`;
const data = { estudiante: { carnet, nombre: 'Prueba transaccional', correo: `${carnet}@example.invalid` }, misiones: [] };
let transaction;
let active = false;
try {
  const pool = await getPool();
  const misiones = await listMisiones();
  assert.ok(Array.isArray(await listEstudiantes()));
  console.log(`Consultas reales correctas. Catálogo: ${misiones.length} misiones.`);
  transaction = new sql.Transaction(pool);
  transaction.on('rollback', () => { active = false; });
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); active = true;
  data.misiones = misiones.slice(0, 2).map((m) => ({ misionId: m.misionId, estado: true }));
  await saveRegistro(transaction, data);
  data.estudiante.nombre = "O'Brien'; SELECT 1;--";
  data.misiones = data.misiones.slice(0, 1).map((m) => ({ ...m, estado: false }));
  await saveRegistro(transaction, data);
  await saveRegistro(transaction, data);
  const result = await new sql.Request(transaction).input('carnet', sql.VarChar(25), carnet).query(`
    SELECT Nombre FROM dbo.Estudiantes WHERE Carnet=@carnet;
    SELECT MisionID, Estado FROM dbo.EstudianteMisiones WHERE Carnet=@carnet;
  `);
  assert.equal(result.recordsets[0][0].Nombre, data.estudiante.nombre);
  console.log('Texto con comillas y SQL conservado literalmente mediante parámetros.');
  assert.equal(result.recordsets[1].length, Math.min(2, misiones.length));
  if (data.misiones.length) assert.equal(result.recordsets[1].find((m) => m.MisionID === data.misiones[0].misionId).Estado, false);
  await transaction.rollback(); active = false;
  const missing = await pool.request().query('SELECT TOP (1) candidate.id FROM (SELECT CAST(2147483647 AS int) AS id UNION ALL SELECT 2147483646) candidate WHERE NOT EXISTS (SELECT 1 FROM dbo.Misiones m WHERE m.MisionID=candidate.id)');
  assert.ok(missing.recordset.length, 'Se necesita un ID inexistente para esta prueba');
  await assert.rejects(registerStudent({ ...data, misiones: [{ misionId: missing.recordset[0].id, estado: true }] }), { status: 400 });
  const remains = await pool.request().input('carnet', sql.VarChar(25), carnet).query('SELECT Carnet FROM dbo.Estudiantes WHERE Carnet=@carnet');
  assert.equal(remains.recordset.length, 0);
  console.log('Alta, actualización, repetición sin duplicados, conservación de detalles omitidos y rollback correctos. Sin filas de prueba persistidas.');
  if (!misiones.length) console.log('Catálogo vacío: no se probaron escrituras de detalles.');
} catch (error) {
  console.error('Falló la prueba de base de datos.', { code: error.code ?? 'TEST_FAILED' });
  process.exitCode = 1;
} finally {
  if (active) await transaction.rollback();
  await closePool();
}


