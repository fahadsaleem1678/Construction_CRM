import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { AuthService } from './auth/authService.js';
import { PrismaUserStore } from './auth/prismaUserStore.js';
import { prisma } from './db/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { env } from './config/env.js';
import type { UserStore } from './auth/userStore.js';
import type { LeadStore } from './leads/leadStore.js';
import { PrismaLeadStore } from './leads/prismaLeadStore.js';
import { LeadService } from './leads/leadService.js';
import { leadRoutes } from './routes/leadRoutes.js';
import type { QuotationStore } from './quotations/quotationStore.js';
import { PrismaQuotationStore } from './quotations/prismaQuotationStore.js';
import { QuotationService } from './quotations/quotationService.js';
import { quotationRoutes } from './routes/quotationRoutes.js';
import type { ProjectStore } from './projects/projectStore.js';
import { PrismaProjectStore } from './projects/prismaProjectStore.js';
import { ProjectService } from './projects/projectService.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { PrismaEmployeeStore } from './employees/prismaEmployeeStore.js';
import { EmployeeService } from './employees/employeeService.js';
import { employeeRoutes } from './routes/employeeRoutes.js';
import { PrismaExpenseStore } from './expenses/prismaExpenseStore.js';
import { ExpenseService } from './expenses/expenseService.js';
import { expenseRoutes } from './routes/expenseRoutes.js';
import type { ExpenseStore } from './expenses/expenseStore.js';
import type { InvoiceStore } from './invoices/invoiceStore.js';
import type { InvoiceNotifier } from './invoices/invoiceNotifier.js';
import { PrismaInvoiceStore } from './invoices/prismaInvoiceStore.js';
import { InvoiceService } from './invoices/invoiceService.js';
import { ResendInvoiceNotifier } from './invoices/invoiceNotifier.js';
import { invoiceRoutes } from './routes/invoiceRoutes.js';
import type { EmployeeStore } from './employees/employeeStore.js';
import type { DocumentStore } from './documents/documentStore.js';
import type { DocumentStorage } from './documents/documentStorage.js';
import { PrismaDocumentStore } from './documents/prismaDocumentStore.js';
import { createDocumentStorage } from './documents/documentStorage.js';
import { DocumentService } from './documents/documentService.js';
import { documentRoutes } from './routes/documentRoutes.js';
import type { AnalyticsStore } from './analytics/analyticsStore.js';
import { ComposedAnalyticsStore } from './analytics/composedAnalyticsStore.js';
import { AnalyticsService } from './analytics/analyticsService.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js';
import { SearchService } from './search/searchService.js';
import { searchRoutes } from './routes/searchRoutes.js';

const allowedOrigins = new Set(env.APP_ORIGINS);

function resolveCorsOrigin(origin: string | undefined, callback: (error: Error | null, origin?: boolean) => void) {
  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin}`));
}

export function createApp(
  store: UserStore = new PrismaUserStore(prisma),
  leadStore: LeadStore = new PrismaLeadStore(prisma),
  quotationStore: QuotationStore = new PrismaQuotationStore(prisma),
  projectStore: ProjectStore = new PrismaProjectStore(prisma),
  expenseStore: ExpenseStore = new PrismaExpenseStore(prisma),
  invoiceStore: InvoiceStore = new PrismaInvoiceStore(prisma),
  invoiceNotifier: InvoiceNotifier = new ResendInvoiceNotifier(),
  employeeStore: EmployeeStore = new PrismaEmployeeStore(prisma),
  documentStore: DocumentStore = new PrismaDocumentStore(prisma as never),
  documentStorage: DocumentStorage = createDocumentStorage(),
  analyticsStore: AnalyticsStore = new ComposedAnalyticsStore(leadStore, projectStore, expenseStore, invoiceStore),
) {
  const app = express();
  const auth = new AuthService(store);
  const leads = new LeadService(leadStore);
  const quotations = new QuotationService(quotationStore, leadStore);
  const projects = new ProjectService(projectStore, quotationStore, leadStore);
  const employees = new EmployeeService(employeeStore);
  const expenses = new ExpenseService(expenseStore);
  const invoices = new InvoiceService(invoiceStore, projectStore, quotationStore, expenseStore, leadStore, invoiceNotifier);
  const documents = new DocumentService(
    documentStore,
    documentStorage,
    leadStore,
    projectStore,
    employeeStore,
    invoiceStore,
    env.DOCUMENT_MAX_FILE_SIZE_BYTES,
  );
  const analytics = new AnalyticsService(analyticsStore);
  const search = new SearchService(leadStore, projectStore, invoiceStore);

  app.use(helmet());
  app.use(cors({ origin: resolveCorsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ enabled: env.NODE_ENV !== 'test' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(auth, store));
  app.use('/api/leads', leadRoutes(leads, store));
  app.use('/api/quotations', quotationRoutes(quotations, store));
  app.use('/api/projects', projectRoutes(projects, store));
  app.use('/api/employees', employeeRoutes(employees, store));
  app.use('/api/expenses', expenseRoutes(expenses, store));
  app.use('/api/invoices', invoiceRoutes(invoices, store));
  app.use('/api/documents', documentRoutes(documents, store));
  app.use('/api/analytics', analyticsRoutes(analytics, store));
  app.use('/api/search', searchRoutes(search, store));
  app.use(errorHandler);

  return app;
}
