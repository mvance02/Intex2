import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import hopeHavenLogo from '../../assets/HopeHavenLogo2.jpg';

const API = '';
import {
  DEFAULT_PORTAL_SUPPORTER_TYPE,
  PORTAL_SUPPORTER_TYPES,
  type PortalSupporterType,
  isPortalSupporterType,
} from '../../utils/supporterPortal';
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

type GiftFrequency = 'once' | 'weekly' | 'monthly' | 'yearly';

function frequencyToPayload(frequency: GiftFrequency): {
  isRecurring: boolean;
  recurringFrequency: string | null;
} {
  switch (frequency) {
    case 'once':
      return { isRecurring: false, recurringFrequency: null };
    case 'weekly':
      return { isRecurring: true, recurringFrequency: 'Weekly' };
    case 'monthly':
      return { isRecurring: true, recurringFrequency: 'Monthly' };
    case 'yearly':
      return { isRecurring: true, recurringFrequency: 'Yearly' };
    default:
      return { isRecurring: false, recurringFrequency: null };
  }
}

function recurringThankYouPhrase(isRecurring: boolean, recurringFrequency: string | null): string {
  if (!isRecurring) return '';
  const f = (recurringFrequency || 'Weekly').toLowerCase();
  if (f === 'monthly') return ' monthly recurring';
  if (f === 'yearly') return ' yearly recurring';
  return ' weekly recurring';
}

function generateDonationReceipt(label: string, phpAmount: number, isRecurring: boolean, recurringFrequency: string | null) {
  const doc = new jsPDF();
  const usd = phpToUsd(phpAmount);
  const receiptNo = `HH-${Date.now().toString(36).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 38, 'F');

  // Logo
  try {
    const img = new Image();
    img.src = hopeHavenLogo;
    doc.addImage(img, 'JPEG', 14, 6, 26, 26);
  } catch { /* logo optional */ }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DONATION RECEIPT', 46, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Hope Haven Philippines  |  hopehaven.org', 46, 26);
  doc.text('Protecting and rehabilitating survivors of abuse', 46, 31);

  // Receipt details
  doc.setTextColor(0, 0, 0);
  let y = 50;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Receipt #:', 140, y);
  doc.text('Date:', 140, y + 6);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(receiptNo, 165, y);
  doc.text(today, 165, y + 6);

  // Donor info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Donor Information', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Thank you for your generous contribution to Hope Haven.', 14, y);
  y += 12;

  // Donation details table
  const freq = isRecurring && recurringFrequency ? recurringFrequency : 'One-time';
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Type', 'Amount (PHP)', 'Amount (USD)']],
    body: [[label, freq, `PHP ${phpAmount.toLocaleString()}`, `USD ${usd.toFixed(2)}`]],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Total row
  doc.setFillColor(240, 253, 244);
  doc.rect(14, y, 182, 12, 'F');
  doc.setDrawColor(200);
  doc.rect(14, y, 182, 12, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Total:', 120, y + 8);
  doc.text(`PHP ${phpAmount.toLocaleString()}  (USD ${usd.toFixed(2)})`, 145, y + 8);

  y += 24;

  // Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('This receipt confirms your donation to Hope Haven Philippines.', 14, y);
  y += 4;
  doc.text('Hope Haven is a registered nonprofit organization dedicated to protecting and rehabilitating', 14, y);
  y += 4;
  doc.text('child survivors of abuse in the Philippines. Please retain this receipt for your records.', 14, y);

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 270, 210, 27, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for supporting Hope Haven!', 105, 280, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('This is a demonstration receipt. In production, this would serve as official documentation of your gift.', 105, 286, { align: 'center' });

  doc.save(`HopeHaven_Receipt_${receiptNo}.pdf`);
}

interface ThankYouModalProps {
  isRecurring: boolean;
  recurringFrequency: string | null;
  label: string;
  phpAmount: number;
  onClose: () => void;
}

function ThankYouModal({ isRecurring, recurringFrequency, label, phpAmount, onClose }: ThankYouModalProps) {
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
          Your{recurringThankYouPhrase(isRecurring, recurringFrequency)} gift of{' '}
          <span className="font-semibold text-teal-700">
            {formatUsd(usd)} (≈ {formatPhp(phpAmount)})
          </span>{' '}
          for <span className="font-semibold">{label}</span> has been recorded.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          This is a demonstration — no real payment was processed. In production, your gift would
          go directly to the girls at Hope Haven.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => generateDonationReceipt(label, phpAmount, isRecurring, recurringFrequency)}
            className="w-full py-3 bg-slate-800 text-white font-semibold rounded-full hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight size={16} className="rotate-90" />
            Download Receipt
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecurringPromptProps {
  item: QuickGiveItem;
  onChoose: (frequency: GiftFrequency) => void;
  onCancel: () => void;
}

interface PendingDonation {
  label: string;
  phpAmount: number;
  isRecurring: boolean;
  recurringFrequency: string | null;
  payload: {
    amount: number;
    currencyCode: string;
    isRecurring: boolean;
    recurringFrequency: string | null;
    donationType: string;
    campaignName: string;
    impactUnit?: string;
    supporterType: PortalSupporterType;
  };
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
          How often would you like to give?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onChoose('once')}
            className="flex items-center justify-center gap-2 w-full py-3 border border-teal-600 text-teal-700 font-semibold rounded-full hover:bg-teal-50 transition-colors"
          >
            <Heart size={16} aria-hidden="true" />
            One-time gift
          </button>
          <button
            type="button"
            onClick={() => onChoose('weekly')}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Weekly
          </button>
          <button
            type="button"
            onClick={() => onChoose('monthly')}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onChoose('yearly')}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Yearly
          </button>
        </div>
      </div>
    </div>
  );
}

function DonorWallPrompt({
  pending,
  onCancel,
  onSubmit,
  submitting = false,
}: {
  pending: PendingDonation;
  onCancel: () => void;
  onSubmit: (shareOnDonorWall: boolean, donorWallName: string) => void;
  submitting?: boolean;
}) {
  const [shareOnWall, setShareOnWall] = useState(false);
  const [wallName, setWallName] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Donor wall preference prompt"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cancel"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-800">Wall of Donors</h2>
        <p className="text-sm text-gray-600 mt-2">
          Your donation to <span className="font-semibold">{pending.label}</span> was prepared.
          Would you like to appear on the public donor wall?
        </p>

        <div className="mt-5 space-y-2">
          <button
            onClick={() => setShareOnWall(false)}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
              !shareOnWall ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Donate anonymously
          </button>
          <button
            onClick={() => setShareOnWall(true)}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
              shareOnWall ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Add me to the donor wall
          </button>
        </div>

        {shareOnWall && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="donorWallName">
              Name to display
            </label>
            <input
              id="donorWallName"
              type="text"
              maxLength={120}
              value={wallName}
              onChange={(e) => setWallName(e.target.value)}
              placeholder="Enter the name you want shown"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        <button
          onClick={() => onSubmit(shareOnWall, wallName)}
          disabled={submitting}
          className="mt-6 w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Confirm Donation'}
        </button>
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
  | { type: 'wall-prompt'; pending: PendingDonation }
  | {
      type: 'thank-you';
      label: string;
      phpAmount: number;
      isRecurring: boolean;
      recurringFrequency: string | null;
    };

export default function DonatePage() {
  // Custom amount state
  const [customMode, setCustomMode] = useState<'php' | 'usd'>('usd');
  const [customRaw, setCustomRaw] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [donationError, setDonationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [supporterType, setSupporterType] = useState<PortalSupporterType>(DEFAULT_PORTAL_SUPPORTER_TYPE);
  const [customGiftFrequency, setCustomGiftFrequency] = useState<'once' | 'monthly' | 'yearly'>('once');

  useEffect(() => { document.title = 'Donate — Hope Haven'; }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API}/api/my-donations`, { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const body: { supporter?: { supporterType?: string | null } | null } = await res.json();
        const t = body.supporter?.supporterType;
        if (!t) return;
        if (isPortalSupporterType(t)) setSupporterType(t);
        else if (t.toLowerCase() === 'individual') setSupporterType('MonetaryDonor');
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived custom amount values
  const customNumeric = parseFloat(customRaw) || 0;
  const customPhp =
    customMode === 'php' ? customNumeric : usdToPhp(customNumeric);
  const customUsd =
    customMode === 'usd' ? customNumeric : phpToUsd(customNumeric);
  const customImpact = customUsd > 0 ? getImpactMessage(customUsd) : null;

  async function submitDonation(
    pending: PendingDonation,
    shareOnDonorWall: boolean,
    donorWallName: string
  ) {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/my-donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...pending.payload,
          shareOnDonorWall,
          donorWallName: shareOnDonorWall ? donorWallName : undefined,
        }),
      });
      if (!res.ok) {
        setDonationError('Unable to process donation. Please try again.');
        setModal({ type: 'none' });
        setTimeout(() => {
          document.getElementById('donation-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      setDonationError('');
      setModal({
        type: 'thank-you',
        label: pending.label,
        phpAmount: pending.phpAmount,
        isRecurring: pending.isRecurring,
        recurringFrequency: pending.recurringFrequency,
      });
    } catch {
      setDonationError('Unable to reach the server. Please try again.');
      setModal({ type: 'none' });
      setTimeout(() => {
        document.getElementById('donation-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCustomDonate() {
    if (customPhp <= 0) return;
    const giftFreq: GiftFrequency =
      customGiftFrequency === 'once'
        ? 'once'
        : customGiftFrequency === 'monthly'
          ? 'monthly'
          : 'yearly';
    const { isRecurring, recurringFrequency } = frequencyToPayload(giftFreq);
    const label =
      giftFreq === 'once'
        ? 'Custom Donation'
        : giftFreq === 'monthly'
          ? 'Custom monthly donation'
          : 'Custom yearly donation';
    const campaignName =
      giftFreq === 'once' ? 'Custom Donation' : `Custom Donation (${recurringFrequency})`;

    setModal({
      type: 'wall-prompt',
      pending: {
        label,
        phpAmount: Math.round(customPhp),
        isRecurring,
        recurringFrequency,
        payload: {
          amount: Math.round(customPhp),
          currencyCode: 'PHP',
          isRecurring,
          recurringFrequency,
          donationType: 'Monetary',
          campaignName,
          impactUnit: customImpact || undefined,
          supporterType,
        },
      },
    });
  }

  function handleQuickGive(item: QuickGiveItem) {
    setModal({ type: 'recurring-prompt', item });
  }

  function handleRecurringChoice(frequency: GiftFrequency) {
    if (modal.type !== 'recurring-prompt') return;
    const item = modal.item;
    const { isRecurring, recurringFrequency } = frequencyToPayload(frequency);
    const recurTag =
      frequency === 'once' ? '' : ` (${recurringFrequency})`;
    setModal({
      type: 'wall-prompt',
      pending: {
        label: `${item.label}${recurTag}`,
        phpAmount: item.phpAmount,
        isRecurring,
        recurringFrequency,
        payload: {
          amount: item.phpAmount,
          currencyCode: 'PHP',
          isRecurring,
          recurringFrequency,
          donationType: 'Monetary',
          campaignName: isRecurring ? `${item.label} (${recurringFrequency})` : item.label,
          impactUnit: item.impactLine,
          supporterType,
        },
      },
    });
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
          recurringFrequency={modal.recurringFrequency}
          onClose={closeModal}
        />
      )}
      {modal.type === 'wall-prompt' && (
        <DonorWallPrompt
          pending={modal.pending}
          onCancel={closeModal}
          submitting={submitting}
          onSubmit={(shareOnDonorWall, donorWallName) => {
            void submitDonation(modal.pending, shareOnDonorWall, donorWallName);
          }}
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

            <div className="mb-5">
              <label htmlFor="portal-supporter-type" className="block text-sm font-medium text-gray-700 mb-1">
                How do you support Hope Haven?
              </label>
              <p className="text-xs text-gray-500 mb-2">
                We use the same categories as our historical supporter records (for example Volunteer, in-kind
                donor, or individual monetary gifts).
              </p>
              <select
                id="portal-supporter-type"
                value={supporterType}
                onChange={(e) =>
                  setSupporterType(
                    isPortalSupporterType(e.target.value) ? e.target.value : DEFAULT_PORTAL_SUPPORTER_TYPE
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                {PORTAL_SUPPORTER_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <span id="custom-gift-frequency-label" className="block text-sm font-medium text-gray-700 mb-1">
                Gift frequency
              </span>
              <p className="text-xs text-gray-500 mb-2">
                One-time gift, or the same custom amount billed each month or each year (demo — no real
                charges).
              </p>
              <div
                className="grid grid-cols-3 gap-2"
                role="group"
                aria-labelledby="custom-gift-frequency-label"
              >
                {(
                  [
                    { id: 'once' as const, label: 'One-time' },
                    { id: 'monthly' as const, label: 'Monthly' },
                    { id: 'yearly' as const, label: 'Yearly' },
                  ] as const
                ).map(({ id, label: freqLabel }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCustomGiftFrequency(id)}
                    className={`py-2.5 px-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors ${
                      customGiftFrequency === id
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {freqLabel}
                  </button>
                ))}
              </div>
            </div>

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
            <div id="donation-error" role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
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
