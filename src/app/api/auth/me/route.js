// Backend API.
// Returns the currently signed-in user and their role.
import { withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
export const GET = withAuth(async (_req,user) => json(user));
