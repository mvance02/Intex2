import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? '';
import { Link } from 'react-router-dom';
import {
  Home,
  HeartPulse,
  GraduationCap,
  Users,
  ShieldCheck,
  Utensils,
  Shirt,
  Sparkles,
  BedDouble,
  Heart,
  X,
  RefreshCw,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHP_TO_USD = 56; // ₱56 = $1

const programs = [
  {
    icon: Home,
    color: 'bg-teal-50 text-teal-600',
    title: 'Safe Housing',
    description:
      'Every donation helps maintain safe, secure facilities for girls who have nowhere else to turn. Funds cover rent, utilities, maintenance, and security.',
    example: '$9 covers one day of safe housing for a resident.',
  },
  {
    icon: HeartPulse,
    color: 'bg-rose-50 text-rose-600',
    title: 'Trauma Counseling',
    description:
      'Licensed social workers and psychologists provide individual and group therapy sessions. Your support funds session costs, training, and clinical supervision.',
    example: '$21 funds one individual counseling session.',
  },
  {
    icon: GraduationCap,
    color: 'bg-blue-50 text-blue-600',
    title: 'Education & Skills',
    description:
      'We keep every girl enrolled in school and provide life-skills training to prepare them for independent living. Funds cover school fees, uniforms, and supplies.',
    example: '$62 covers one month of school expenses per girl.',
  },
  {
    icon: Utensils,
    color: 'bg-amber-50 text-amber-600',
    title: 'Nutrition & Health',
    description:
      'Three nutritious meals daily, regular medical and dental checkups, and medication when needed. Your gift ensures no girl goes hungry or untreated.',
    example: '$5 feeds a resident for one full day.',
  },
  {
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
    title: 'Family Reintegration',
    description:
      'Safely returning girls to loving families or transitioning them to independent living requires home visits, case conferences, and ongoing support.',
    example: '$36 funds one reintegration home visit.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-green-50 text-green-600',
    title: 'Staff & Operations',
    description:
      'Trained, compassionate staff are our greatest resource. Funds support salaries, professional development, and the administrative systems that keep everything running.',
    example: '$89 contributes one week of social worker salary.',
  },
];

const breakdowns = [
  { label: 'Direct Resident Care', pct: 72, color: 'bg-teal-500' },
  { label: 'Staff & Programs', pct: 18, color: 'bg-teal-300' },
  { label: 'Operations & Admin', pct: 7, color: 'bg-teal-200' },
  { label: 'Fundraising', pct: 3, color: 'bg-gray-200' },
];

interface QuickGiveItem {
  icon: React.ElementType;
  label: string;
  phpAmount: number;
  impactLine: string;
}

const quickGiveItems: QuickGiveItem[] = [
  {
    icon: Utensils,
    label: 'Donate a Meal',
    phpAmount: 250,
    impactLine: 'feeds one resident for a full day',
  },
  {
    icon: BedDouble,
    label: 'Donate Bedding',
    phpAmount: 800,
    impactLine: 'provides a complete bedding set for one girl',
  },
  {
    icon: Sparkles,
    label: 'Donate Hygiene Products',
    phpAmount: 400,
    impactLine: 'covers a month of hygiene essentials',
  },
  {
    icon: Shirt,
    label: 'Donate Clothing',
    phpAmount: 600,
    impactLine: 'outfits one resident for school or daily life',
  },
];

// Impact messaging keyed by USD threshold
const impactMessages: Array<{ minUsd: number; message: string }> = [
  { minUsd: 4, message: 'provides one nutritious meal for a resident' },
  { minUsd: 7, message: 'covers hygiene essentials for one month' },
  { minUsd: 11, message: 'outfits one girl for school or daily life' },
  { minUsd: 14, message: 'provides a complete bedding set' },
  { minUsd: 21, message: 'funds three days of nutritious meals' },
  { minUsd: 30, message: 'covers six days of nutritious meals for a resident' },
  { minUsd: 54, message: 'covers one day of full safe housing and care' },
  { minUsd: 62, message: 'funds one month of school expenses per girl' },
  { minUsd: 89, message: 'pays for one individual counseling session' },
  { minUsd: 178, message: 'funds a family reintegration home visit' },
];

function getImpactMessage(usd: number): string {
  let result = 'makes a real difference in a girl\'s life';
  for (const item of impactMessages) {
    if (usd >= item.minUsd) result = item.message;
    else break;
  }
  return result;
}

function phpToUsd(php: number): number {
  return Math.round((php / PHP_TO_USD) * 100) / 100;
}

function usdToPhp(usd: number): number {
  return Math.round(usd * PHP_TO_USD);
}

function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function formatPhp(php: number): string {
  return `₱${php.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ThankYouModalProps {
  isRecurring: boolean;
  label: string;
  phpAmount: number;
  onClose: () => void;
}

function ThankYouModal({ isRecurring, label, phpAmount, onClose }: ThankYouModalProps) {
  const usd = phpToUsd(phpAmount);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Donation confirmation"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="flex justify-center mb-4">
          <div className="bg-teal-50 rounded-full p-4">
            <CheckCircle size={40} className="text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
        <p className="text-gray-500 mb-4 leading-relaxed">
          Your{isRecurring ? ' weekly recurring' : ''} gift of{' '}
          <span className="font-semibold text-teal-700">
            {formatUsd(usd)} (≈ {formatPhp(phpAmount)})
          </span>{' '}
          for <span className="font-semibold">{label}</span> has been recorded.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          This is a demonstration — no real payment was processed. In production, your gift would
          go directly to the girls at Hope Haven.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

interface RecurringPromptProps {
  item: QuickGiveItem;
  onChoose: (recurring: boolean) => void;
  onCancel: () => void;
}

function RecurringPrompt({ item, onChoose, onCancel }: RecurringPromptProps) {
  const usd = phpToUsd(item.phpAmount);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Recurring donation prompt"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cancel"
        >
          <X size={20} />
        </button>
        <div className="flex justify-center mb-4">
          <div className="bg-amber-50 rounded-full p-3">
            <item.icon size={28} className="text-amber-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">{item.label}</h2>
        <p className="text-center text-gray-500 text-sm mb-5">
          {formatUsd(usd)}{' '}
          <span className="text-gray-400">(≈ {formatPhp(item.phpAmount)})</span> —{' '}
          {item.impactLine}.
        </p>
        <p className="text-sm font-medium text-gray-700 mb-4 text-center">
          Would you like to make this a weekly recurring gift?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onChoose(true)}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            <RefreshCw size={16} />
            Yes, give weekly
          </button>
          <button
            onClick={() => onChoose(false)}
            className="flex items-center justify-center gap-2 w-full py-3 border border-teal-600 text-teal-700 font-semibold rounded-full hover:bg-teal-50 transition-colors"
          >
            <Heart size={16} />
            One-time gift
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type ModalState =
  | { type: 'none' }
  | { type: 'recurring-prompt'; item: QuickGiveItem }
  | { type: 'thank-you'; label: string; phpAmount: number; isRecurring: boolean };

export default function DonatePage() {
  // Custom amount state
  const [customMode, setCustomMode] = useState<'php' | 'usd'>('usd');
  const [customRaw, setCustomRaw] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [donationError, setDonationError] = useState('');

  useEffect(() => { document.title = 'Donate — Hope Haven'; }, []);

  // Derived custom amount values
  const customNumeric = parseFloat(customRaw) || 0;
  const customPhp =
    customMode === 'php' ? customNumeric : usdToPhp(customNumeric);
  const customUsd =
    customMode === 'usd' ? customNumeric : phpToUsd(customNumeric);
  const customImpact = customUsd > 0 ? getImpactMessage(customUsd) : null;

  async function handleCustomDonate() {
    if (customPhp <= 0) return;
    try {
      const res = await fetch(`${API}/api/my-donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Math.round(customPhp),
          currencyCode: 'PHP',
          isRecurring: false,
          donationType: 'Monetary',
          campaignName: 'Custom Donation',
          impactUnit: customImpact || undefined,
        }),
      });
      if (!res.ok) {
        setDonationError('Unable to process donation. Please try again.');
        return;
      }
      setDonationError('');
      setModal({
        type: 'thank-you',
        label: 'Custom Donation',
        phpAmount: Math.round(customPhp),
        isRecurring: false,
      });
    } catch {
      setDonationError('Unable to reach the server. Please try again.');
    }
  }

  function handleQuickGive(item: QuickGiveItem) {
    setModal({ type: 'recurring-prompt', item });
  }

  async function handleRecurringChoice(recurring: boolean) {
    if (modal.type !== 'recurring-prompt') return;
    const item = modal.item;
    try {
      const res = await fetch(`${API}/api/my-donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: item.phpAmount,
          currencyCode: 'PHP',
          isRecurring: recurring,
          donationType: 'Monetary',
          campaignName: item.label,
          impactUnit: item.impactLine,
        }),
      });
      if (!res.ok) {
        setDonationError('Unable to process donation. Please try again.');
        setModal({ type: 'none' });
        return;
      }
      setDonationError('');
      setModal({
        type: 'thank-you',
        label: item.label,
        phpAmount: item.phpAmount,
        isRecurring: recurring,
      });
    } catch {
      setDonationError('Unable to reach the server. Please try again.');
      setModal({ type: 'none' });
    }
  }

  function closeModal() {
    setModal({ type: 'none' });
    setCustomRaw('');
  }

  return (
    <div className="flex flex-col">
      {/* Modals */}
      {modal.type === 'recurring-prompt' && (
        <RecurringPrompt
          item={modal.item}
          onChoose={handleRecurringChoice}
          onCancel={closeModal}
        />
      )}
      {modal.type === 'thank-you' && (
        <ThankYouModal
          label={modal.label}
          phpAmount={modal.phpAmount}
          isRecurring={modal.isRecurring}
          onClose={closeModal}
        />
      )}

      {/* Hero + Custom Donate CTA */}
      <section className="bg-teal-800 text-white py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-4">Give Hope Today</h1>
          <p className="text-teal-100 text-lg leading-relaxed mb-10">
            Every dollar transforms the life of a girl recovering from abuse or trafficking at
            Hope Haven's safehouses in the Philippines.
          </p>

          {/* Custom donation card */}
          <div className="bg-white text-gray-800 rounded-2xl shadow-lg p-7 text-left">
            <p className="text-sm font-semibold text-teal-700 uppercase tracking-wide mb-4">
              Custom Donation Amount
            </p>

            {/* Currency toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4 w-fit">
              <button
                onClick={() => setCustomMode('usd')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  customMode === 'usd'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCustomMode('php')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  customMode === 'php'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                PHP (₱)
              </button>
            </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  {customMode === 'usd' ? '$' : '₱'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={customRaw}
                  onChange={(e) => setCustomRaw(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-lg"
                  aria-label={`Donation amount in ${customMode === 'usd' ? 'US dollars' : 'Philippine pesos'}`}
                />
              </div>
              <button
                onClick={handleCustomDonate}
                disabled={customPhp <= 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Donate
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Live conversion + impact */}
            {customNumeric > 0 && (
              <div className="bg-teal-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>
                    {customMode === 'usd'
                      ? `${formatUsd(customUsd)} USD`
                      : `${formatPhp(customPhp)} PHP`}
                  </span>
                  <span className="font-medium text-teal-700">
                    {customMode === 'usd'
                      ? `≈ ${formatPhp(customPhp)} PHP`
                      : `≈ ${formatUsd(customUsd)} USD`}
                  </span>
                </div>
                {customImpact && (
                  <p className="text-teal-700 font-medium">
                    Your gift {customImpact}.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Exchange rate: ₱56 = $1 (approximate). This is a demonstration — no real payment is
              processed.
            </p>
          </div>

          {donationError && (
            <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
              {donationError}
            </div>
          )}
        </div>
      </section>

      {/* Quick-give buttons */}
      <section className="bg-gray-50 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Quick Give</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Select a specific need to meet — each one goes directly to a girl at Hope Haven.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickGiveItems.map((item) => {
              const usd = phpToUsd(item.phpAmount);
              return (
                <button
                  key={item.label}
                  onClick={() => handleQuickGive(item)}
                  className="group flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-200 transition-all"
                >
                  <div className="bg-teal-50 group-hover:bg-teal-100 rounded-full p-3 mb-3 transition-colors">
                    <item.icon size={24} className="text-teal-600" />
                  </div>
                  <p className="font-bold text-gray-800 mb-1">{item.label}</p>
                  <p className="text-teal-700 font-semibold text-sm mb-0.5">
                    {formatUsd(usd)}
                  </p>
                  <p className="text-gray-400 text-xs mb-3">≈ {formatPhp(item.phpAmount)}</p>
                  <p className="text-gray-500 text-xs leading-snug">{item.impactLine}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Currency converter / impact reference */}
      <section className="max-w-3xl mx-auto px-6 py-14 w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          What Your Gift Does
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8">
          Reference guide — see real impact at every giving level.
        </p>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {[
            { usd: 4.5, php: 252, impact: '1 nutritious meal for a resident' },
            { usd: 7, php: 392, impact: '1 month of hygiene essentials' },
            { usd: 11, php: 616, impact: 'Clothing for one girl' },
            { usd: 14, php: 784, impact: 'A complete bedding set' },
            { usd: 30, php: 1680, impact: '6 days of nutritious meals' },
            { usd: 54, php: 3024, impact: '1 week of school expenses per girl' },
            { usd: 89, php: 4984, impact: '1 individual counseling session' },
            { usd: 178, php: 9968, impact: 'A family reintegration home visit' },
          ].map(({ usd, php, impact }) => (
            <div
              key={impact}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-teal-700 w-14">${usd}</span>
                <span className="text-sm text-gray-400">≈ ₱{php.toLocaleString()}</span>
              </div>
              <span className="text-sm text-gray-600 text-right">{impact}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Based on approximate exchange rate ₱56 = $1.
        </p>
      </section>

      {/* Fund breakdown */}
      <section className="bg-gray-50 py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Fund Allocation</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            {breakdowns.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-1.5">
                  <span>{label}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Based on the most recent annual report. Hope Haven is committed to transparency —{' '}
            <Link to="/impact" className="underline hover:text-teal-600">
              view our impact dashboard
            </Link>{' '}
            for full details.
          </p>
        </div>
      </section>

      {/* Program areas */}
      <section className="py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-10 text-center">Our Program Areas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(({ icon: Icon, color, title, description, example }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div
                  className={`inline-flex p-2.5 rounded-xl mb-4 ${color}`}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{description}</p>
                <p className="text-xs font-medium text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                  {example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
