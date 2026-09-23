import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const runtime = 'nodejs';
const assets = new Map([
  ['swagger-ui.css', 'text/css; charset=utf-8'],
  ['swagger-ui-bundle.js', 'text/javascript; charset=utf-8'],
]);
export async function GET(_request, { params }) {
  const { file } = await params;
  const type = assets.get(file);
  if (!type) return new Response('Not found', { status: 404 });
  const content = await readFile(join(process.cwd(), 'node_modules', 'swagger-ui-dist', file));
  return new Response(content, { headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' } });
}
