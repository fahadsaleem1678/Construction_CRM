import { FormEvent, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import backgroundImage from '../../../../Background.jpg';
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
    try { await acceptInvite({ token, password }); setDone(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to accept invite'); }
  }

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-sc-base p-5">
      <img src={backgroundImage} alt="Construction site" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-sc-base/85" />
      <section className="relative w-full max-w-md rounded-2xl border border-sc-border bg-sc-panel/95 p-6 shadow-sc-panel backdrop-blur sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-sc-amber/30 bg-sc-amber/10 text-sc-amber"><HardHat size={20} strokeWidth={1.8} aria-hidden="true" /></div>
          <div><h1 className="text-xl font-semibold tracking-tight text-sc-bright">Accept staff invite</h1><p className="mt-1 text-sm text-sc-muted">Activate your SiteCore account.</p></div>
        </div>
        <form onSubmit={submit} id="accept-invite-form" className="space-y-5">
          <TextField label="Invite token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your invite token" />
          <TextField label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          {error && <div className="rounded-xl border border-sc-red/35 bg-sc-red-m/40 px-4 py-3 text-sm text-red-200" role="alert">{error}</div>}
          <Button type="submit" className="w-full">Activate account</Button>
        </form>
      </section>
    </main>
  );
}
