import { listEstudiantes } from '@/lib/estudiantes.mjs';
import { errorResponse } from '@/lib/api.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await listEstudiantes()); }
  catch (error) { return errorResponse(error); }
}
