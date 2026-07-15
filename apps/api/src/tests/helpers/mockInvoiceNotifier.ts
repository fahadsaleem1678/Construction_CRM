import type { InvoiceNotifier, SendInvoiceEmailInput } from '../../invoices/invoiceNotifier.js';

export class MockInvoiceNotifier implements InvoiceNotifier {
  sent: SendInvoiceEmailInput[] = [];

  async sendInvoiceEmail(input: SendInvoiceEmailInput) {
    this.sent.push(input);
  }
}
