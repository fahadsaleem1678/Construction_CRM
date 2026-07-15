import cron from 'node-cron';
import type { InvoiceService } from './invoiceService.js';
import { env } from '../config/env.js';

export function startInvoiceReminderScheduler(invoices: InvoiceService) {
  const job = cron.schedule(env.INVOICE_REMINDER_CRON, async () => {
    try {
      await invoices.sendDueReminders();
    } catch (error) {
      console.error('invoice reminder job failed', error);
    }
  });

  return job;
}
