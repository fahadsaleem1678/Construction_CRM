import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = ['users', 'leads', 'quotations', 'quotation_items', 'activity_logs'];

async function main() {
  const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
    'select migration_name from _prisma_migrations order by migration_name',
  );
  const rls = await prisma.$queryRawUnsafe<Array<{ relname: string; relrowsecurity: boolean }>>(
    `select relname, relrowsecurity
     from pg_class
     join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public'
       and relname in (${tables.map((table) => `'${table}'`).join(',')})
     order by relname`,
  );

  console.log(
    JSON.stringify({
      migrationCount: migrations.length,
      rlsEnabled: rls.length === tables.length && rls.every((row) => row.relrowsecurity),
      tables: rls,
    }),
  );
}

main()
  .catch(() => {
    console.error('verification failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
