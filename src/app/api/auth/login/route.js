// Backend API.
// Checks the username or email and password, then starts a session if they match.
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { AppError, handleError, json, readBody, isSafeOrigin } from '@/lib/http';

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(150),
  password: z.string().min(1).max(256)
}).strict();

export async function POST(req) {
  try {
    if (!isSafeOrigin(req)) throw new AppError('Invalid request origin', 403);
    const data = await readBody(req, loginSchema);
    const identifier = data.identifier.trim().toLowerCase();

    // Usernames are unique, so no company name is needed.
    const user = identifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findUnique({ where: { username: identifier } });

    // Keep login errors generic.
    if (!user || !await bcrypt.compare(data.password, user.passwordHash)) {
      throw new AppError('Invalid username/email or password', 401);
    }

    await createSession(user.id);
    return json({ id:user.id, fullName:user.fullName, email:user.email,
      username:user.username, role:user.role });
  } catch (error) {
    return handleError(error);
  }
}
