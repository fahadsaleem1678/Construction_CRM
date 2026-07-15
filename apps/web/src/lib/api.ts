import type {
  AcceptInviteRequest,
  AuthResponse,
  CreateLeadRequest,
  InviteUserRequest,
  LeadListQuery,
  LeadListResponse,
  LeadActivity,
  Lead,
  LoginRequest,
  CreateQuotationRequest,
  Quotation,
  QuotationListResponse,
  QuotationStatus,
  RegisterOwnerRequest,
  UpdateLeadRequest,
  Project,
  ProjectActivity,
  ProjectListQuery,
  ProjectListResponse,
  ProjectMilestone,
  ProjectAssignment,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CreateAssignmentRequest,
  AuthUser,
  Invoice,
  InvoiceListQuery,
  InvoiceListResponse,
  UpdateInvoiceStatusRequest,
  RecordInvoicePaymentRequest,
  GenerateInvoiceRequest,
  SendInvoiceRequest,
  CreateDocumentUploadRequest,
  CreateDocumentUploadResponse,
  DocumentListQuery,
  DocumentRecord,
  DashboardAnalyticsResponse,
} from '@construction-crm/shared-types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const API_ROOT = API_BASE.replace(/\/api$/, '');

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: 'Request failed' }))) as {
      message?: string;
    };
    throw new Error(error.message ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function registerOwner(input: RegisterOwnerRequest) {
  const response = await apiFetch<AuthResponse>('/auth/register-owner', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  setAccessToken(response.accessToken);
  return response;
}

export async function login(input: LoginRequest) {
  const response = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  setAccessToken(response.accessToken);
  return response;
}

export async function refreshSession() {
  const response = await apiFetch<AuthResponse>('/auth/refresh', { method: 'POST' }, false);
  setAccessToken(response.accessToken);
  return response;
}

export async function logout() {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
  setAccessToken(null);
}

export function inviteUser(input: InviteUserRequest) {
  return apiFetch<{ inviteToken: string | null; providerInviteSent?: boolean }>('/auth/invite', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function acceptInvite(input: AcceptInviteRequest) {
  const response = await apiFetch<AuthResponse>('/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  setAccessToken(response.accessToken);
  return response;
}

export function listUsers() {
  return apiFetch<AuthUser[]>('/auth/users');
}

function toQueryString(query: LeadListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function listLeads(query: LeadListQuery = {}) {
  return apiFetch<LeadListResponse>(`/leads${toQueryString(query)}`);
}

export function getLead(id: string) {
  return apiFetch<{ lead: Lead; activities: LeadActivity[] }>(`/leads/${id}`);
}

export function createLead(input: CreateLeadRequest) {
  return apiFetch<{ lead: Lead }>('/leads', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateLead(id: string, input: UpdateLeadRequest) {
  return apiFetch<{ lead: Lead }>(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deleteLead(id: string) {
  return apiFetch<void>(`/leads/${id}`, { method: 'DELETE' });
}

export function startLeadQuotation(id: string) {
  return apiFetch<{ lead: Lead; quotationDraft: { leadId: string; clientName: string; estimatedValue: number } }>(
    `/leads/${id}/start-quotation`,
    { method: 'POST' },
  );
}

export function listQuotations() {
  return apiFetch<QuotationListResponse>('/quotations');
}

export function createQuotation(input: CreateQuotationRequest) {
  return apiFetch<{ quotation: Quotation }>('/quotations', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function setQuotationStatus(id: string, status: QuotationStatus) {
  return apiFetch<{ quotation: Quotation }>(`/quotations/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

// ── Projects ──────────────────────────────────────────────────────

function toProjectQueryString(query: ProjectListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function listProjects(query: ProjectListQuery = {}) {
  return apiFetch<ProjectListResponse>(`/projects${toProjectQueryString(query)}`);
}

export function getProject(id: string) {
  return apiFetch<{ project: Project; activities: ProjectActivity[] }>(`/projects/${id}`);
}

export function createProject(input: CreateProjectRequest) {
  return apiFetch<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function createProjectFromQuotation(quotationId: string) {
  return apiFetch<{ project: Project }>('/projects/from-quotation', {
    method: 'POST',
    body: JSON.stringify({ quotationId })
  });
}

export function updateProject(id: string, input: UpdateProjectRequest) {
  return apiFetch<{ project: Project }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deleteProject(id: string) {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
}

export function addMilestone(projectId: string, input: CreateMilestoneRequest) {
  return apiFetch<{ milestone: ProjectMilestone }>(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateMilestone(projectId: string, milestoneId: string, input: UpdateMilestoneRequest) {
  return apiFetch<{ milestone: ProjectMilestone }>(`/projects/${projectId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deleteMilestone(projectId: string, milestoneId: string) {
  return apiFetch<void>(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });
}

export function addAssignment(projectId: string, input: CreateAssignmentRequest) {
  return apiFetch<{ assignment: ProjectAssignment }>(`/projects/${projectId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function removeAssignment(projectId: string, assignmentId: string) {
  return apiFetch<void>(`/projects/${projectId}/assignments/${assignmentId}`, { method: 'DELETE' });
}

// ── Employees ─────────────────────────────────────────────────────

export function listEmployees(query: import('@construction-crm/shared-types').EmployeeListQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return apiFetch<import('@construction-crm/shared-types').EmployeeListResponse>(`/employees${qs ? `?${qs}` : ''}`);
}

export function getEmployee(id: string) {
  return apiFetch<{ employee: import('@construction-crm/shared-types').Employee }>(`/employees/${id}`);
}

export function createEmployee(input: import('@construction-crm/shared-types').CreateEmployeeRequest) {
  return apiFetch<{ employee: import('@construction-crm/shared-types').Employee }>('/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEmployee(id: string, input: import('@construction-crm/shared-types').UpdateEmployeeRequest) {
  return apiFetch<{ employee: import('@construction-crm/shared-types').Employee }>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteEmployee(id: string) {
  return apiFetch<void>(`/employees/${id}`, { method: 'DELETE' });
}

// ── Expenses ──────────────────────────────────────────────────────

export function listExpenses(query: import('@construction-crm/shared-types').ExpenseListQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return apiFetch<import('@construction-crm/shared-types').ExpenseListResponse>(`/expenses${qs ? `?${qs}` : ''}`);
}

export function getExpense(id: string) {
  return apiFetch<{ expense: import('@construction-crm/shared-types').Expense }>(`/expenses/${id}`);
}

export function createExpense(input: import('@construction-crm/shared-types').CreateExpenseRequest) {
  return apiFetch<{ expense: import('@construction-crm/shared-types').Expense }>('/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function approveExpense(id: string) {
  return apiFetch<{ expense: import('@construction-crm/shared-types').Expense }>(`/expenses/${id}/approve`, {
    method: 'PATCH',
  });
}

export function rejectExpense(id: string, rejectionNote: string) {
  return apiFetch<{ expense: import('@construction-crm/shared-types').Expense }>(`/expenses/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionNote }),
  });
}

export function deleteExpense(id: string) {
  return apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });
}

// Invoices

function toInvoiceQueryString(query: InvoiceListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function listInvoices(query: InvoiceListQuery = {}) {
  return apiFetch<InvoiceListResponse>(`/invoices${toInvoiceQueryString(query)}`);
}

export function getInvoice(id: string) {
  return apiFetch<{ invoice: Invoice }>(`/invoices/${id}`);
}

export function generateInvoice(input: GenerateInvoiceRequest) {
  return apiFetch<{ invoice: Invoice }>('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateInvoiceStatus(id: string, input: UpdateInvoiceStatusRequest) {
  return apiFetch<{ invoice: Invoice }>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function recordInvoicePayment(id: string, input: RecordInvoicePaymentRequest) {
  return apiFetch<{ invoice: Invoice }>(`/invoices/${id}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function sendInvoice(id: string, input: SendInvoiceRequest) {
  return apiFetch<{ invoice: Invoice; deliveredTo: string }>(`/invoices/${id}/send`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getInvoiceDocument(id: string) {
  const response = await fetch(`${API_BASE}/invoices/${id}/document`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (response.status === 401) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return getInvoiceDocument(id);
    }
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Request failed');
    throw new Error(error || 'Request failed');
  }

  return response.text();
}

export async function getInvoicePdf(id: string) {
  const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (response.status === 401) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return getInvoicePdf(id);
    }
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Request failed');
    throw new Error(error || 'Request failed');
  }

  return response.blob();
}

function toApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${API_ROOT}${path}`;
  return `${API_BASE}/${path.replace(/^\//, '')}`;
}

async function fetchBlobWithAuth(path: string) {
  const response = await fetch(toApiUrl(path), {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (response.status === 401) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return fetchBlobWithAuth(path);
    }
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Request failed');
    throw new Error(error || 'Request failed');
  }

  return response.blob();
}

function toDocumentQueryString(query: DocumentListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function listDocuments(query: DocumentListQuery = {}) {
  return apiFetch<{ documents: DocumentRecord[] }>(`/documents${toDocumentQueryString(query)}`);
}

export function createDocumentUpload(input: CreateDocumentUploadRequest) {
  return apiFetch<CreateDocumentUploadResponse>('/documents/uploads', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function uploadDocumentBinary(
  uploadUrl: string,
  headers: Record<string, string>,
  file: File,
) {
  const response = await fetch(toApiUrl(uploadUrl), {
    method: 'PUT',
    credentials: uploadUrl.startsWith('/') ? 'include' : 'omit',
    headers: {
      ...(accessToken && uploadUrl.startsWith('/') ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: file,
  });

  if (response.status === 401 && uploadUrl.startsWith('/')) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return uploadDocumentBinary(uploadUrl, headers, file);
    }
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Upload failed');
    throw new Error(error || 'Upload failed');
  }
}

export function completeDocumentUpload(id: string) {
  return apiFetch<{ document: DocumentRecord }>(`/documents/${id}/complete`, {
    method: 'POST',
  });
}

export function deleteDocument(id: string) {
  return apiFetch<void>(`/documents/${id}`, { method: 'DELETE' });
}

export function getDocumentBlob(id: string) {
  return fetchBlobWithAuth(`/documents/${id}/download`);
}

export function getDashboardAnalytics(months = 6) {
  return apiFetch<DashboardAnalyticsResponse>(`/analytics/dashboard?months=${months}`);
}
