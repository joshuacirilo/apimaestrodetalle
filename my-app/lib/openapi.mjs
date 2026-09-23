const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const response = (description, schema) => ({ description, content: json(schema) });
const error = (description) => response(description, ref('Error'));
const id = { type: 'integer', format: 'int32', minimum: 1, maximum: 2147483647 };
const estudiante = {
  type: 'object', required: ['carnet', 'nombre', 'correo'],
  properties: {
    carnet: { type: 'string', minLength: 1, maxLength: 25, pattern: '^[!-~]+$', example: '2026-001' },
    nombre: { type: 'string', minLength: 1, maxLength: 150, example: 'Ana Pérez' },
    correo: { type: 'string', minLength: 1, maxLength: 150, format: 'email', example: 'ana@example.com' },
  },
};
export const openapi = {
  openapi: '3.0.3',
  info: { title: 'API Maestro–Detalle', version: '1.0.0', description: 'Consulta el catálogo, registra estudiantes y actualiza sus estados. Las operaciones se ejecutan sobre la base de datos configurada en .env.' },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [{ name: 'Misiones' }, { name: 'Registro' }, { name: 'Estudiantes' }],
  paths: {
    '/api/misiones': { get: {
      tags: ['Misiones'], operationId: 'listarMisiones', summary: 'Consultar catálogo de misiones',
      responses: { 200: response('Catálogo ordenado por misionId.', { type: 'array', items: ref('Mision') }), 500: error('Error interno.') },
    } },
    '/api/registro': { post: {
      tags: ['Registro'], operationId: 'registrarEstudiante', summary: 'Guardar estudiante y estados',
      description: 'Inserta o actualiza por carnet, dentro de una transacción. Usa IDs del catálogo. No se permiten misionId repetidos. Las misiones omitidas conservan su estado; una lista vacía guarda solo el estudiante. Estado debe ser true o false. Ejecutar esta operación guarda cambios reales.',
      requestBody: { required: true, content: { 'application/json': {
        schema: ref('Registro'),
        example: { estudiante: { carnet: '2026-001', nombre: 'Ana Pérez', correo: 'ana@example.com' }, misiones: [{ misionId: 1, estado: true }, { misionId: 2, estado: false }] },
      } } },
      responses: {
        200: response('Registro guardado.', { type: 'object', required: ['mensaje', 'carnet'], properties: { mensaje: { type: 'string', example: 'Registro guardado correctamente.' }, carnet: { type: 'string', example: '2026-001' } } }),
        400: error('JSON o datos inválidos; misión inexistente o repetida.'),
        409: error('Correo duplicado o conflicto concurrente; reintenta si es concurrente.'),
        415: error('Se requiere Content-Type: application/json.'),
        500: error('Error interno; los cambios se revierten.'),
      },
    } },
    '/api/estudiantes': { get: {
      tags: ['Estudiantes'], operationId: 'listarEstudiantes', summary: 'Consultar estudiantes con sus misiones',
      description: 'Incluye estudiantes sin asignaciones con misiones: []. Ordena por carnet y misionId.',
      responses: { 200: response('Estudiantes y detalles.', { type: 'array', items: ref('EstudianteConMisiones') }), 500: error('Error interno.') },
    } },
  },
  components: { schemas: {
    Error: { type: 'object', required: ['error'], properties: { error: { type: 'string' } } },
    Estudiante: estudiante,
    Mision: { type: 'object', required: ['misionId', 'nombre', 'descripcion'], properties: { misionId: id, nombre: { type: 'string', maxLength: 100 }, descripcion: { type: 'string', maxLength: 250, nullable: true } } },
    EstadoMision: { type: 'object', required: ['misionId', 'estado'], properties: { misionId: id, estado: { type: 'boolean' } } },
    Registro: { type: 'object', required: ['estudiante', 'misiones'], properties: { estudiante: ref('Estudiante'), misiones: { type: 'array', maxItems: 1000, description: 'Cada misionId debe ser único y existir en el catálogo.', items: ref('EstadoMision') } } },
    MisionAsignada: { allOf: [ref('Mision'), { type: 'object', required: ['detalleId', 'estado', 'fechaRegistro'], properties: { detalleId: id, estado: { type: 'boolean' }, fechaRegistro: { type: 'string', format: 'date-time', nullable: true } } }] },
    EstudianteConMisiones: { allOf: [ref('Estudiante'), { type: 'object', required: ['misiones'], properties: { misiones: { type: 'array', items: ref('MisionAsignada') } } }] },
  } },
};
