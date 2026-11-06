// Only Admin and Super Admin can read company audit entries.
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json } from '@/lib/http';

export const GET = withAuth(async (request, user) => {
  const url = new URL(request.url);
  const page = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const entries = await prisma.auditLog.findMany({
    where: { companyId: user.companyId },
    include: { user: { select: { fullName: true, username: true, role: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * 100,
    take: 101
  });
  return json({ entries: entries.slice(0, 100), hasMore: entries.length > 100, page });
}, ['Admin']);
