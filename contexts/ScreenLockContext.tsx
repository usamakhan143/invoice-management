import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  screenLockLocalStorageKey,
  screenPinSessionStorageKey,
  verifyScreenPin,
} from "../utils/screenPin";

type ScreenLockContextValue = {
  isScreenLocked: boolean;
  lockScreen: () => void;
  openRevenuePinModal: () => void;
  isRevenueGateOpen: boolean;
  hasScreenPin: boolean;
  submitPin: (pin: string) => Promise<boolean>;
  closeRevenueModal: () => void;
  revenuePinModalOpen: boolean;
  pinError: string | null;
  clearPinError: () => void;
};

const ScreenLockContext = createContext<ScreenLockContextValue | null>(null);

export function ScreenLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const uid = user?.uid ?? "";
  const hasScreenPin = !!(
    userProfile?.screenPinHash && userProfile.screenPinHash.length > 0
  );

  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [revenuePinModalOpen, setRevenuePinModalOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [gateTick, setGateTick] = useState(0);

  const bumpGate = useCallback(() => setGateTick((t) => t + 1), []);

  const isRevenueGateOpen = useMemo(() => {
    if (!uid) return true;
    return sessionStorage.getItem(screenPinSessionStorageKey(uid)) === "1";
  }, [uid, gateTick]);

  const setGateOpen = useCallback(() => {
    if (!uid) return;
    sessionStorage.setItem(screenPinSessionStorageKey(uid), "1");
    bumpGate();
  }, [uid, bumpGate]);

  const clearGate = useCallback(() => {
    if (!uid) return;
    sessionStorage.removeItem(screenPinSessionStorageKey(uid));
    bumpGate();
  }, [uid, bumpGate]);

  const lockScreen = useCallback(() => {
    if (!hasScreenPin || !uid) return;
    clearGate();
    try {
      localStorage.setItem(screenLockLocalStorageKey(uid), "1");
    } catch {
      /* private mode / quota */
    }
    setIsScreenLocked(true);
    setPinError(null);
  }, [hasScreenPin, clearGate, uid]);

  const openRevenuePinModal = useCallback(() => {
    if (!hasScreenPin) return;
    setPinError(null);
    setRevenuePinModalOpen(true);
  }, [hasScreenPin]);

  const closeRevenueModal = useCallback(() => {
    setRevenuePinModalOpen(false);
    setPinError(null);
  }, []);

  const submitPin = useCallback(
    async (pin: string) => {
      if (!user || !userProfile?.screenPinHash) return false;
      const ok = await verifyScreenPin(user.uid, pin, userProfile.screenPinHash);
      if (!ok) {
        setPinError("Incorrect PIN");
        return false;
      }
      setPinError(null);
      setGateOpen();
      try {
        localStorage.removeItem(screenLockLocalStorageKey(user.uid));
      } catch {
        /* ignore */
      }
      setIsScreenLocked(false);
      setRevenuePinModalOpen(false);
      return true;
    },
    [user, userProfile, setGateOpen],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setIsScreenLocked(false);
      setRevenuePinModalOpen(false);
      setPinError(null);
      return;
    }

    const u = user.uid;

    if (!userProfile) {
      return;
    }

    if (!hasScreenPin) {
      try {
        localStorage.removeItem(screenLockLocalStorageKey(u));
      } catch {
        /* ignore */
      }
      setIsScreenLocked(false);
      setRevenuePinModalOpen(false);
      setPinError(null);
      return;
    }

    try {
      setIsScreenLocked(
        localStorage.getItem(screenLockLocalStorageKey(u)) === "1",
      );
    } catch {
      setIsScreenLocked(false);
    }
    setRevenuePinModalOpen(false);
    setPinError(null);
  }, [authLoading, user, userProfile, hasScreenPin]);

  useEffect(() => {
    if (!uid) return;
    const key = screenLockLocalStorageKey(uid);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      setIsScreenLocked(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [uid]);

  const value = useMemo(
    () => ({
      isScreenLocked,
      lockScreen,
      openRevenuePinModal,
      isRevenueGateOpen,
      hasScreenPin,
      submitPin,
      closeRevenueModal,
      revenuePinModalOpen,
      pinError,
      clearPinError: () => setPinError(null),
    }),
    [
      isScreenLocked,
      lockScreen,
      openRevenuePinModal,
      isRevenueGateOpen,
      hasScreenPin,
      submitPin,
      closeRevenueModal,
      revenuePinModalOpen,
      pinError,
    ],
  );

  return (
    <ScreenLockContext.Provider value={value}>
      {children}
      <ScreenPinOverlay />
    </ScreenLockContext.Provider>
  );
}

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function ScreenPinOverlay() {
  const {
    isScreenLocked,
    revenuePinModalOpen,
    submitPin,
    closeRevenueModal,
    pinError,
    clearPinError,
  } = useScreenLock();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const showOverlay = isScreenLocked || revenuePinModalOpen;

  useEffect(() => {
    if (!showOverlay) {
      setPin("");
      setShakeCount(0);
      return;
    }
    setShakeCount(0);
  }, [showOverlay]);

  useEffect(() => {
    if (!showOverlay || pin.length !== 4) return;
    let active = true;
    setBusy(true);
    void (async () => {
      try {
        const snapshot = pin;
        const ok = await submitPin(snapshot);
        if (!active) return;
        if (!ok) {
          setShakeCount((c) => c + 1);
          setPin("");
        }
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pin, showOverlay, submitPin]);

  useEffect(() => {
    if (!showOverlay || shakeCount === 0) return;
    pinInputRef.current?.focus();
  }, [shakeCount, showOverlay]);

  if (!showOverlay) return null;

  const isFullBleed = isScreenLocked;
  const inputError = !!pinError;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 ${
        isFullBleed
          ? "bg-slate-950/[0.88] backdrop-blur-md"
          : "bg-slate-950/50 backdrop-blur-sm"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-pin-title"
      aria-describedby="screen-pin-desc"
      onClick={() => {
        if (!isFullBleed) closeRevenueModal();
      }}
    >
      <div
        className="relative w-full max-w-[380px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-primary-400/35 via-slate-200/80 to-primary-600/25 opacity-90 blur-[0.5px] dark:from-primary-500/25 dark:via-slate-600/50 dark:to-primary-400/20" />
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:ring-white/10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 dark:via-white/20" />
          <div className="px-7 pb-7 pt-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/15 to-primary-600/10 text-primary-600 shadow-inner ring-1 ring-primary-500/20 dark:from-primary-400/20 dark:to-primary-600/10 dark:text-primary-400 dark:ring-primary-400/25">
              <LockGlyph className="h-7 w-7" />
            </div>
            <h2
              id="screen-pin-title"
              className="text-center text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {isFullBleed ? "Screen locked" : "Unlock revenue"}
            </h2>
            <p
              id="screen-pin-desc"
              className="mt-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {isFullBleed
                ? "Enter your 4-digit PIN. It is checked automatically when complete."
                : "Enter your 4-digit PIN to reveal amounts on the dashboard."}
            </p>

            <div className="mt-7 space-y-3">
              <div
                key={shakeCount}
                className={
                  shakeCount > 0
                    ? "screen-pin-shake rounded-2xl"
                    : "rounded-2xl"
                }
              >
                <label htmlFor="screen-pin-input" className="sr-only">
                  Four digit PIN
                </label>
                <input
                  ref={pinInputRef}
                  id="screen-pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  disabled={busy}
                  className={`block w-full rounded-2xl border-2 px-4 py-3.5 text-center text-2xl font-semibold tabular-nums tracking-[0.55em] text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-300 focus:outline-none focus:ring-4 disabled:opacity-60 dark:text-white dark:placeholder:text-slate-600 ${
                    inputError
                      ? "border-red-400 bg-red-50/90 ring-red-200/80 focus:border-red-500 focus:ring-red-500/25 dark:border-red-500/60 dark:bg-red-950/40 dark:ring-red-900/50 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                      : "border-slate-200/90 bg-slate-50/80 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800/80 dark:focus:border-primary-400 dark:focus:ring-primary-400/25"
                  }`}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    clearPinError();
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  }}
                  autoFocus
                  aria-invalid={inputError}
                  aria-describedby={
                    inputError ? "screen-pin-err" : undefined
                  }
                />
              </div>
              {inputError ? (
                <p
                  id="screen-pin-err"
                  className="text-center text-sm font-medium text-red-600 dark:text-red-400"
                  role="alert"
                >
                  Incorrect PIN. Try again.
                </p>
              ) : busy ? (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  Verifying…
                </p>
              ) : null}
            </div>

            {!isFullBleed ? (
              <div className="mt-6 flex justify-center border-t border-slate-100 pt-5 dark:border-gray-700/80">
                <button
                  type="button"
                  onClick={closeRevenueModal}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useScreenLock(): ScreenLockContextValue {
  const ctx = useContext(ScreenLockContext);
  if (!ctx) {
    throw new Error("useScreenLock must be used within ScreenLockProvider");
  }
  return ctx;
}
