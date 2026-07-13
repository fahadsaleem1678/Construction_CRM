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

export function createApp(
  store: UserStore = new PrismaUserStore(prisma),
  leadStore: LeadStore = new PrismaLeadStore(prisma),
  quotationStore: QuotationStore = new PrismaQuotationStore(prisma),
  projectStore: ProjectStore = new PrismaProjectStore(prisma),
) {
  const app = express();
  const auth = new AuthService(store);
  const leads = new LeadService(leadStore);
  const quotations = new QuotationService(quotationStore, leadStore);
  const projects = new ProjectService(projectStore, quotationStore, leadStore);
  const employees = new EmployeeService(new PrismaEmployeeStore(prisma));
  const expenses = new ExpenseService(new PrismaExpenseStore(prisma));

  app.use(helmet());
  app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
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
  app.use(errorHandler);

  return app;
}
