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
  AuthUser
} from '@construction-crm/shared-types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

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
