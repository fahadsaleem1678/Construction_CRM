import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { LoginPage } from './pages/LoginPage';
import { QuotationsPage } from './pages/quotations/QuotationsPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { useSessionStore } from './lib/sessionStore';

export function App() {
  const bootstrap = useSessionStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
