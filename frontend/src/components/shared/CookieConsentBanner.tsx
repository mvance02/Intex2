import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hh_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-600 flex-1">
          We use cookies to improve your experience. See our{' '}
          <a href="/privacy" className="underline text-teal-700 hover:text-teal-800">
            Privacy Policy
          </a>
          .
          {/* IS 414: Full GDPR consent management (analytics opt-in/out, cookie categories) */}
        </p>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
