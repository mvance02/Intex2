import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'hh_cookie_consent';

interface CookieConsentContextValue {
  hasAcknowledgedConsent: boolean;
  acknowledgeConsent: () => void;
  declineConsent: () => void;
}
const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

function readInitial() {
  const val = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
  return val === 'accepted' || val === 'declined';
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ack, setAck] = useState(readInitial);
  const value = useMemo(() => ({
    hasAcknowledgedConsent: ack,
    acknowledgeConsent() {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
      setAck(true);
    },
    declineConsent() {
      window.localStorage.setItem(STORAGE_KEY, 'declined');
      setAck(true);
    },
  }), [ack]);
  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
}
export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within a CookieConsentProvider.');
  return ctx;
}
