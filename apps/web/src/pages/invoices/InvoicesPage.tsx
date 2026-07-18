import { useEffect, useMemo, useState } from 'react';
import type { Invoice, InvoiceStatus, Project } from '@construction-crm/shared-types';
import { Button } from '../../components/Button';
import {
  generateInvoice,
  getInvoicePdf,
  listInvoices,
  listProjects,
  recordInvoicePayment,
  sendInvoice,
  updateInvoiceStatus,
} from '../../lib/api';
import { useSessionStore } from '../../lib/sessionStore';

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

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'border-sc-border bg-sc-surface text-sc-sub',
  sent: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  partially_paid: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  paid: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  overdue: 'border-red-400/20 bg-red-400/10 text-red-300',
};

type GenerateForm = {
  projectId: string;
  dueDate: string;
  includeApprovedExpenses: boolean;
};

type PaymentForm = {
  invoiceId: string;
  amountPaid: string;
  paidDate: string;
};

const DEFAULT_FORM: GenerateForm = {
  projectId: '',
  dueDate: '',
  includeApprovedExpenses: true,
};

export function InvoicesPage() {
  const { user } = useSessionStore();
  const canManage = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'accountant';

  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<GenerateForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');

  const summary = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter((invoice) => invoice.status === 'paid').length,
    outstanding: invoices.filter((invoice) => invoice.balanceDue > 0).length,
  }), [invoices]);

  async function loadInvoices() {
    setLoading(true);
    setError('');
    try {
      const response = await listInvoices({ status: statusFilter || undefined, pageSize: 100 });
      setInvoices(response.invoices);
      setOutstandingTotal(response.outstandingTotal);
      if (selectedInvoice) {
        const match = response.invoices.find((invoice) => invoice.id === selectedInvoice.id) ?? null;
        setSelectedInvoice(match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, [statusFilter]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    listProjects({ pageSize: 100 }).then((response) => {
      setProjects(response.projects);
      if (!form.projectId && response.projects[0]) {
        setForm((current) => ({ ...current, projectId: response.projects[0]!.id }));
      }
    }).catch(() => {});
  }, []);

  async function openPreview(invoice: Invoice) {
    setSelectedInvoice(invoice);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = await getInvoicePdf(invoice.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice PDF');
    }
  }

  async function handleGenerate() {
    if (!form.projectId) {
      setError('Choose a project to generate an invoice');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await generateInvoice({
        projectId: form.projectId,
        dueDate: form.dueDate || null,
        includeApprovedExpenses: form.includeApprovedExpenses,
      });
      setForm(DEFAULT_FORM);
      await loadInvoices();
      await openPreview(created.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSend(invoice: Invoice) {
    try {
      await updateInvoiceStatus(invoice.id, { status: 'sent' });
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    }
  }

  async function handleRecordPayment() {
    if (!paymentForm) return;
    try {
      await recordInvoicePayment(paymentForm.invoiceId, {
        amountPaid: Number(paymentForm.amountPaid),
        paidDate: paymentForm.paidDate || null,
      });
      setPaymentForm(null);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  async function handleSendInvoice() {
    if (!sendTarget) return;
    try {
      await sendInvoice(sendTarget.id, { recipientEmail: recipientEmail.trim() || null });
      setSendTarget(null);
      setRecipientEmail('');
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to email invoice');
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-sc-muted">Phase 7</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-sc-bright">Invoices</h1>
              <p className="mt-2 text-sm text-sc-muted">Generate project billing, track payments, and preview a printable invoice document.</p>
            </div>
            <div className="rounded-2xl border border-sc-border bg-sc-surface px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sc-muted">Outstanding</p>
              <p className="mt-1 text-lg font-semibold text-sc-amber">{money(outstandingTotal)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-sc-border bg-sc-surface p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sc-muted">Total</p>
              <p className="mt-2 text-xl font-semibold text-sc-bright">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-sc-border bg-sc-surface p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sc-muted">Paid</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">{summary.paid}</p>
            </div>
            <div className="rounded-2xl border border-sc-border bg-sc-surface p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sc-muted">Open</p>
              <p className="mt-2 text-xl font-semibold text-blue-300">{summary.outstanding}</p>
            </div>
          </div>

          {canManage && <div className="mt-6 space-y-4 rounded-2xl border border-sc-border bg-sc-surface p-4">
            <div>
              <p className="text-sm font-medium text-sc-bright">Generate invoice</p>
              <p className="mt-1 text-xs text-sc-muted">Pull quotation lines and approved project expenses into a fresh invoice.</p>
            </div>

            <label className="block text-xs text-sc-muted">
              Project
              <select
                value={form.projectId}
                onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-sc-border bg-sc-panel px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
                disabled={!canManage}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-sc-muted">
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-sc-border bg-sc-panel px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
                disabled={!canManage}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-sc-sub">
              <input
                type="checkbox"
                checked={form.includeApprovedExpenses}
                onChange={(event) => setForm((current) => ({ ...current, includeApprovedExpenses: event.target.checked }))}
                disabled={!canManage}
              />
              Include approved expenses
            </label>

            <Button variant="primary" size="sm" onClick={handleGenerate} disabled={!canManage || submitting}>
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>}
        </div>

        <div className="rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-sc-bright">Invoice Register</h2>
              <p className="mt-1 text-sm text-sc-muted">Review billing status and jump into printable previews.</p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as InvoiceStatus | '')}
              className="rounded-xl border border-sc-border bg-sc-surface px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

          <div className="mt-5 overflow-hidden rounded-2xl border border-sc-border">
            <table className="w-full text-sm">
              <thead className="bg-sc-surface text-left text-[11px] uppercase tracking-[0.18em] text-sc-muted">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sc-border">
                {loading ? (
                  [...Array(4)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4" colSpan={7}>
                        <div className="h-10 animate-pulse rounded-xl bg-sc-surface" />
                      </td>
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-sc-muted" colSpan={7}>
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-sc-surface/50">
                      <td className="px-4 py-4">
                        <button className="text-left" onClick={() => void openPreview(invoice)}>
                          <p className="font-medium text-sc-bright">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-sc-muted">{invoice.clientName}</p>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sc-sub">{invoice.projectName ?? '-'}</td>
                      <td className="px-4 py-4 text-sc-sub">{formatDate(invoice.dueDate)}</td>
                      <td className="px-4 py-4 text-right font-medium text-sc-bright">{money(invoice.total)}</td>
                      <td className="px-4 py-4 text-right text-sc-amber">{money(invoice.balanceDue)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${STATUS_STYLES[invoice.status]}`}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => void openPreview(invoice)}>
                            Preview
                          </Button>
                          {canManage && invoice.status === 'draft' && (
                            <Button variant="secondary" size="sm" onClick={() => void handleSend(invoice)}>
                              Mark Sent
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSendTarget(invoice);
                                setRecipientEmail('');
                              }}
                            >
                              Email PDF
                            </Button>
                          )}
                          {canManage && invoice.status !== 'paid' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setPaymentForm({
                                invoiceId: invoice.id,
                                amountPaid: String(invoice.amountPaid || invoice.total),
                                paidDate: new Date().toISOString().slice(0, 10),
                              })}
                            >
                              Record Payment
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sc-border bg-sc-panel p-4 shadow-sc-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-sc-bright">Printable Preview</h2>
            <p className="mt-1 text-sm text-sc-muted">Open an invoice to review the generated billing document.</p>
          </div>
          {selectedInvoice && previewUrl && (
            <a
              className="rounded-xl border border-sc-border bg-sc-surface px-3 py-2 text-sm text-sc-text"
              href={previewUrl}
              download={`${selectedInvoice.invoiceNumber}.pdf`}
            >
              Download PDF
            </a>
          )}
        </div>

        {previewUrl ? (
          <iframe title="Invoice preview" src={previewUrl} className="h-[720px] w-full rounded-2xl border border-sc-border bg-white" />
        ) : (
          <div className="grid h-[320px] place-items-center rounded-2xl border border-dashed border-sc-border bg-sc-surface text-sm text-sc-muted">
            Select an invoice to load its preview.
          </div>
        )}
      </section>

      {paymentForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
            <h3 className="text-lg font-semibold text-sc-bright">Record Payment</h3>
            <p className="mt-1 text-sm text-sc-muted">Set the cumulative paid amount for this invoice.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-sc-muted">
                Amount paid
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amountPaid}
                  onChange={(event) => setPaymentForm((current) => current ? { ...current, amountPaid: event.target.value } : current)}
                  className="mt-1 w-full rounded-xl border border-sc-border bg-sc-surface px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
                />
              </label>
              <label className="block text-xs text-sc-muted">
                Paid date
                <input
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(event) => setPaymentForm((current) => current ? { ...current, paidDate: event.target.value } : current)}
                  className="mt-1 w-full rounded-xl border border-sc-border bg-sc-surface px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPaymentForm(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => void handleRecordPayment()}>
                Save Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {sendTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
            <h3 className="text-lg font-semibold text-sc-bright">Email Invoice PDF</h3>
            <p className="mt-1 text-sm text-sc-muted">Leave the field blank to use the linked lead contact email.</p>
            <label className="mt-4 block text-xs text-sc-muted">
              Recipient email
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-sc-border bg-sc-surface px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
                placeholder="client@example.com"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSendTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => void handleSendInvoice()}>
                Send Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
