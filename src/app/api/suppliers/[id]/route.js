import { item } from '@/lib/crud';
import { supplierSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('supplier',supplierSchema);
