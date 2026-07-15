import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, '..', '..');
const workspaceRoot = resolve(apiRoot, '..', '..');

for (const envPath of [resolve(workspaceRoot, '.env'), resolve(apiRoot, '.env')]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const prisma = new PrismaClient();

const tables = [
  'users',
  'user_invitations',
  'password_reset_tokens',
  'leads',
  'quotations',
  'quotation_items',
  'activity_logs',
  'projects',
  'project_milestones',
  'project_assignments',
  'employees',
  'expenses',
  'invoices',
  'invoice_items',
  'documents',
];

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
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : 'verification failed' }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
