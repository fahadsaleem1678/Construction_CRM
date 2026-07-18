import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/passwords.js';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.OWNER_SEED_EMAIL ?? 'owner@construction.local').trim().toLowerCase();
  const password = process.env.OWNER_SEED_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.OWNER_SEED_NAME ?? 'Company Owner';
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: 'owner',
      passwordHash,
      emailVerified: true,
      isActive: true
    },
    create: {
      email,
      name,
      role: 'owner',
      passwordHash,
      emailVerified: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
