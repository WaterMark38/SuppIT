import { item } from '@/lib/crud';
import { stockSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('stockItem',stockSchema);
