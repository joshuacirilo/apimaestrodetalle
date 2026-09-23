import { getPool, closePool } from '../lib/db.mjs';

try {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT s.name AS [schema], t.name AS [table], c.column_id AS position,
      c.name AS [column], ty.name AS [type], c.max_length, c.precision, c.scale,
      c.is_nullable, c.is_identity, c.is_computed, dc.definition AS default_value
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.columns c ON c.object_id = t.object_id
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
    WHERE t.name IN ('Estudiantes', 'Misiones', 'EstudianteMisiones')
    ORDER BY s.name, t.name, c.column_id;

    SELECT s.name AS [schema], t.name AS [table], i.name AS [key],
      i.is_primary_key, i.is_unique_constraint, c.name AS [column], ic.key_ordinal
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.indexes i ON i.object_id = t.object_id AND i.is_unique = 1
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE t.name IN ('Estudiantes', 'Misiones', 'EstudianteMisiones') AND ic.key_ordinal > 0
    ORDER BY s.name, t.name, i.name, ic.key_ordinal;

    SELECT fk.name AS foreign_key, ps.name AS parent_schema, pt.name AS parent_table,
      pc.name AS parent_column, rs.name AS referenced_schema, rt.name AS referenced_table,
      rc.name AS referenced_column, fkc.constraint_column_id AS position,
      fk.delete_referential_action_desc AS on_delete,
      fk.update_referential_action_desc AS on_update, fk.is_disabled, fk.is_not_trusted
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.tables pt ON pt.object_id = fk.parent_object_id
    JOIN sys.schemas ps ON ps.schema_id = pt.schema_id
    JOIN sys.columns pc ON pc.object_id = pt.object_id AND pc.column_id = fkc.parent_column_id
    JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
    JOIN sys.schemas rs ON rs.schema_id = rt.schema_id
    JOIN sys.columns rc ON rc.object_id = rt.object_id AND rc.column_id = fkc.referenced_column_id
    WHERE pt.name IN ('Estudiantes', 'Misiones', 'EstudianteMisiones')
       OR rt.name IN ('Estudiantes', 'Misiones', 'EstudianteMisiones')
    ORDER BY ps.name, pt.name, fk.name, fkc.constraint_column_id;
  `);
  const [columns, keys, relationships] = result.recordsets;
  console.log(JSON.stringify({ columns, keys, relationships }, null, 2));
  const absent = ['Estudiantes', 'Misiones', 'EstudianteMisiones'].filter(
    (name) => !columns.some((column) => column.table === name),
  );
  if (absent.length) {
    console.error(`Tablas no visibles o inexistentes: ${absent.join(', ')}`);
    process.exitCode = 1;
  }
} catch (error) {
  // No imprimir el objeto de conexiÃ³n ni mensajes que puedan contener credenciales.
  console.error(`No se pudo revisar SQL Server (${error.code ?? 'CONFIG_ERROR'}).`);
  const codes = (error.originalError?.errors ?? []).map((item) => item.code).filter(Boolean);
  if (codes.length) console.error(`Causas: ${codes.join(', ')}`);
  process.exitCode = 1;
} finally {
  await closePool();
}

