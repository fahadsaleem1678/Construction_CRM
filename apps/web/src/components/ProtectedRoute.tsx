import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '../lib/sessionStore';
import { Layout } from './Layout';

export function ProtectedRoute() {
  const { user, loading } = useSessionStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 font-mono text-[10px] text-muted tracking-widest uppercase">
        Loading operations environment...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
