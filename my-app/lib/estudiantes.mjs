import { getPool, sql } from './db.mjs';
import { ApiError } from './api.mjs';

export async function listMisiones() {
  const pool = await getPool();
  return (await pool.request().query('SELECT MisionID AS misionId, Nombre AS nombre, Descripcion AS descripcion FROM dbo.Misiones ORDER BY MisionID')).recordset;
}

export async function listEstudiantes() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT e.Carnet AS carnet, e.Nombre AS nombre, e.Correo AS correo,
      d.DetalleID AS detalleId, m.MisionID AS misionId, m.Nombre AS misionNombre,
      m.Descripcion AS descripcion, d.Estado AS estado, d.FechaRegistro AS fechaRegistro
    FROM dbo.Estudiantes e
    LEFT JOIN dbo.EstudianteMisiones d ON d.Carnet = e.Carnet
    LEFT JOIN dbo.Misiones m ON m.MisionID = d.MisionID
    ORDER BY e.Carnet, m.MisionID
  `);
  const students = new Map();
  for (const row of result.recordset) {
    if (!students.has(row.carnet)) students.set(row.carnet, { carnet: row.carnet, nombre: row.nombre, correo: row.correo, misiones: [] });
    if (row.detalleId !== null) students.get(row.carnet).misiones.push({
      detalleId: row.detalleId, misionId: row.misionId, nombre: row.misionNombre,
      descripcion: row.descripcion, estado: row.estado, fechaRegistro: row.fechaRegistro,
    });
  }
  return [...students.values()];
}

// Recibe una transacción activa; el endpoint controla commit/rollback.
export async function saveRegistro(transaction, { estudiante, misiones }) {
  for (const mision of misiones) {
    const exists = await new sql.Request(transaction).input('id', sql.Int, mision.misionId)
      .query('SELECT MisionID FROM dbo.Misiones WITH (HOLDLOCK) WHERE MisionID = @id');
    if (!exists.recordset.length) throw new ApiError(400, `La misión ${mision.misionId} no existe.`);
  }
  await new sql.Request(transaction)
    .input('carnet', sql.VarChar(25), estudiante.carnet)
    .input('nombre', sql.NVarChar(150), estudiante.nombre)
    .input('correo', sql.NVarChar(150), estudiante.correo)
    .query(`
      IF EXISTS (SELECT 1 FROM dbo.Estudiantes WITH (UPDLOCK, HOLDLOCK) WHERE Carnet = @carnet)
        UPDATE dbo.Estudiantes SET Nombre = @nombre, Correo = @correo WHERE Carnet = @carnet;
      ELSE
        INSERT INTO dbo.Estudiantes (Carnet, Nombre, Correo) VALUES (@carnet, @nombre, @correo);
    `);
  for (const mision of misiones) {
    await new sql.Request(transaction)
      .input('carnet', sql.VarChar(25), estudiante.carnet)
      .input('id', sql.Int, mision.misionId)
      .input('estado', sql.Bit, mision.estado)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.EstudianteMisiones WITH (UPDLOCK, HOLDLOCK) WHERE Carnet = @carnet AND MisionID = @id)
          UPDATE dbo.EstudianteMisiones SET Estado = @estado WHERE Carnet = @carnet AND MisionID = @id;
        ELSE
          INSERT INTO dbo.EstudianteMisiones (Carnet, MisionID, Estado) VALUES (@carnet, @id, @estado);
      `);
  }
}

export async function registerStudent(data) {
  const transaction = new sql.Transaction(await getPool());
  let active = false;
  transaction.on('rollback', () => { active = false; });
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    active = true;
    await saveRegistro(transaction, data);
    await transaction.commit();
    active = false;
  } catch (error) {
    if (active) await transaction.rollback().catch(() => {});
    throw error;
  }
}
