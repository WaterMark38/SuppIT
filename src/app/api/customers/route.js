import { collection } from '@/lib/crud';
import { customerSchema } from '@/lib/schemas';
export const { GET, POST } = collection('customer',customerSchema);
