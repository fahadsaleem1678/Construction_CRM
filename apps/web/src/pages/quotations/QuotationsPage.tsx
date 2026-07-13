import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CreateQuotationItemRequest, Quotation, QuotationStatus } from '@construction-crm/shared-types';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { createQuotation, listQuotations, setQuotationStatus } from '../../lib/api';

const statuses: QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

const statusBadge: Record<QuotationStatus, string> = {
  draft:    'badge-default',
  sent:     'badge-blue',
  accepted: 'badge-green',
  rejected: 'badge-red',
  expired:  'badge-yellow',
};

function money(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const SC_SELECT = [
  'w-full rounded-md border border-sc-border bg-sc-surface px-3 py-2 text-xs text-sc-text',
  'focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30',
  'transition-colors appearance-none',
].join(' ');

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [leadId, setLeadId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<CreateQuotationItemRequest[]>([
    { description: 'Construction scope', unit: 'job', quantity: 1, unitPrice: 1000 }
  ]);
  const [taxRate, setTaxRate] = useState(0.16);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await listQuotations();
      setQuotations(res.quotations);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load quotations'); }
  }

  useEffect(() => { void load(); }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxRate]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    try {
      const res = await createQuotation({ leadId, validUntil: validUntil ? new Date(validUntil).toISOString() : null, taxRate, items });
      setMessage(`Created ${res.quotation.quotationNumber}`);
      setLeadId(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create quotation'); }
  }

  async function transition(quotation: Quotation, status: QuotationStatus) {
    setError(null);
    try { await setQuotationStatus(quotation.id, status); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update quotation'); }
  }

  function updateItem<K extends keyof CreateQuotationItemRequest>(index: number, key: K, value: CreateQuotationItemRequest[K]) {
    setItems(items.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-sc-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-sc-bright">Quotations</h1>
          <p className="mt-0.5 text-xs text-sc-muted">Build itemised proposals and manage approval states.</p>
        </div>
        <button
          type="button"
          id="refresh-quotations-btn"
          onClick={() => void load()}
          className="self-start inline-flex h-8 items-center gap-1.5 rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:text-sc-text active:scale-[0.98]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Refresh
        </button>
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">

        {/* Create form sidebar */}
        <aside className="space-y-5 lg:border-r lg:border-sc-border lg:pr-8">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-sc-muted">New Quotation</h2>
          <form onSubmit={submit} id="create-quotation-form" className="space-y-4">
            <TextField label="Lead ID" value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="UUID of the lead" required />
            <TextField label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <TextField label="Tax rate (0–1)" type="number" step="0.01" min="0" max="1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />

            {/* Line items */}
            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-sc-sub">Line Items</span>
              {items.map((item, index) => (
                <div key={index} className="rounded-md border border-sc-border bg-sc-surface p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <TextField
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="mt-6 h-9 px-2 rounded-md border border-sc-border text-sc-muted hover:text-red-400 hover:border-sc-red/40 transition text-xs"
                        aria-label="Remove line item"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <TextField label="Unit" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} />
                    <TextField label="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                    <TextField label="Price" type="number" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))} />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              id="add-line-item-btn"
              onClick={() => setItems([...items, { description: '', unit: 'item', quantity: 1, unitPrice: 0 }])}
              className="w-full h-8 rounded-md border border-dashed border-sc-border2 text-xs text-sc-muted hover:border-sc-amber/40 hover:text-sc-amber transition"
            >
              Add line item
            </button>

            {/* Price summary */}
            <div className="rounded-md border border-sc-border bg-sc-surface divide-y divide-sc-border font-mono text-xs overflow-hidden">
              <div className="flex justify-between px-3 py-2 text-sc-muted">
                <span>Subtotal</span><span>{money(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-sc-muted">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span><span>{money(totals.tax)}</span>
              </div>
              <div className="flex justify-between px-3 py-2.5 text-sc-bright font-semibold bg-sc-raised text-sm">
                <span>Total</span><span className="text-sc-amber">{money(totals.total)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full h-10 text-sm font-semibold">Create quotation</Button>
          </form>
        </aside>

        {/* Quotations list */}
        <section className="space-y-4 min-w-0">
          {message && (
            <div className="rounded-md border border-green-900/50 bg-sc-green-m/30 px-3 py-2.5 text-xs text-green-400 animate-slide-in" role="status">{message}</div>
          )}
          {error && (
            <div className="rounded-md border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">{error}</div>
          )}

          <div className="flex items-center justify-between border-b border-sc-border pb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">
              {quotations.length} proposal{quotations.length !== 1 ? 's' : ''}
            </span>
          </div>

          {quotations.length === 0 ? (
            <div className="rounded-md border border-sc-border bg-sc-surface py-16 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">No quotations yet</p>
              <p className="mt-1 text-xs text-sc-muted">Create one using the form on the left.</p>
            </div>
          ) : (
            <div className="divide-y divide-sc-border border-y border-sc-border">
              {quotations.map((quotation) => (
                <div key={quotation.id} className="py-5 space-y-4 first:pt-0 last:pb-0">
                  {/* Header row */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold text-sc-bright">{quotation.quotationNumber}</span>
                        <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider font-medium ${statusBadge[quotation.status]}`}>
                          {quotation.status}
                        </span>
                      </div>
                      <span className="block text-xs text-sc-muted">{quotation.leadClientName ?? `Lead: ${quotation.leadId}`}</span>
                      {quotation.validUntil && (
                        <span className="block font-mono text-[10px] text-sc-muted">
                          Valid until {new Date(quotation.validUntil).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <span className="block text-base font-semibold text-sc-amber font-mono">{money(quotation.total)}</span>
                      <span className="block font-mono text-[10px] text-sc-muted mt-0.5">
                        Subtotal: {money(quotation.subtotal)} · Tax: {money(quotation.tax)}
                      </span>
                    </div>
                  </div>

                  {/* Status transition buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {statuses.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={quotation.status === s}
                        onClick={() => void transition(quotation, s)}
                        className={[
                          'inline-flex h-7 items-center rounded-md px-2.5 font-mono text-[10px] uppercase tracking-wider transition active:scale-[0.98]',
                          quotation.status === s
                            ? 'bg-sc-raised border border-sc-border2 text-sc-muted cursor-not-allowed'
                            : 'border border-sc-border bg-sc-surface text-sc-sub hover:bg-sc-raised hover:text-sc-text',
                        ].join(' ')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Line items summary */}
                  {quotation.items && quotation.items.length > 0 && (
                    <div className="rounded-md border border-sc-border bg-sc-surface overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-sc-border">
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-sc-muted">Item</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-sc-muted">Unit</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-sc-muted text-right">Qty</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-sc-muted text-right">Price</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-sc-muted text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sc-border">
                          {quotation.items.map((item) => (
                            <tr key={item.id} className="sc-table-row transition-colors">
                              <td className="px-3 py-2 text-sc-text">{item.description}</td>
                              <td className="px-3 py-2 text-sc-muted">{item.unit}</td>
                              <td className="px-3 py-2 text-sc-muted text-right font-mono">{item.quantity}</td>
                              <td className="px-3 py-2 text-sc-muted text-right font-mono">{money(item.unitPrice)}</td>
                              <td className="px-3 py-2 text-sc-text text-right font-mono font-medium">{money(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
