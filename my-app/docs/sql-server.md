# SQL Server: configuración y estructura verificada

Revisión realizada el 22 de septiembre de 2026 mediante consultas SELECT a los catálogos sys de SQL Server. No se crearon ni modificaron tablas ni registros.

## Conexión

La conexión se centraliza en lib/db.mjs con un pool reutilizable, protegido para uso exclusivo del servidor. Lee únicamente my-app/.env con dotenv y dotenv-expand; no toma credenciales de .env.local ni de las variables cargadas por Next.js. Reiniciar el servidor después de cambiar credenciales. .env sigue excluido de Git.

Variables requeridas: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME. DB_ENCRYPT tiene true por defecto. El servidor de desarrollo usa certificado autofirmado, por lo que DB_TRUST_SERVER_CERTIFICATE=true está en .env; usar false con un certificado válido. Los dólares literales pueden conservar el escape \$ usado por Next.js.

Desde my-app:

```sh
npm run db:inspect
```

En PowerShell con restricciones de scripts puede utilizarse npm.cmd run db:inspect. El comando devuelve columnas, claves únicas y primarias, y relaciones. Si falta una tabla o falla la conexión, termina con código distinto de cero.

## Columnas

Todas las tablas pertenecen al esquema dbo. NULL indica que la columna admite nulos.

| Tabla | Columna | Tipo | NULL | Restricciones |
| --- | --- | --- | --- | --- |
| Estudiantes | Carnet | varchar(25) | No | Clave primaria |
| Estudiantes | Nombre | nvarchar(150) | No | |
| Estudiantes | Correo | nvarchar(150) | No | Único |
| Misiones | MisionID | int | No | Clave primaria, IDENTITY |
| Misiones | Nombre | nvarchar(100) | No | |
| Misiones | Descripcion | nvarchar(250) | Sí | |
| EstudianteMisiones | DetalleID | int | No | Clave primaria, IDENTITY |
| EstudianteMisiones | Carnet | varchar(25) | No | Clave foránea |
| EstudianteMisiones | MisionID | int | No | Clave foránea |
| EstudianteMisiones | Estado | bit | No | Sin valor predeterminado |
| EstudianteMisiones | FechaRegistro | datetime | Sí | Predeterminado: getdate() |

Los tamaños max_length del JSON se expresan en bytes; para nvarchar corresponden al doble de la longitud declarada.

## Relaciones

- FK_Estudiante: EstudianteMisiones.Carnet → Estudiantes.Carnet.
- FK_Mision: EstudianteMisiones.MisionID → Misiones.MisionID.
- Ambas claves foráneas están habilitadas y validadas; usan NO_ACTION al borrar y actualizar, sin cascadas.
- UQ_EstudianteMision exige que la combinación (Carnet, MisionID) sea única.
- El modelo representa una relación muchos a muchos entre estudiantes y misiones, con Estado y FechaRegistro en la tabla de enlace.

Referencia del cliente: https://github.com/tediousjs/node-mssql

