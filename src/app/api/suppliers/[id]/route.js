// Backend API.
// Updates or deletes a suppliers record after the backend checks its company.
import { item } from '@/lib/crud';
import { supplierSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('supplier',supplierSchema);
