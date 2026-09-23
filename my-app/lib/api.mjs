export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(error) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  const number = error?.number ?? error?.originalError?.info?.number;
  if ([2601, 2627].includes(number)) {
    return Response.json({ error: 'El correo ya pertenece a otro estudiante o el registro está duplicado.' }, { status: 409 });
  }
  if (number === 1205) return Response.json({ error: 'Conflicto entre registros simultáneos. Reintenta la solicitud.' }, { status: 409 });
  console.error('Error de base de datos.', { code: error?.code, number, ...(error?.code?.startsWith('DB_CONFIG_') ? { variable: error.variable } : {}) });
  return Response.json({ error: 'No se pudo completar la operación.' }, { status: 500 });
}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validateRegistro(body) {
  const fail = (message) => { throw new ApiError(400, message); };
  if (!object(body) || !object(body.estudiante)) fail('Se requiere un objeto estudiante.');
  const estudiante = {};
  for (const [key, max] of [['carnet', 25], ['nombre', 150], ['correo', 150]]) {
    const value = body.estudiante[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${key} es obligatorio y admite hasta ${max} caracteres.`);
    estudiante[key] = value.trim();
  }
  // Carnet es varchar: evitar conversiones Unicode con pérdida de información.
  if (!/^[\x21-\x7E]+$/.test(estudiante.carnet)) fail('carnet debe contener caracteres ASCII sin espacios.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(estudiante.correo)) fail('correo no es válido.');
  if (!Array.isArray(body.misiones) || body.misiones.length > 1000) fail('misiones debe ser una lista de hasta 1000 elementos.');
  const ids = new Set();
  const misiones = body.misiones.map((item) => {
    if (!object(item) || !Number.isInteger(item.misionId) || item.misionId < 1 || item.misionId > 2147483647) fail('Cada misionId debe ser un entero positivo válido.');
    if (typeof item.estado !== 'boolean') fail('estado debe ser booleano (true o false).');
    if (ids.has(item.misionId)) fail('No se permite repetir misionId.');
    ids.add(item.misionId);
    return { misionId: item.misionId, estado: item.estado };
  });
  return { estudiante, misiones: misiones.sort((a, b) => a.misionId - b.misionId) };
}
