import { Buffer } from 'node:buffer';
import { Resend } from 'resend';
import type { Invoice } from '@construction-crm/shared-types';
import { AppError } from '../auth/errors.js';
import { env } from '../config/env.js';

export type SendInvoiceEmailInput = {
  invoice: Invoice;
  recipientEmail: string;
  pdf: Buffer;
  subject: string;
  intro: string;
};

export interface InvoiceNotifier {
  sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<void>;
}

export class ResendInvoiceNotifier implements InvoiceNotifier {
  private readonly client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async sendInvoiceEmail(input: SendInvoiceEmailInput) {
    if (!this.client || !env.INVOICE_EMAIL_FROM) {
      throw new AppError(500, 'Invoice email delivery is not configured');
    }

    const html = [
      `<p>${escapeHtml(input.intro)}</p>`,
      `<p><strong>Invoice:</strong> ${escapeHtml(input.invoice.invoiceNumber)}</p>`,
      `<p><strong>Client:</strong> ${escapeHtml(input.invoice.clientName)}</p>`,
      `<p><strong>Total:</strong> ${formatMoney(input.invoice.total)}</p>`,
      `<p><strong>Due date:</strong> ${formatDate(input.invoice.dueDate)}</p>`,
    ].join('');

    const { error } = await this.client.emails.send({
      from: env.INVOICE_EMAIL_FROM,
      to: [input.recipientEmail],
      replyTo: env.INVOICE_REPLY_TO,
      subject: input.subject,
      html,
      attachments: [
        {
          filename: `${input.invoice.invoiceNumber}.pdf`,
          content: input.pdf.toString('base64'),
        },
      ],
    });

    if (error) {
      throw new AppError(502, `Unable to send invoice email: ${error.message}`);
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
