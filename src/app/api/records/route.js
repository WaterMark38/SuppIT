// Backend API.
// Loads and saves the records used by the original SuppIT dashboard.
import { withAuth } from '@/lib/auth';
import { AppError, json } from '@/lib/http';
import { allUiRecords,createUiRecord } from '@/lib/legacy-ui';
export const GET=withAuth(async(_req,u)=>json({records:await allUiRecords(u.companyId)}));
export const POST=withAuth(async(req,u)=>{const {record}=await req.json();if(!record)throw new AppError('Record required');return json({success:true,record:await createUiRecord(u.companyId,record)},201);},['Admin','Staff']);
