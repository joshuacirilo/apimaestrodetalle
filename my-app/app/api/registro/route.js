import { registerStudent } from '@/lib/estudiantes.mjs';
import { ApiError, errorResponse, validateRegistro } from '@/lib/api.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ApiError(415, 'Usa Content-Type: application/json.');
    let body;
    try { body = await request.json(); }
    catch { throw new ApiError(400, 'El cuerpo no es JSON válido.'); }
    const data = validateRegistro(body);
    await registerStudent(data);
    return Response.json({ mensaje: 'Registro guardado correctamente.', carnet: data.estudiante.carnet });
  } catch (error) { return errorResponse(error); }
}
