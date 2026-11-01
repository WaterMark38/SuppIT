// Backend API.
// Signs out the current user by clearing their session.
import { clearSession, withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
export const POST = withAuth(async () => {await clearSession();return json({success:true});});
