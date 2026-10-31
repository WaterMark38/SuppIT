import { collection } from '@/lib/crud';
import { supplierSchema } from '@/lib/schemas';
export const { GET, POST } = collection('supplier',supplierSchema);
