import { useEffect, useState, useCallback } from 'react';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import {
  listExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
  listProjects,
  listEmployees,
} from '../../lib/api';
import { useSessionStore } from '../../lib/sessionStore';
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  CreateExpenseRequest,
} from '@construction-crm/shared-types';

// ── Helpers ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materials:  'Materials',
  labor:      'Labor',
  transport:  'Transport',
  equipment:  'Equipment',
  overhead:   'Overhead',
  other:      'Other',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  materials:  'text-amber-400  bg-amber-400/10  border-amber-400/20',
  labor:      'text-blue-400   bg-blue-400/10   border-blue-400/20',
  transport:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  equipment:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  overhead:   'text-slate-400  bg-slate-400/10  border-slate-400/20',
  other:      'text-sc-muted   bg-sc-surface    border-sc-border',
};

function categoryBadge(cat: ExpenseCategory) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium  tracking-widest ${CATEGORY_COLORS[cat]}`}>
      {CATEGORY_LABELS[cat]}
    </span>
  );
}

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
};

function statusBadge(status: ExpenseStatus) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium  tracking-widest ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function money(v: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 text-sc-muted" aria-hidden="true">
        <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 20h16M16 27h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M30 6v8M18 6v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p className="text-sc-muted text-sm mb-4">No expenses logged yet</p>
      <Button variant="primary" size="sm" onClick={onSubmit}>Log first expense</Button>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-sc-panel border border-sc-border rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold text-sc-bright mb-3">Reject Expense</h3>
        <p className="text-xs text-sc-muted mb-4">Provide a reason - the submitter will see this.</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Reason for rejection…"
          className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none placeholder:text-sc-muted/50 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => note.trim() && onConfirm(note)} disabled={!note.trim()}>
            Confirm Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

type FormState = {
  category: ExpenseCategory;
  description: string;
  amount: string;
  expenseDate: string;
  projectId: string;
  employeeId: string;
  receiptNote: string;
};

const EMPTY_FORM: FormState = {
  category: 'materials',
  description: '',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0]!,
  projectId: '',
  employeeId: '',
  receiptNote: '',
};

export function ExpensesPage() {
  const { user } = useSessionStore();
  const canApprove = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'accountant';
  const canReject  = canApprove || user?.role === 'manager';
  const canDelete  = user?.role === 'owner' || user?.role === 'admin';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');

  // Project / employee options for form
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>([]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listExpenses({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setExpenses(res.expenses);
      setTotal(res.total);
      setTotalAmount(res.totalAmount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { void load(); }, [load]);

  // Load project and employee options for form
  useEffect(() => {
    listProjects({ pageSize: 100 }).then(r => {
      setProjectOptions(r.projects.map(p => ({ id: p.id, name: p.name })));
    }).catch(() => {});
    listEmployees({ status: 'active', pageSize: 100 }).then(r => {
      setEmployeeOptions(r.employees.map(e => ({ id: e.id, name: e.name })));
    }).catch(() => {});
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setFormError('');
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.description.trim()) { setFormError('Description is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setFormError('Amount must be greater than 0'); return; }
    if (!form.expenseDate) { setFormError('Date is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateExpenseRequest = {
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        projectId: form.projectId || null,
        employeeId: form.employeeId || null,
        receiptNote: form.receiptNote.trim() || null,
      };
      await createExpense(payload);
      closeDrawer();
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveExpense(id);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve expense');
    }
  }

  async function handleReject(id: string, note: string) {
    try {
      await rejectExpense(id, note);
      setRejectTarget(null);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reject expense');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this expense?')) return;
    try {
      await deleteExpense(id);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete expense');
    }
  }

  const STATUS_FILTERS: Array<{ value: ExpenseStatus | ''; label: string }> = [
    { value: '',         label: 'All'      },
    { value: 'pending',  label: 'Pending'  },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

  return (
    <>
      {/* Header */}
      <div className="border-b border-sc-border bg-sc-base sticky top-[56px] z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-sc-bright tracking-tight">Expenses</h1>
              <p className="text-xs text-sc-muted mt-0.5 font-medium">
                {loading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''} · Total: ${money(totalAmount)}`}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Log Expense
            </Button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {/* Status pills */}
            <div className="flex items-center gap-1 bg-sc-surface rounded-lg border border-sc-border p-0.5">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    statusFilter === f.value
                      ? 'bg-sc-amber text-sc-base font-semibold'
                      : 'text-sc-muted hover:text-sc-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as ExpenseCategory | '')}
              className="bg-sc-surface border border-sc-border rounded-lg px-3 py-1.5 text-xs text-sc-text font-medium focus:outline-none focus:ring-1 focus:ring-sc-amber"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-sc-surface animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState onSubmit={openCreate} />
        ) : (
          <div className="rounded-lg border border-sc-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sc-border bg-sc-surface">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Category</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Description</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Project</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Submitted By</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium  tracking-widest text-sc-muted">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sc-border">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-sc-surface/50 transition-colors">
                    <td className="px-4 py-3 text-sc-muted text-xs font-medium whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="px-4 py-3">{categoryBadge(exp.category)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sc-text text-sm">{exp.description}</p>
                      {exp.receiptNote && (
                        <p className="text-[10px] text-sc-muted mt-0.5 font-medium">📎 {exp.receiptNote}</p>
                      )}
                      {exp.rejectionNote && (
                        <p className="text-[10px] text-red-400 mt-0.5">Rejected: {exp.rejectionNote}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sc-text text-xs">{exp.projectName ?? '-'}</td>
                    <td className="px-4 py-3 text-sc-muted text-xs">{exp.submitterName ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sc-amber font-medium font-semibold text-sm">{money(exp.amount)}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(exp.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {exp.status === 'pending' && canApprove && (
                          <button
                            onClick={() => handleApprove(exp.id)}
                            className="px-2 py-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 rounded border border-emerald-400/20 hover:border-emerald-400/40 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {exp.status === 'pending' && canReject && (
                          <button
                            onClick={() => setRejectTarget(exp.id)}
                            className="px-2 py-1 text-[10px] font-medium text-red-400/70 hover:text-red-400 rounded border border-red-400/10 hover:border-red-400/30 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="px-2 py-1 text-[10px] font-medium text-sc-muted hover:text-red-400 rounded border border-sc-border hover:border-red-400/20 transition-colors"
                            title="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit expense drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button className="flex-1 bg-black/50" onClick={closeDrawer} aria-label="Close" />
          <div className="w-full max-w-md bg-sc-panel border-l border-sc-border flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sc-border">
              <h2 className="text-sm font-semibold text-sc-bright tracking-tight">Log Expense</h2>
              <button onClick={closeDrawer} className="text-sc-muted hover:text-sc-text transition-colors" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="flex-1 p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs" role="alert">
                  {formError}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setField('category', cat)}
                      className={`px-2 py-2 text-xs rounded-lg border transition-colors font-medium ${
                        form.category === cat
                          ? 'bg-sc-amber text-sc-base border-sc-amber font-semibold'
                          : 'bg-sc-surface border-sc-border text-sc-muted hover:text-sc-text hover:border-sc-text/30'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <TextField
                id="exp-desc"
                label="Description"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="50 bags of cement"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="exp-amount"
                  label="Amount (PKR)"
                  type="number"
                  value={form.amount}
                  onChange={e => setField('amount', e.target.value)}
                  placeholder="12500"
                  required
                />
                <TextField
                  id="exp-date"
                  label="Date"
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setField('expenseDate', e.target.value)}
                  required
                />
              </div>

              {/* Project linkage */}
              {projectOptions.length > 0 && (
                <div>
                  <label className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Linked Project</label>
                  <select
                    value={form.projectId}
                    onChange={e => setField('projectId', e.target.value)}
                    className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-sc-amber"
                  >
                    <option value="">- No project -</option>
                    {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Employee linkage */}
              {employeeOptions.length > 0 && (
                <div>
                  <label className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Linked Employee</label>
                  <select
                    value={form.employeeId}
                    onChange={e => setField('employeeId', e.target.value)}
                    className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-sc-amber"
                  >
                    <option value="">- No employee -</option>
                    {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="exp-receipt" className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Receipt Note</label>
                <textarea
                  id="exp-receipt"
                  value={form.receiptNote}
                  onChange={e => setField('receiptNote', e.target.value)}
                  rows={2}
                  placeholder="Voucher #4521, paid cash to Malik Traders…"
                  className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-sc-amber resize-none placeholder:text-sc-muted/50"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-sc-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeDrawer} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={(note) => handleReject(rejectTarget, note)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </>
  );
}
