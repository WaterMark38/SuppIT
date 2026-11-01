// Account setup.
// Run this script in the terminal.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';

const db = new PrismaClient();
const rl = createInterface({input:process.stdin,output:process.stdout});
const ask = async (prompt) => (await rl.question(prompt)).trim();
const allowedUsername = /^[a-z][a-z0-9._-]{2,39}$/;

try {
  console.log('SuppIT: create lecturer Admin and protect the Super Admin account.');
  console.log('Passwords are visible as you type. Do not share terminal screenshots.');

  const ownerEmail = (await ask('Existing owner/Admin email: ')).toLowerCase();
  const ownerPassword = await rl.question('Existing owner password: ');
  const owner = await db.user.findUnique({where:{email:ownerEmail}});
  if (!owner || !['Admin','SuperAdmin'].includes(owner.role) ||
      !await bcrypt.compare(ownerPassword,owner.passwordHash)) {
    throw new Error('Could not verify the existing administrator account. No changes made.');
  }

  const ownerUsername = (await ask('Your Super Admin username [superadmin]: ') || 'superadmin').toLowerCase();
  const ownerNewPassword = await rl.question('New Super Admin password (12+ characters, Enter to keep existing): ');
  const lecturerName = await ask('Lecturer display name [Lecturer]: ') || 'Lecturer';
  const lecturerUsername = (await ask('Lecturer login username [administrator]: ') || 'administrator').toLowerCase();
  const lecturerPassword = await rl.question('Lecturer password (12+ characters, visible): ');
  if (!allowedUsername.test(ownerUsername) || !allowedUsername.test(lecturerUsername)) {
    throw new Error('Usernames must be 3-40 letters/numbers/dots/underscores/hyphens and start with a letter.');
  }
  if (ownerNewPassword && (ownerNewPassword.length < 12 || ownerNewPassword.length > 72 || await bcrypt.compare(ownerNewPassword, owner.passwordHash))) {
    throw new Error('Your new Super Admin password must be different and 12-72 characters.');
  }
  if (ownerUsername === lecturerUsername || lecturerPassword.length < 12 || lecturerPassword.length > 72) {
    throw new Error('Different usernames and a lecturer password of 12-72 characters are required.');
  }
  if (lecturerName.length > 100) throw new Error('Lecturer display name is too long.');
  if (await db.user.findUnique({where:{username:lecturerUsername}})) {
    throw new Error('The lecturer username already exists. No changes made.');
  }
  const existingOwnerUsername = await db.user.findUnique({where:{username:ownerUsername}});
  if (existingOwnerUsername && existingOwnerUsername.id !== owner.id) {
    throw new Error('That Super Admin username is already in use. No changes made.');
  }
  // Saves both account changes together.
  const lecturerHash = await bcrypt.hash(lecturerPassword,12);
  const ownerHash = ownerNewPassword ? await bcrypt.hash(ownerNewPassword,12) : null;
  await db.$transaction(async tx => {
    await tx.user.update({
      where:{id:owner.id},
      data:{role:'SuperAdmin',username:ownerUsername,sessionVersion:{increment:1},
        ...(ownerHash ? {passwordHash:ownerHash} : {})}
    });
    await tx.user.create({
      data:{companyId:owner.companyId,fullName:lecturerName,
        username:lecturerUsername,email:null,passwordHash:lecturerHash,role:'Admin'}
    });
  });
  console.log('Success! Existing owner is SuperAdmin, lecturer is Admin.');
  console.log(`Super Admin username: ${ownerUsername}`);
  console.log(`Lecturer username: ${lecturerUsername}`);
  console.log('Lecturer account has no email address. Passwords were not printed.');
  console.log(ownerHash ? 'Super Admin password updated.' : 'Super Admin password unchanged; change it if it was shared.');
  console.log('Sign in again: existing sessions were invalidated for the Super Admin.');
} catch (err) {
  console.error('Setup stopped:', err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
