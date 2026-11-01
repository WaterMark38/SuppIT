// Backend API.
// Returns a small status response to show the API is running.
import { json } from '@/lib/http';
export async function GET() { return json({system:'SuppIT',status:'API running'}); }
