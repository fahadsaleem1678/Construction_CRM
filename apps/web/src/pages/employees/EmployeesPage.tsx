import { useEffect, useState, useCallback } from 'react';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../../lib/api';
import { useSessionStore } from '../../lib/sessionStore';
import type {
  Employee,
  EmploymentStatus,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '@construction-crm/shared-types';

// ── Helpers ───────────────────────────────────────────────────────

function statusBadge(status: EmploymentStatus) {
  const map: Record<EmploymentStatus, { label: string; cls: string }> = {
    active:     { label: 'Active',     cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    inactive:   { label: 'Inactive',   cls: 'text-sc-muted  bg-sc-surface  border-sc-border'          },
    terminated: { label: 'Terminated', cls: 'text-red-400   bg-red-400/10   border-red-400/20'         },
  };
  const { label, cls } = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium  tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

function money(v: number | null) {
  if (v === null) return '-';
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(v);
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 text-sc-muted" aria-hidden="true">
        <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sc-muted text-sm mb-4">No employees yet</p>
      <Button variant="primary" size="sm" onClick={onAdd}>Add first employee</Button>
    </div>
  );
}

// ── Employee form ─────────────────────────────────────────────────

type EmployeeFormData = {
  name: string;
  jobTitle: string;
  phone: string;
  email: string;
  cnic: string;
  dailyWage: string;
  monthlySalary: string;
  hireDate: string;
  notes: string;
  status: EmploymentStatus;
};

const EMPTY_FORM: EmployeeFormData = {
  name: '', jobTitle: '', phone: '', email: '', cnic: '',
  dailyWage: '', monthlySalary: '', hireDate: '', notes: '', status: 'active',
};

function fromEmployee(e: Employee): EmployeeFormData {
  return {
    name: e.name,
    jobTitle: e.jobTitle,
    phone: e.phone ?? '',
    email: e.email ?? '',
    cnic: e.cnic ?? '',
    dailyWage: e.dailyWage !== null ? String(e.dailyWage) : '',
    monthlySalary: e.monthlySalary !== null ? String(e.monthlySalary) : '',
    hireDate: e.hireDate ? e.hireDate.split('T')[0]! : '',
    notes: e.notes ?? '',
    status: e.status,
  };
}

// ── Main page ─────────────────────────────────────────────────────

export function EmployeesPage() {
  const { user } = useSessionStore();
  const canEdit = user?.role === 'owner' || user?.role === 'admin';
  const canSeeSalary = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'accountant';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | ''>('active');

  // Drawer / form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listEmployees({ status: statusFilter || undefined });
      setEmployees(res.employees);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDrawerOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp);
    setForm(fromEmployee(emp));
    setFormError('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditTarget(null);
    setFormError('');
  }

  function setField<K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.jobTitle.trim()) { setFormError('Job title is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateEmployeeRequest | UpdateEmployeeRequest = {
        name: form.name.trim(),
        jobTitle: form.jobTitle.trim(),
        cnic: form.cnic.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        dailyWage: form.dailyWage ? Number(form.dailyWage) : null,
        monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : null,
        hireDate: form.hireDate || null,
        notes: form.notes.trim() || null,
        ...(editTarget ? { status: form.status } : {}),
      };
      if (editTarget) {
        await updateEmployee(editTarget.id, payload as UpdateEmployeeRequest);
      } else {
        await createEmployee(payload as CreateEmployeeRequest);
      }
      closeDrawer();
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this employee? They will be marked as terminated.')) return;
    try {
      await deleteEmployee(id);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to deactivate employee');
    }
  }

  const STATUS_FILTERS: Array<{ value: EmploymentStatus | ''; label: string }> = [
    { value: '',           label: 'All'        },
    { value: 'active',     label: 'Active'     },
    { value: 'inactive',   label: 'Inactive'   },
    { value: 'terminated', label: 'Terminated' },
  ];

  return (
    <>
      {/* Header */}
      <div className="border-b border-sc-border bg-sc-base sticky top-[56px] z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-sc-bright tracking-tight">Employees</h1>
            <p className="text-xs text-sc-muted mt-0.5 font-medium">
              {loading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status filter pills */}
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
            {canEdit && (
              <Button variant="primary" size="sm" onClick={openCreate}>
                + Add Employee
              </Button>
            )}
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
        ) : employees.length === 0 ? (
          <EmptyState onAdd={canEdit ? openCreate : () => {}} />
        ) : (
          <div className="rounded-lg border border-sc-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sc-border bg-sc-surface">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Employee</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Job Title</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Contact</th>
                  {canSeeSalary && (
                    <th className="px-4 py-2.5 text-right text-[10px] font-medium  tracking-widest text-sc-muted">Pay</th>
                  )}
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Status</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium  tracking-widest text-sc-muted">Hire Date</th>
                  {canEdit && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-sc-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-sc-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sc-amber/10 border border-sc-amber/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-sc-amber font-bold">{initials(emp.name)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sc-bright text-sm">{emp.name}</p>
                          {emp.cnic && <p className="text-[10px] text-sc-muted font-medium">{emp.cnic}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sc-text text-sm">{emp.jobTitle}</td>
                    <td className="px-4 py-3">
                      <p className="text-sc-text text-xs">{emp.phone ?? '-'}</p>
                      {emp.email && <p className="text-[10px] text-sc-muted">{emp.email}</p>}
                    </td>
                    {canSeeSalary && (
                      <td className="px-4 py-3 text-right">
                        {emp.monthlySalary !== null && (
                          <p className="text-sc-amber font-medium text-xs font-semibold">{money(emp.monthlySalary)}<span className="text-sc-muted font-normal">/mo</span></p>
                        )}
                        {emp.dailyWage !== null && (
                          <p className="text-sc-muted font-medium text-[10px]">{money(emp.dailyWage)}/day</p>
                        )}
                        {emp.monthlySalary === null && emp.dailyWage === null && (
                          <p className="text-sc-muted font-medium text-xs">-</p>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                    <td className="px-4 py-3 text-sc-muted text-xs font-medium">
                      {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(emp)}
                            className="px-2 py-1 text-[10px] font-medium text-sc-muted hover:text-sc-text rounded border border-sc-border hover:border-sc-text/30 transition-colors"
                          >
                            Edit
                          </button>
                          {emp.status === 'active' && (
                            <button
                              onClick={() => handleDeactivate(emp.id)}
                              className="px-2 py-1 text-[10px] font-medium text-red-400/70 hover:text-red-400 rounded border border-red-400/10 hover:border-red-400/30 transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button className="flex-1 bg-black/50" onClick={closeDrawer} aria-label="Close" />
          <div className="w-full max-w-md bg-sc-panel border-l border-sc-border flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sc-border">
              <h2 className="text-sm font-semibold text-sc-bright tracking-tight">
                {editTarget ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={closeDrawer} className="text-sc-muted hover:text-sc-text transition-colors" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs" role="alert">
                  {formError}
                </div>
              )}

              <TextField
                id="emp-name"
                label="Full Name"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Ali Hassan"
                required
              />
              <TextField
                id="emp-job-title"
                label="Job Title"
                value={form.jobTitle}
                onChange={e => setField('jobTitle', e.target.value)}
                placeholder="Site Foreman"
                required
              />
              <TextField
                id="emp-phone"
                label="Phone"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+92 300 1234567"
              />
              <TextField
                id="emp-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="ali@example.com"
              />
              <TextField
                id="emp-cnic"
                label="CNIC"
                value={form.cnic}
                onChange={e => setField('cnic', e.target.value)}
                placeholder="35202-1234567-1"
              />

              {/* Salary section - only for admin/owner */}
              {canSeeSalary && (
                <div className="pt-2 border-t border-sc-border space-y-4">
                  <p className="text-[10px] font-medium  tracking-widest text-sc-muted">Compensation</p>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      id="emp-daily-wage"
                      label="Daily Wage (PKR)"
                      type="number"
                      value={form.dailyWage}
                      onChange={e => setField('dailyWage', e.target.value)}
                      placeholder="2500"
                    />
                    <TextField
                      id="emp-monthly-salary"
                      label="Monthly Salary (PKR)"
                      type="number"
                      value={form.monthlySalary}
                      onChange={e => setField('monthlySalary', e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                </div>
              )}

              <TextField
                id="emp-hire-date"
                label="Hire Date"
                type="date"
                value={form.hireDate}
                onChange={e => setField('hireDate', e.target.value)}
              />

              {editTarget && (
                <div>
                  <label className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setField('status', e.target.value as EmploymentStatus)}
                    className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-sc-amber"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="emp-notes" className="block text-[10px] font-medium  tracking-widest text-sc-muted mb-1.5">Notes</label>
                <textarea
                  id="emp-notes"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional info…"
                  className="w-full bg-sc-surface border border-sc-border rounded-lg px-3 py-2 text-sc-text text-sm focus:outline-none focus:ring-1 focus:ring-sc-amber resize-none placeholder:text-sc-muted/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-sc-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeDrawer} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Employee'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
