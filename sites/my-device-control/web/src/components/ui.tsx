'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';
import type { CommandStatus, DeviceStatus } from '@/lib/types';

/* ---------- Toast ---------- */
type Toast = { id: number; kind: 'ok' | 'err'; text: string };
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`card flex items-start gap-2 ${t.kind === 'err' ? 'border-red-300' : 'border-emerald-300'}`}>
            {t.kind === 'err' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />}
            <p className="text-sm">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Status badge ---------- */
const DEVICE_STYLE: Record<DeviceStatus, string> = {
  ONLINE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  OFFLINE: 'bg-slate-100 text-slate-700 border-slate-300',
  LOCKED: 'bg-amber-50 text-amber-900 border-amber-200',
  ENROLLMENT_PENDING: 'bg-sky-50 text-sky-900 border-sky-200',
  ERROR: 'bg-red-50 text-red-800 border-red-200',
};
export function DeviceBadge({ status }: { status: DeviceStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${DEVICE_STYLE[status] ?? DEVICE_STYLE.OFFLINE}`}>{status.replace('_', ' ')}</span>;
}
const CMD_STYLE: Record<CommandStatus, string> = {
  PENDING: 'bg-sky-50 text-sky-900 border-sky-200', SENT: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  ACKNOWLEDGED: 'bg-violet-50 text-violet-900 border-violet-200', EXECUTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  FAILED: 'bg-red-50 text-red-800 border-red-200', EXPIRED: 'bg-slate-100 text-slate-700 border-slate-300',
};
export function CommandBadge({ status }: { status: CommandStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${CMD_STYLE[status]}`}>{status}</span>;
}

/* ---------- State blocks ---------- */
export function Loading({ label = 'Memuatkan…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 p-10 text-sm text-mutedfg"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card flex items-start gap-3 border-red-200" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
      <div><p className="font-semibold">Ralat memuatkan data</p><p className="text-sm text-mutedfg">{message}</p></div>
    </div>
  );
}
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden />
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-md text-sm text-mutedfg">{hint}</p>}
      {action}
    </div>
  );
}
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{sub && <p className="text-sm text-mutedfg">{sub}</p>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* ---------- Dialog (pengesahan & borang) ---------- */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost !px-2" aria-label="Tutup" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function ConfirmDialog(p: {
  title: string; body: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean;
  requireText?: string; onConfirm: () => void; onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ok = !p.requireText || typed === p.requireText;
  return (
    <Dialog title={p.title} onClose={p.onClose}>
      <div className="text-sm text-slate-700">{p.body}</div>
      {p.requireText && (
        <label className="mt-3 block text-sm">Taip <b>{p.requireText}</b> untuk sahkan
          <input className="input mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={p.onClose}>Batal</button>
        <button className={p.danger ? 'btn-danger' : 'btn-primary'} disabled={!ok || p.busy} onClick={p.onConfirm}>
          {p.busy && <Loader2 className="h-4 w-4 animate-spin" />}{p.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function fmtTime(t?: { toMillis(): number } | null) {
  if (!t) return '—';
  return new Date(t.toMillis()).toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
}
export function ago(t?: { toMillis(): number } | null) {
  if (!t) return '—';
  const s = Math.max(0, (Date.now() - t.toMillis()) / 1000);
  if (s < 60) return 'baru sahaja';
  if (s < 3600) return `${Math.floor(s / 60)} min lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
