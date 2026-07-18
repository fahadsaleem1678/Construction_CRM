import { AlertTriangle, Inbox } from 'lucide-react';

export function LoadingPanel({ label = 'Loading workspace data' }: { label?: string }) {
  return <div aria-live="polite" className="animate-pulse rounded-2xl border border-sc-border-subtle bg-sc-panel p-5"><div className="h-3 w-32 rounded bg-sc-surface-strong" /><div className="mt-5 h-4 w-3/4 rounded bg-sc-surface" /><div className="mt-3 h-4 w-1/2 rounded bg-sc-surface" /><span className="sr-only">{label}</span></div>;
}

export function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-sc-border bg-sc-panel px-6 py-12 text-center"><Inbox className="mx-auto text-sc-amber" size={24} strokeWidth={1.7} aria-hidden="true" /><h2 className="mt-4 text-base font-semibold text-sc-bright">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-sc-muted">{detail}</p></div>;
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-red-100"><div className="flex gap-3"><AlertTriangle className="shrink-0" size={19} aria-hidden="true" /><div><p className="font-semibold">Unable to load this view</p><p className="mt-1 text-sm text-red-100/80">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-200/25 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-100/10">Try again</button>}</div></div></div>;
}
