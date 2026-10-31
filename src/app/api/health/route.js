import { json } from '@/lib/http';
export async function GET() { return json({system:'SuppIT',status:'API running'}); }
