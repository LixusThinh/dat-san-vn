import { createClerkClient } from '@clerk/backend';
import { UserRole } from '@prisma/client';
import { prisma } from './config';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env
dotenv.config({ path: join(process.cwd(), '.env') });

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) throw new Error('CLERK_SECRET_KEY is missing in .env');

const clerk = createClerkClient({ secretKey });

const usersToCreate = [
  { email: 'admin@test.com', firstName: 'Admin', lastName: 'Test', role: UserRole.ADMIN },
  { email: 'owner@test.com', firstName: 'Owner', lastName: 'Test', role: UserRole.OWNER },
  { email: 'user@test.com', firstName: 'User', lastName: 'Test', role: UserRole.PLAYER },
];

async function main() {
  console.log('🚀 Starting test accounts creation...');
  
  for (const u of usersToCreate) {
    try {
      // 1. Check if user exists in Clerk
      const existingRes = await clerk.users.getUserList({ emailAddress: [u.email] });
      // Xử lý tương thích giữa các phiên bản Clerk SDK
      const existingUsers = Array.isArray(existingRes) ? existingRes : existingRes?.data;
      
      let clerkUserId: string;

      if (existingUsers && existingUsers.length > 0) {
        console.log(`✅ User ${u.email} already exists in Clerk.`);
        clerkUserId = existingUsers[0].id;
      } else {
        // 2. Create in Clerk
        console.log(`⏳ Creating ${u.email} in Clerk...`);
        const created = await clerk.users.createUser({
          emailAddress: [u.email],
          password: 'TestPassword123!',
          firstName: u.firstName,
          lastName: u.lastName,
          skipPasswordChecks: true,
        });
        clerkUserId = created.id;
        console.log(`✅ Created ${u.email} in Clerk with ID: ${clerkUserId}`);
      }

      // 3. Upsert in local database to ensure role is correct
      // We do this directly so that we don't have to wait for the webhook, and we can enforce the roles.
      const dbUser = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          clerkId: clerkUserId,
          role: u.role,
          fullName: `${u.firstName} ${u.lastName}`,
        },
        create: {
          email: u.email,
          clerkId: clerkUserId,
          role: u.role,
          fullName: `${u.firstName} ${u.lastName}`,
        }
      });
      console.log(`✅ Upserted ${u.email} in DB with role ${dbUser.role}`);
    } catch (error) {
      console.error(`❌ Error processing ${u.email}:`, error);
    }
  }

  console.log('\n🎉 Finished setting up test accounts!');
  console.log('Mật khẩu chung cho tất cả tài khoản là: TestPassword123!');
  console.log('======================================================');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
