import type {
  CreateInvoiceItemRequest,
  Invoice,
  InvoiceListQuery,
  InvoiceStatus,
} from '@construction-crm/shared-types';

export type InvoiceListStoreQuery = Required<Pick<InvoiceListQuery, 'page' | 'pageSize'>> &
  Omit<InvoiceListQuery, 'page' | 'pageSize'>;

export type CreateInvoiceInput = {
  projectId: string;
  projectName: string | null;
  clientName: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  dueDate?: string | null;
  paidDate?: string | null;
  items: CreateInvoiceItemRequest[];
};

export interface InvoiceStore {
  list(query: InvoiceListStoreQuery): Promise<{ invoices: Invoice[]; total: number; outstandingTotal: number }>;
  findById(id: string): Promise<Invoice | null>;
  create(input: CreateInvoiceInput): Promise<Invoice>;
  setStatus(id: string, status: InvoiceStatus): Promise<Invoice | null>;
  recordPayment(id: string, amountPaid: number, paidDate: string | null): Promise<Invoice | null>;
  markEmailed(id: string, sentAt: string): Promise<Invoice | null>;
  markReminderSent(id: string, sentAt: string): Promise<Invoice | null>;
  listReminderCandidates(referenceDate: Date): Promise<Invoice[]>;
  count(): Promise<number>;
  syncOverdue(referenceDate?: Date): Promise<void>;
}
