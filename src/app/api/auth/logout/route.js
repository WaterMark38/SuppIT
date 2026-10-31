import { clearSession, withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
export const POST = withAuth(async () => {await clearSession();return json({success:true});});
