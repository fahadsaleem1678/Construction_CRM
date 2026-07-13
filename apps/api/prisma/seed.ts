import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/passwords.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_SEED_EMAIL ?? 'owner@construction.local';
  const password = process.env.OWNER_SEED_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.OWNER_SEED_NAME ?? 'Company Owner';

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: 'owner',
      passwordHash: await hashPassword(password),
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
