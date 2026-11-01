// Backend API.
// Reads and creates supplier records for the signed-in company.
import { collection } from '@/lib/crud';
import { supplierSchema } from '@/lib/schemas';
export const { GET, POST } = collection('supplier',supplierSchema);
