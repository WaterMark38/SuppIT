import { collection } from '@/lib/crud';
import { stockSchema } from '@/lib/schemas';
export const { GET, POST } = collection('stockItem',stockSchema);
