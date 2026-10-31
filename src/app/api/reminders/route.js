
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json } from "@/lib/http";

export const GET = withAuth(async (_req, u) => {
    const reminders = await prisma.reminder.findMany({
        where: {
            companyId: u.companyId
        },
        include: {
            invoice: {
                select: {
                    id: true,
                    invoiceNumber: true,
                    issueDate: true,
                    dueDate: true,
                    paymentStatus: true,
                    totalAmount: true,
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        },
        orderBy: {
            scheduledDate: "asc"
        }
    });

    return json(reminders);
});
