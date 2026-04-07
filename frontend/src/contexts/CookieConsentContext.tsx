import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'hh_cookie_consent';

interface CookieConsentContextValue {
  hasAcknowledgedConsent: boolean;
  acknowledgeConsent: () => void;
}
const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

function readInitial() {
  return typeof window !== 'undefined' &&
    window.localStorage.getItem(STORAGE_KEY) === 'accepted';
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ack, setAck] = useState(readInitial);
  const value = useMemo(() => ({
    hasAcknowledgedConsent: ack,
    acknowledgeConsent() {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
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
