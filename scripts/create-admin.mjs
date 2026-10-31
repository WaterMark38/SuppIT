import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
const db=new PrismaClient();const rl=createInterface({input:process.stdin,output:process.stdout});
try {
 const companyName=(await rl.question('Business/company name: ')).trim();
 const fullName=(await rl.question('Admin full name: ')).trim();
 const email=(await rl.question('Admin email: ')).trim().toLowerCase();
 const password=await rl.question('Admin password (visible while typing, min 12 chars): ');
 if(!companyName||!fullName||!email.includes('@')||password.length<12)throw new Error('Provide company/name/email and a password of 12+ characters.');
 if(await db.user.findUnique({where:{email}}))throw new Error('This email already exists.');
 const result=await db.company.create({data:{companyName,users:{create:{fullName,email,passwordHash:await bcrypt.hash(password,12),role:'Admin'}}}});
 console.log('Created company ID:',result.id,'\nYou can now use POST /api/auth/login.');
} catch(e){console.error('Setup failed:',e.message);process.exitCode=1;} finally{rl.close();await db.$disconnect();}
