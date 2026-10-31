import { withAuth } from '@/lib/auth';
import { AppError,json } from '@/lib/http';
import { createUiRecord } from '@/lib/legacy-ui';
// Import is limited to contacts/stock; transactions must follow the normal pipeline.
export const POST=withAuth(async(req,u)=>{const {records}=await req.json();if(!Array.isArray(records)||records.length>100)throw new AppError('Up to 100 records per import');let imported=0;for(const record of records){if(!['customers','suppliers','stock'].includes(record.category))continue;await createUiRecord(u.companyId,record);imported++;}return json({imported});},['Admin','Staff']);
