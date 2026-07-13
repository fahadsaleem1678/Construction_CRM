export const userRoles = ['owner', 'admin', 'manager', 'employee', 'accountant'] as const;

export type UserRole = (typeof userRoles)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterOwnerRequest = {
  email: string;
  password: string;
  name: string;
};

export type InviteUserRequest = {
  email: string;
  name: string;
  role: Exclude<UserRole, 'owner'>;
};

export type AcceptInviteRequest = {
  token: string;
  password: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export const leadStatuses = ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const leadSources = ['walk_in', 'referral', 'website', 'phone', 'social', 'other'] as const;

export type LeadSource = (typeof leadSources)[number];

export type Lead = {
  id: string;
  clientName: string;
  contactPhone: string;
  contactEmail: string | null;
  source: LeadSource;
  status: LeadStatus;
  estimatedValue: number;
  assignedTo: string | null;
  assignedUserName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: string;
  userName: string | null;
  action: string;
  entityType: 'lead';
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type LeadListQuery = {
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
};

export type LeadListResponse = {
  leads: Lead[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateLeadRequest = {
  clientName: string;
  contactPhone: string;
  contactEmail?: string | null;
  source: LeadSource;
  status?: LeadStatus;
  estimatedValue?: number;
  assignedTo?: string | null;
  notes?: string | null;
};

export type UpdateLeadRequest = Partial<CreateLeadRequest>;

export const quotationStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;

export type QuotationStatus = (typeof quotationStatuses)[number];

export type QuotationItem = {
  id: string;
  quotationId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Quotation = {
  id: string;
  leadId: string;
  leadClientName: string | null;
  quotationNumber: string;
  status: QuotationStatus;
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: QuotationItem[];
};

export type CreateQuotationItemRequest = {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type CreateQuotationRequest = {
  leadId: string;
  validUntil?: string | null;
  taxRate?: number;
  items: CreateQuotationItemRequest[];
};

export type UpdateQuotationRequest = {
  validUntil?: string | null;
  taxRate?: number;
  items?: CreateQuotationItemRequest[];
};

export type QuotationListResponse = {
  quotations: Quotation[];
  total: number;
};

// ── Phase 4: Projects ────────────────────────────────────────────

export const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const milestoneStatuses = ['pending', 'in_progress', 'completed'] as const;

export type MilestoneStatus = (typeof milestoneStatuses)[number];

export type ProjectMilestone = {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null;
  status: MilestoneStatus;
  completedAt: string | null;
  createdAt: string;
};

export type ProjectAssignment = {
  id: string;
  projectId: string;
  userId: string;
  userName: string | null;
  roleOnProject: string;
  createdAt: string;
};

export type Project = {
  id: string;
  leadId: string | null;
  quotationId: string | null;
  name: string;
  clientName: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  spent: number;
  address: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  milestones: ProjectMilestone[];
  assignments: ProjectAssignment[];
};

export type ProjectListQuery = {
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
};

export type ProjectListResponse = {
  projects: Project[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateProjectRequest = {
  name: string;
  clientName: string;
  leadId?: string | null;
  quotationId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number;
  address?: string | null;
};

export type UpdateProjectRequest = Partial<CreateProjectRequest> & {
  status?: ProjectStatus;
  progress?: number;
};

export type CreateMilestoneRequest = {
  title: string;
  dueDate?: string | null;
};

export type UpdateMilestoneRequest = {
  title?: string;
  dueDate?: string | null;
  status?: MilestoneStatus;
};

export type CreateAssignmentRequest = {
  userId: string;
  roleOnProject: string;
};

export type ProjectActivity = {
  id: string;
  userName: string | null;
  action: string;
  entityType: 'project';
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// ── Phase 5: Employees ────────────────────────────────────────────

export const employmentStatuses = ['active', 'inactive', 'terminated'] as const;

export type EmploymentStatus = (typeof employmentStatuses)[number];

export type Employee = {
  id: string;
  userId: string | null;
  name: string;
  cnic: string | null;
  phone: string | null;
  email: string | null;
  jobTitle: string;
  /** Only returned for owner / admin / accountant roles */
  dailyWage: number | null;
  /** Only returned for owner / admin / accountant roles */
  monthlySalary: number | null;
  status: EmploymentStatus;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeRequest = {
  name: string;
  jobTitle: string;
  userId?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  hireDate?: string | null;
  notes?: string | null;
};

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest> & {
  status?: EmploymentStatus;
};

export type EmployeeListQuery = {
  status?: EmploymentStatus;
  page?: number;
  pageSize?: number;
};

export type EmployeeListResponse = {
  employees: Employee[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// ── Phase 6: Expenses ────────────────────────────────────────────

export const expenseCategories = [
  'materials', 'labor', 'transport', 'equipment', 'overhead', 'other'
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseStatuses = ['pending', 'approved', 'rejected'] as const;

export type ExpenseStatus = (typeof expenseStatuses)[number];

export type Expense = {
  id: string;
  projectId: string | null;
  projectName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  submittedBy: string | null;
  submitterName: string | null;
  approvedBy: string | null;
  approverName: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  status: ExpenseStatus;
  receiptNote: string | null;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseRequest = {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  projectId?: string | null;
  employeeId?: string | null;
  receiptNote?: string | null;
};

export type UpdateExpenseRequest = Partial<CreateExpenseRequest>;

export type ApproveExpenseRequest = {
  note?: string | null;
};

export type RejectExpenseRequest = {
  rejectionNote: string;
};

export type ExpenseListQuery = {
  projectId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  page?: number;
  pageSize?: number;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalAmount: number;
};
