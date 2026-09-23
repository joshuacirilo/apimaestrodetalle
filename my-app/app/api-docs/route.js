export async function GET() {
  return new Response(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Swagger | API Maestro–Detalle</title>
  <link rel="stylesheet" href="/api-docs/assets/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api-docs/assets/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi', dom_id: '#swagger-ui', deepLinking: true,
      validatorUrl: null, supportedSubmitMethods: ['get', 'post'],
      presets: [SwaggerUIBundle.presets.apis], layout: 'BaseLayout'
    });
  </script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
