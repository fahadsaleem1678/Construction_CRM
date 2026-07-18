import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/passwords.js';

const prisma = new PrismaClient();

const demoAccounts = [
  { email: 'admin', name: 'Ayesha Khan', role: 'admin' },
  { email: 'manager1', name: 'Bilal Ahmed', role: 'manager' },
  { email: 'manager2', name: 'Sara Malik', role: 'manager' },
  { email: 'employee1', name: 'Imran Shah', role: 'employee', jobTitle: 'Site Supervisor' },
  { email: 'employee2', name: 'Nadia Farooq', role: 'employee', jobTitle: 'Mason' },
  { email: 'employee3', name: 'Usman Raza', role: 'employee', jobTitle: 'Electrician' },
  { email: 'employee4', name: 'Hina Qureshi', role: 'employee', jobTitle: 'Procurement Assistant' },
  { email: 'employee5', name: 'Kamran Iqbal', role: 'employee', jobTitle: 'Plumber' },
  { email: 'employee6', name: 'Zoya Sheikh', role: 'employee', jobTitle: 'Site Coordinator' },
  { email: 'accountant', name: 'Farah Siddiqui', role: 'accountant' },
] as const;

async function main() {
  const email = (process.env.OWNER_SEED_EMAIL ?? 'owner@construction.local').trim().toLowerCase();
  const password = process.env.OWNER_SEED_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.OWNER_SEED_NAME ?? 'Company Owner';
  const demoDomain = (process.env.DEMO_ACCOUNT_DOMAIN ?? 'construction.com').trim().toLowerCase();
  const demoPassword = process.env.DEMO_SEED_PASSWORD ?? password;
  const passwordHash = await hashPassword(password);
  const demoPasswordHash = await hashPassword(demoPassword);

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

  for (const account of demoAccounts) {
    const demoEmail = `${account.email}@${demoDomain}`;
    const user = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {
        name: account.name,
        role: account.role,
        passwordHash: demoPasswordHash,
        emailVerified: true,
        isActive: true
      },
      create: {
        email: demoEmail,
        name: account.name,
        role: account.role,
        passwordHash: demoPasswordHash,
        emailVerified: true
      }
    });

    if (account.role === 'employee') {
      await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          name: account.name,
          email: demoEmail,
          jobTitle: account.jobTitle,
          status: 'active'
        },
        create: {
          userId: user.id,
          name: account.name,
          email: demoEmail,
          jobTitle: account.jobTitle,
          status: 'active'
        }
      });
    }
  }
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
