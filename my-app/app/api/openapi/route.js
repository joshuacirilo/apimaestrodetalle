import { openapi } from '@/lib/openapi.mjs';
export async function GET() {
  return Response.json(openapi);
}
