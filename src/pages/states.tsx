import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>Something went wrong.</strong>
        <div>{message}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {children}
    </div>
  );
}
