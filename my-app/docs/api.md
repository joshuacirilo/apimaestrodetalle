# API maestro-detalle

La conexión utiliza `my-app/.env` en desarrollo y variables del entorno en producci?n. El módulo `lib/db.mjs` mantiene un pool compartido. Las consultas usan parámetros y las rutas ejecutan en Node.js.

## GET /api/misiones

Devuelve un arreglo ordenado por `misionId`, con `misionId`, `nombre` y `descripcion`.

## POST /api/registro

Enviar `Content-Type: application/json`:

```json
{
  "estudiante": {
    "carnet": "2026-001",
    "nombre": "Ana Pérez",
    "correo": "ana@example.com"
  },
  "misiones": [
    { "misionId": 1, "estado": true },
    { "misionId": 2, "estado": false }
  ]
}
```

Usar IDs existentes obtenidos del catálogo. Carnet admite hasta 25 caracteres ASCII sin espacios; nombre y correo hasta 150 caracteres. Se recortan espacios exteriores. Correo debe tener formato válido. Estado debe ser booleano, sin convertir cadenas ni números. Se rechazan IDs repetidos o inexistentes. La lista admite de 0 a 1000 elementos.

El estudiante se inserta o actualiza por carnet. Cada detalle enviado se inserta o actualiza por la pareja carnet–misión. Las misiones omitidas conservan su estado, y una lista vacía permite guardar solo el estudiante. FechaRegistro se conserva al actualizar.

Se verifica la existencia de misiones y se guardan todos los cambios dentro de una transacción SERIALIZABLE, con bloqueos para evitar altas duplicadas concurrentes. Cualquier error revierte el conjunto. No se cambia el esquema de la base de datos.

Respuesta 200: `{"mensaje":"Registro guardado correctamente.","carnet":"2026-001"}`.

Errores: 400 para JSON o datos inválidos y misiones inexistentes; 415 para tipo de contenido incorrecto; 409 para correo duplicado o conflicto concurrente (reintentar en este último caso); 500 para errores internos, sin exponer credenciales ni mensajes de SQL.

## GET /api/estudiantes

Devuelve un arreglo de estudiantes con `carnet`, `nombre`, `correo` y `misiones`. Cada misión asignada incluye `detalleId`, `misionId`, `nombre`, `descripcion`, `estado` booleano y `fechaRegistro`. Incluye estudiantes sin asignaciones con `misiones: []`.

## Verificación

Desde my-app:

- `npm.cmd test`: validaciones y respuestas de error.
- `npm.cmd run test:db`: consultas reales, inserción/actualización repetida y rollback. Las filas de prueba se revierten; SQL Server puede consumir valores IDENTITY incluso con rollback.
- `node scripts/test-http.mjs`: levanta un servidor temporal en puerto 3100 y comprueba GET y solicitudes POST rechazadas.
- `npm.cmd run db:inspect`: estructura de las tablas.
- `npm.cmd run lint` y `npx.cmd tsc --noEmit`: comprobaciones estáticas.

Si ya tienes Next.js abierto, usa ese servidor: en PowerShell, establece $env:API_BASE_URL='http://127.0.0.1:3000' antes de ejecutar node scripts/test-http.mjs. El script no detiene el servidor existente.

## Swagger y parámetros SQL

Abrir http://localhost:3000/api-docs. Expandir una operación, pulsar **Try it out**, editar el JSON y pulsar **Execute**. Consultar primero GET /api/misiones para usar IDs reales en el registro. El POST guarda cambios en la base configurada.

La especificación OpenAPI se sirve en /api/openapi. Los archivos de Swagger UI se sirven localmente desde la dependencia swagger-ui-dist, sin CDN ni validador externo.

Las entradas SQL se envían con .input(nombre, tipo, valor) y marcadores @carnet, @nombre, @correo, @id y @estado. No se concatenan valores del JSON en el SQL. Los GET son consultas fijas sin entradas del usuario. La prueba test:db verifica que un nombre con comillas y texto SQL se conserva literalmente, dentro de una transacción que se revierte.

## Frontend

La página principal contiene el formulario de carnet, nombre, correo y estados de misiones obtenidas de la API. El tablero muestra estudiantes, sus misiones y avance: completadas / total del catálogo × 100 (0% si el catálogo está vacío). El resumen del grupo usa el total de estudiantes y misiones disponibles.

Después de guardar se consultan nuevamente catálogo y estudiantes. Si falla esa actualización, el mensaje distingue que el registro ya se guardó y permite reintentar la consulta. Editar recupera los datos y estados existentes; el carnet permanece fijo durante la edición. Buscar filtra por nombre, carnet y correo.

Pruebas de navegador: npm.cmd run test:ui (Microsoft Edge). Si ya tienes el servidor abierto, establece $env:API_BASE_URL='http://localhost:3000'. Las pruebas interceptan la API para comprobar guardado, errores, actualización del tablero, edición, catálogo vacío y ancho móvil sin escribir en la base de datos real.

## Despliegue en Vercel

Configurar DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME en el entorno del despliegue (Production o Preview). DB_ENCRYPT tiene true por defecto; DB_TRUST_SERVER_CERTIFICATE tiene false por defecto. Para el servidor autofirmado usado en desarrollo, configurar explícitamente DB_TRUST_SERVER_CERTIFICATE=true si ese mismo servidor es el destino.

En el panel escribir la contraseña real, sin comillas envolventes ni escapes añadidos para dotenv: un dólar literal se escribe $, no \$. Producción conserva el valor recibido sin expandirlo.

Publicar el código corregido y crear un nuevo deployment. No subir .env a Git. Verificar GET /api/misiones. Si sigue fallando, revisar los logs de esa función: DB_CONFIG_MISSING/DB_CONFIG_INVALID indica configuración (se registra solo el nombre de la variable); ELOGIN indica autenticación; ESOCKET/ETIMEOUT requiere revisar certificado y conectividad del servidor. Una conexión local exitosa no confirma acceso desde Vercel.

Referencia: https://vercel.com/docs/environment-variables
