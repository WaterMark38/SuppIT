import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { AppError, handleError, isSafeOrigin } from './http';

const COOKIE = 'suppit_session';
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secret);
}

export async function createSession(userId) {
  const user = await prisma.user.findUnique({
    where: {id:userId}, select: {sessionVersion:true}
  });
  if (!user) throw new AppError('User not found', 401);
  const token = await new SignJWT({uid:userId, sv:user.sessionVersion})
    .setProtectedHeader({alg:'HS256'})
    .setIssuedAt().setExpirationTime('7d').sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly:true, secure:process.env.NODE_ENV === 'production',
    sameSite:'lax', path:'/', maxAge:7*24*60*60
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, key());
    if (typeof payload.uid !== 'string') return null;
    const user = await prisma.user.findUnique({
      where:{id:payload.uid},
      select:{id:true,fullName:true,email:true,username:true,companyId:true,role:true,sessionVersion:true}
    });
    if (!user || payload.sv !== user.sessionVersion) return null;
    const {sessionVersion, ...safeUser} = user;
    return safeUser;
  } catch { return null; }
}

export function withAuth(action, roles = ['Admin','Staff','Viewer']) {
  return async function(request, context) {
    try {
      if (!['GET','HEAD'].includes(request.method) && !isSafeOrigin(request)) {
        throw new AppError('Invalid request origin',403);
      }
      const user = await currentUser();
      if (!user) throw new AppError('Please sign in',401);
      // The company owner may access all endpoints available to an Admin.
      // Other roles never inherit higher permissions.
      const permitted = roles.includes(user.role) ||
        (user.role === 'SuperAdmin' && roles.includes('Admin'));
      if (!permitted) throw new AppError('Insufficient permissions',403);
      return await action(request, user, context);
    } catch(error) { return handleError(error); }
  };
}
