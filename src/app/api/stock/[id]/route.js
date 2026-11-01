// Backend API.
// Updates or deletes a stock record after the backend checks its company.
import { item } from '@/lib/crud';
import { stockSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('stockItem',stockSchema);
