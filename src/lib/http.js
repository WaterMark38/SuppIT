// Backend helpers.
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const json = (data, status = 200) => NextResponse.json(data, { status });
// Checks request data.
export async function readBody(request, schema) {
  let body;
  try { body = await request.json(); } catch { throw new AppError('Valid JSON required', 400); }
  return schema.parse(body);
}
// Checks the request origin.
export function isSafeOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
// Returns an error to the frontend.
export function handleError(error) {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: 'Invalid input', details: error.issues.map(i=>({ field:i.path.join('.'),message:i.message })) }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return json({ error: 'A record with this value already exists' }, 409);
    if (error.code === 'P2003') return json({ error: 'This record is referenced by another record' }, 409);
    if (error.code === 'P2034') return json({ error: 'Conflicting update. Please retry.' }, 409);
  }
  console.error('SuppIT API error:', error);
  return json({ error: 'Unexpected server error' }, 500);
}
