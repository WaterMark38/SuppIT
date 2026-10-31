import { withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
export const GET = withAuth(async (_req,user) => json(user));
