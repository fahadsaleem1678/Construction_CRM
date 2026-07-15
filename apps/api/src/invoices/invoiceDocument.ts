import type { Invoice } from '@construction-crm/shared-types';

function money(value: number) {
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderInvoiceDocument(invoice: Invoice) {
  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="num">${item.quantity.toFixed(2)}</td>
          <td class="num">${money(item.unitPrice)}</td>
          <td class="num">${money(item.total)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #102133; margin: 32px; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
      .brand h1 { margin: 0; font-size: 28px; }
      .brand p, .meta p { margin: 4px 0; color: #506176; }
      .card { border: 1px solid #d6dde5; border-radius: 14px; padding: 20px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px 10px; border-bottom: 1px solid #e6ebf0; text-align: left; }
      th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #607287; }
      .num { text-align: right; white-space: nowrap; }
      .totals { margin-left: auto; width: 280px; }
      .totals td { border-bottom: none; padding: 6px 0; }
      .totals tr:last-child td { font-size: 18px; font-weight: 700; padding-top: 12px; }
      .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef5fb; color: #0f5f96; font-size: 12px; text-transform: capitalize; }
      @media print { body { margin: 20px; } }
    </style>
  </head>
  <body>
    <div class="top">
      <div class="brand">
        <h1>SiteCore CRM</h1>
        <p>Construction project billing</p>
      </div>
      <div class="meta">
        <p><strong>Invoice:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>
        <p><strong>Client:</strong> ${escapeHtml(invoice.clientName)}</p>
        <p><strong>Project:</strong> ${escapeHtml(invoice.projectName ?? 'Unlinked Project')}</p>
        <p><strong>Due:</strong> ${formatDate(invoice.dueDate)}</p>
        <p><strong>Status:</strong> <span class="pill">${escapeHtml(invoice.status.replace('_', ' '))}</span></p>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qty</th>
            <th class="num">Unit Price</th>
            <th class="num">Line Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <table class="totals">
      <tr><td>Subtotal</td><td class="num">${money(invoice.subtotal)}</td></tr>
      <tr><td>Tax</td><td class="num">${money(invoice.tax)}</td></tr>
      <tr><td>Paid</td><td class="num">${money(invoice.amountPaid)}</td></tr>
      <tr><td>Total Due</td><td class="num">${money(invoice.total)}</td></tr>
    </table>
  </body>
</html>`;
}
