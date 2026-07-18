import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuotationsPage } from './QuotationsPage';
import { createQuotation, listLeads, listQuotations, setQuotationStatus } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  createQuotation: vi.fn(),
  listLeads: vi.fn(),
  listQuotations: vi.fn(),
  setQuotationStatus: vi.fn(),
}));

const mockLead = {
  id: '11111111-1111-4111-8111-111111111111',
  clientName: 'Riverside Villa Renovation',
  contactPhone: '+923001234567',
  contactEmail: 'riverside.client@example.com',
  source: 'phone',
  status: 'quoted',
  estimatedValue: 4850000,
  assignedTo: null,
  assignedUserName: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

describe('QuotationsPage', () => {
  beforeEach(() => {
    vi.mocked(listQuotations).mockResolvedValue({ quotations: [], total: 0 });
    vi.mocked(listLeads).mockResolvedValue({ leads: [mockLead], page: 1, pageSize: 100, total: 1, totalPages: 1 });
    vi.mocked(createQuotation).mockResolvedValue({
      quotation: {
        id: 'quote-1',
        leadId: mockLead.id,
        leadClientName: mockLead.clientName,
        quotationNumber: 'Q-0001',
        status: 'draft',
        subtotal: 1000,
        tax: 160,
        total: 1160,
        validUntil: null,
        createdBy: null,
        createdByName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
      },
    });
    vi.mocked(setQuotationStatus).mockResolvedValue({} as never);
  });

  it('preselects a lead from the quotation handoff URL and submits without a raw UUID field', async () => {
    render(
      <MemoryRouter initialEntries={[`/quotations?leadId=${mockLead.id}`]}>
        <Routes>
          <Route path="/quotations" element={<QuotationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const leadSelect = await screen.findByLabelText('Lead');
    expect(leadSelect).toHaveValue(mockLead.id);
    expect(screen.queryByLabelText('Lead ID')).not.toBeInTheDocument();

    fireEvent.submit(screen.getByRole('button', { name: /create quotation/i }).closest('form')!);

    await waitFor(() => {
      expect(createQuotation).toHaveBeenCalledWith({
        leadId: mockLead.id,
        validUntil: null,
        taxRate: 0.16,
        items: [{ description: 'Construction scope', unit: 'job', quantity: 1, unitPrice: 1000 }],
      });
    });
  });
});
