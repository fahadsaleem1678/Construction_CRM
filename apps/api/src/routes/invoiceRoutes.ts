import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import type { InvoiceService } from '../invoices/invoiceService.js';
import {
  generateInvoiceSchema,
  invoiceListQuerySchema,
  recordInvoicePaymentSchema,
  sendInvoiceSchema,
  updateInvoiceStatusSchema,
} from '../invoices/invoiceSchemas.js';

export function invoiceRoutes(invoices: InvoiceService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/', async (req, res, next) => {
    try {
      const query = invoiceListQuerySchema.parse(req.query);
      res.json(await invoices.list(query, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.post('/generate', async (req, res, next) => {
    try {
      const invoice = await invoices.createFromProject(generateInvoiceSchema.parse(req.body), req.user!);
      res.status(201).json({ invoice });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      res.json({ invoice: await invoices.get(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/document', async (req, res, next) => {
    try {
      res.type('html').send(await invoices.getDocument(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/pdf', async (req, res, next) => {
    try {
      const result = await invoices.getPdf(req.params.id, req.user!);
      res
        .type('application/pdf')
        .setHeader('Content-Disposition', `inline; filename="${result.filename}"`)
        .send(result.buffer);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/send', async (req, res, next) => {
    try {
      const result = await invoices.sendInvoice(req.params.id, sendInvoiceSchema.parse(req.body), req.user!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const invoice = await invoices.updateStatus(
        req.params.id,
        updateInvoiceStatusSchema.parse(req.body).status,
        req.user!,
      );
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/payment', async (req, res, next) => {
    try {
      const invoice = await invoices.recordPayment(
        req.params.id,
        recordInvoicePaymentSchema.parse(req.body),
        req.user!,
      );
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
