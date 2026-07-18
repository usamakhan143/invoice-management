import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Toast, type ToastVariant } from "./Toast";

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DISMISS_MS = 5000;

export interface ToastInput {
  message: React.ReactNode;
  variant?: ToastVariant;
  action?: React.ReactNode;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  maxVisible?: number;
  defaultDurationMs?: number;
}

export function ToastProvider({
  children,
  maxVisible = MAX_VISIBLE_TOASTS,
  defaultDurationMs = DEFAULT_DISMISS_MS,
}: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      pausedRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (record: ToastRecord) => {
      clearTimer(record.id);
      const duration = record.durationMs ?? defaultDurationMs;
      if (duration <= 0) return;

      const timer = setTimeout(() => {
        if (!pausedRef.current.has(record.id)) {
          dismiss(record.id);
        }
      }, duration);
      timersRef.current.set(record.id, timer);
    },
    [clearTimer, defaultDurationMs, dismiss],
  );

  const toast = useCallback(
    (input: ToastInput): string => {
      const record: ToastRecord = {
        id: createToastId(),
        ...input,
      };

      setToasts((current) => {
        const next = [...current, record];
        while (next.length > maxVisible) {
          const removed = next.shift();
          if (removed) {
            clearTimer(removed.id);
            pausedRef.current.delete(removed.id);
          }
        }
        return next;
      });

      scheduleDismiss(record);
      return record.id;
    },
    [clearTimer, maxVisible, scheduleDismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const pause = useCallback(
    (id: string) => {
      pausedRef.current.add(id);
      clearTimer(id);
    },
    [clearTimer],
  );

  const resume = useCallback(
    (id: string) => {
      pausedRef.current.delete(id);
      const record = toasts.find((item) => item.id === id);
      if (record) {
        scheduleDismiss(record);
      }
    },
    [scheduleDismiss, toasts],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-[var(--space-stack-sm)] p-[var(--space-stack-md)] sm:items-end"
            aria-live="polite"
          >
            {toasts.map((record) => (
              <Toast
                key={record.id}
                id={record.id}
                message={record.message}
                variant={record.variant}
                action={record.action}
                onDismiss={dismiss}
                onMouseEnter={() => pause(record.id)}
                onMouseLeave={() => resume(record.id)}
                onFocus={() => pause(record.id)}
                onBlur={() => resume(record.id)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
