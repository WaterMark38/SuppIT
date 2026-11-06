// Records page visits for signed-in users.
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import { AppError, json, readBody } from '@/lib/http';
import { isAuditTab, safeAudit } from '@/lib/audit';

const tabSchema = z.object({ tab: z.string().trim().min(1).max(30) }).strict();

export const POST = withAuth(async (request, user) => {
  const { tab } = await readBody(request, tabSchema);
  if (!isAuditTab(tab)) throw new AppError('Unknown tab', 400);
  // Staff can never record an Audit page visit.
  if (tab === 'audit' && !['Admin', 'SuperAdmin'].includes(user.role)) {
    throw new AppError('Insufficient permissions', 403);
  }
  // Only the server chooses the user identity in this event.
  await safeAudit({ user, action: 'VIEW', module: tab,
    summary: `Opened ${tab} page` });
  return json({ success: true });
});
