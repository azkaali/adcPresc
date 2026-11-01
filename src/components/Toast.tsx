import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);

  const show = useCallback<ShowToast>((message, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
