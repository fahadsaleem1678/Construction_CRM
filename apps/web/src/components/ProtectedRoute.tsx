import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '../lib/sessionStore';
import { Layout } from './Layout';

export function ProtectedRoute() {
  const { user, loading } = useSessionStore();

  if (loading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-sc-base p-6 text-sm text-sc-muted">Loading your workspace...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Layout><Outlet /></Layout>;
}
