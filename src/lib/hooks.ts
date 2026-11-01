import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

/**
 * Asks before leaving a page with unsaved changes (in-app navigation and closing the tab).
 * Returns a function to call right before navigating away after a successful save.
 */
export function useUnsavedChanges(dirty: boolean) {
  const bypass = useRef(false);
  const blocker = useBlocker(() => dirty && !bypass.current);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave this page and discard them?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return () => {
    bypass.current = true;
  };
}

/** Runs `save` on Ctrl+S / Cmd+S. */
export function useSaveShortcut(save: () => void) {
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Calls `fn` with `value` after it has stopped changing for `ms`. */
export function useDebouncedEffect<T>(value: T, ms: number, fn: (value: T) => void) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    const timer = setTimeout(() => latest.current(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
}
