// Backend API.
// Reads and creates stock products and services for the company.
import { collection } from '@/lib/crud';
import { stockSchema } from '@/lib/schemas';
export const { GET, POST } = collection('stockItem',stockSchema);
