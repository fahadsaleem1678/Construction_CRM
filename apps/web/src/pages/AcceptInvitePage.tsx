import { FormEvent, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { acceptInvite } from '../lib/api';
import { useSessionStore } from '../lib/sessionStore';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const { user } = useSessionStore();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (user || done) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await acceptInvite({ token, password });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to accept invite');
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-sc-base p-6">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <polygon points="13,1 24,7 24,19 13,25 2,19 2,7" fill="#d97706" stroke="#f59e0b" strokeWidth="0.5" />
            <polygon points="13,6 20,10 20,16 13,20 6,16 6,10" fill="#0f0f0f" stroke="#d97706" strokeWidth="0.75" />
            <line x1="13" y1="10" x2="13" y2="16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="12" x2="16" y2="12" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold text-sc-bright tracking-tight">Accept staff invite</h1>
            <p className="text-xs text-sc-muted mt-0.5">Activate your SiteCore account.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} id="accept-invite-form" className="space-y-4">
          <TextField
            label="Invite token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your invite token"
          />
          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && (
            <div className="rounded-md border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-10 text-sm font-semibold mt-2">
            Activate account
          </Button>
        </form>
      </div>
    </main>
  );
}
