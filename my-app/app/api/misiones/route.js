import { listMisiones } from '@/lib/estudiantes.mjs';
import { errorResponse } from '@/lib/api.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await listMisiones()); }
  catch (error) { return errorResponse(error); }
}
