import { item } from '@/lib/crud';
import { customerSchema } from '@/lib/schemas';
export const { PATCH, DELETE } = item('customer',customerSchema);
