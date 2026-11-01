// Backend API.
// Updates or removes one record after the backend checks permissions.
import { withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
import { updateUiRecord,deleteUiRecord } from '@/lib/legacy-ui';
export const PUT=withAuth(async(req,u,ctx)=>{const {id}=await ctx.params;const {record}=await req.json();return json({record:await updateUiRecord(u.companyId,id,record)});},['Admin','Staff']);
export const DELETE=withAuth(async(_req,u,ctx)=>{const {id}=await ctx.params;await deleteUiRecord(u.companyId,id);return json({success:true});},['Admin']);
