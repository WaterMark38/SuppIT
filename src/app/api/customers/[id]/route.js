// Backend API.
// Updates or deletes a customers record after the backend checks its company.
import { item } from '@/lib/crud';
import { customerSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('customer',customerSchema);
