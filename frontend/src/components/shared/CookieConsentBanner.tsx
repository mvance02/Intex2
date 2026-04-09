import { useCookieConsent } from '../../contexts/CookieConsentContext';

export default function CookieConsentBanner() {
  const { hasAcknowledgedConsent, acknowledgeConsent, declineConsent } = useCookieConsent();

  if (hasAcknowledgedConsent) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-600 flex-1">
          We use cookies to keep you signed in and improve your experience. See our{' '}
          <a href="/privacy" className="underline text-blue-700 hover:text-blue-800">
            Privacy Policy
          </a>
          .
        </p>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={declineConsent}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={acknowledgeConsent}
            className="px-4 py-2 text-sm bg-blue-700 text-white font-medium hover:bg-blue-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
