// Backend API.
// Loads reminders and the linked customer contact details.
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json } from "@/lib/http";

export const GET = withAuth(async (_req, user) => {
  const reminders = await prisma.reminder.findMany({
    where: { companyId: user.companyId },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          paymentStatus: true,
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });
  return json(reminders);
});
