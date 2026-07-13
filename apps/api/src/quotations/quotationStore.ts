import type {
  CreateQuotationRequest,
  Quotation,
  QuotationStatus,
  UpdateQuotationRequest
} from '@construction-crm/shared-types';

export interface QuotationStore {
  list(): Promise<{ quotations: Quotation[]; total: number }>;
  findById(id: string): Promise<Quotation | null>;
  create(input: CreateQuotationRequest & { quotationNumber: string; createdBy: string | null }): Promise<Quotation>;
  update(id: string, input: UpdateQuotationRequest): Promise<Quotation | null>;
  setStatus(id: string, status: QuotationStatus): Promise<Quotation | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}
