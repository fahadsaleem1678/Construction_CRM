import { createApp } from './app.js';
import { env } from './config/env.js';
import { PrismaExpenseStore } from './expenses/prismaExpenseStore.js';
import { PrismaInvoiceStore } from './invoices/prismaInvoiceStore.js';
import { ResendInvoiceNotifier } from './invoices/invoiceNotifier.js';
import { startInvoiceReminderScheduler } from './invoices/invoiceScheduler.js';
import { InvoiceService } from './invoices/invoiceService.js';
import { PrismaLeadStore } from './leads/prismaLeadStore.js';
import { prisma } from './db/prisma.js';
import { PrismaProjectStore } from './projects/prismaProjectStore.js';
import { PrismaQuotationStore } from './quotations/prismaQuotationStore.js';

const app = createApp();
const reminderJob = startInvoiceReminderScheduler(
  new InvoiceService(
    new PrismaInvoiceStore(prisma),
    new PrismaProjectStore(prisma),
    new PrismaQuotationStore(prisma),
    new PrismaExpenseStore(prisma),
    new PrismaLeadStore(prisma),
    new ResendInvoiceNotifier(),
  ),
);

const server = app.listen(env.API_PORT, () => {
  console.log(`Construction CRM API listening on ${env.API_PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    reminderJob.stop();
    server.close();
  });
}
