import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, HardHat } from 'lucide-react';
import backgroundImage from '../../../../Background.jpg';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useSessionStore } from '../lib/sessionStore';

export function LoginPage() {
  const { user, loginUser, error } = useSessionStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await loginUser(email, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] bg-sc-base text-sc-text lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative hidden overflow-hidden border-r border-sc-border-subtle lg:block">
        <img src={backgroundImage} alt="Construction work underway" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,17,18,0.96),rgba(16,17,18,0.62))]" />
        <div className="relative flex h-full max-w-xl flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-sc-amber/30 bg-sc-amber/10 text-sc-amber"><HardHat size={20} strokeWidth={1.8} aria-hidden="true" /></div>
            <div><p className="text-lg font-semibold tracking-tight text-sc-bright">SiteCore</p><p className="text-xs text-sc-muted">Construction CRM</p></div>
          </div>
          <div>
            <p className="text-sm font-medium text-sc-amber">Your project workspace</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold tracking-tight text-sc-bright xl:text-5xl">Keep every site moving forward.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-sc-sub">Coordinate leads, quotations, people, projects, and expenses from one secure workspace.</p>
          </div>
          <p className="text-sm text-sc-muted">Built for focused construction teams.</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-sc-amber/30 bg-sc-amber/10 text-sc-amber"><HardHat size={20} strokeWidth={1.8} aria-hidden="true" /></div>
            <div><p className="text-lg font-semibold tracking-tight text-sc-bright">SiteCore</p><p className="text-xs text-sc-muted">Construction CRM</p></div>
          </div>
          <div className="mb-7">
            <h2 className="text-2xl font-semibold tracking-tight text-sc-bright">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-sc-muted">Sign in to manage your construction operations.</p>
          </div>
          <form onSubmit={submit} id="auth-form" className="space-y-5">
            <TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            {error && <div className="rounded-xl border border-sc-red/35 bg-sc-red-m/40 px-4 py-3 text-sm text-red-200" role="alert">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Verifying...' : 'Sign in'} {!busy && <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
