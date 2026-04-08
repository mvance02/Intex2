import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, HeartPulse, GraduationCap, Utensils, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, displaySafehouseName } from '../../utils/api';
import type { DashboardMetrics, DonorWallEntry, PublicOkrMetric } from '../../types/models';
import { Link } from 'react-router-dom';
import { Home, HeartPulse, GraduationCap } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import type { DashboardMetrics } from '../../types/models';
import heroBg from '../../assets/lighthousepic1.webp';
import hopeHaven3 from '../../assets/hopeHaven3.jpg';
import hopeHaven4 from '../../assets/hopehaven4.jpg';
import missionImg from '../../assets/HopeHavenPhoto.jpg';
import missionImg2 from '../../assets/hopehavenphoto2.jpg';
import philippinesMapImg from '../../assets/phillipinesmap.jpg';
import ctaBg from '../../assets/lighthousepic3.jpg';
import mealImg from '../../assets/philipino meal.jpg';
import housingImg from '../../assets/House.png';
import counselingImg from '../../assets/CouncilHopeHaven.jpg';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useCountUp(end: number, duration = 2000): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end <= 0) return;
    let startTime: number | null = null;
    let rafId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration]);
  return count;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnimatedStatBadge({ value, label }: { value: number | null; label: string }) {
  const animated = useCountUp(value ?? 0);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-slate-900">
        {value === null ? '—' : animated.toLocaleString()}
      </span>
      <span className="text-sm text-sky-900">{label}</span>
    </div>
  );
}

function DonationStatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-slate-900">{value}</span>
      <span className="text-sm text-sky-900">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safehouse data
// ---------------------------------------------------------------------------

const SAFEHOUSES = [
  { name: 'Quezon City',       region: 'Luzon',    x: 51.5, y: 28.5 },
  { name: 'Angeles City',      region: 'Luzon',    x: 48.5, y: 26.2 },
  { name: 'Baguio City',       region: 'Luzon',    x: 49.0, y: 21.5 },
  { name: 'Iloilo City',       region: 'Visayas',  x: 42.0, y: 51.0 },
  { name: 'Cebu City',         region: 'Visayas',  x: 55.0, y: 50.5 },
  { name: 'Tacloban',          region: 'Visayas',  x: 62.5, y: 47.5 },
  { name: 'Cagayan de Oro',    region: 'Mindanao', x: 55.5, y: 61.0 },
  { name: 'Davao City',        region: 'Mindanao', x: 60.5, y: 70.5 },
  { name: 'General Santos',    region: 'Mindanao', x: 55.0, y: 77.0 },
] as const;

const REGION_COLOR: Record<string, string> = {
  Luzon:    '#2563eb',
  Visayas:  '#f59e0b',
  Mindanao: '#10b981',
};

// RGB triplets for box-shadow / rgba() usage (matches REGION_COLOR)
const REGION_GLOW: Record<string, string> = {
  Luzon:    '37, 99, 235',
  Visayas:  '245, 158, 11',
  Mindanao: '16, 185, 129',
};

const HERO_IMAGES = [heroBg, hopeHaven3, hopeHaven4];

// ---------------------------------------------------------------------------
// Philippines SVG map — interactive with hover tooltips and pulse animations
// ---------------------------------------------------------------------------

type SafehouseName = typeof SAFEHOUSES[number]['name'];

interface PhilippinesMapProps {
  hoveredCity: SafehouseName | null;
  onPinHover: (name: SafehouseName | null) => void;
}

function PhilippinesMap({ hoveredCity, onPinHover }: PhilippinesMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; region: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function handlePinEnter(safehouse: typeof SAFEHOUSES[number], svgX: number, svgY: number) {
    const display = displaySafehouseName(safehouse.name);
    onPinHover(safehouse.name);
    setTooltip({ name: display, region: safehouse.region, x: svgX, y: svgY });
  }

  function handlePinLeave() {
    onPinHover(null);
    setTooltip(null);
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className="w-full h-full"
      aria-label="Map of the Philippines showing safehouse locations"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Ocean gradient background */}
        <radialGradient id="oceanBg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </radialGradient>

        {/* Island fill gradient */}
        <linearGradient id="islandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.95" />
        </linearGradient>

        {/* Per-region glow filters */}
        {Object.entries(REGION_COLOR).map(([region, color]) => (
          <filter key={region} id={`glow-${region}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feFlood floodColor={color} floodOpacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}

        {/* Hover glow — stronger */}
        {Object.entries(REGION_COLOR).map(([region, color]) => (
          <filter key={`hover-${region}`} id={`hover-glow-${region}`} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feFlood floodColor={color} floodOpacity="1" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}

        <style>{`
          @keyframes mapPulse {
            0%   { r: 2.2; opacity: 0.5; }
            70%  { r: 4.5; opacity: 0;   }
            100% { r: 4.5; opacity: 0;   }
          }
          @keyframes mapPulse2 {
            0%   { r: 2.2; opacity: 0.3; }
            70%  { r: 5.5; opacity: 0;   }
            100% { r: 5.5; opacity: 0;   }
          }
          .pin-pulse-1 { animation: mapPulse  2.4s ease-out infinite; }
          .pin-pulse-2 { animation: mapPulse2 2.4s ease-out infinite 0.6s; }
          .pin-core    { transition: r 0.2s ease, filter 0.2s ease; }
          .pin-group   { cursor: pointer; }
        `}</style>
      </defs>

      {/* Ocean background rect */}
      <image
        href={philippinesMapImg}
        x="0"
        y="0"
        width="100"
        height="100"
        preserveAspectRatio="xMidYMid slice"
        opacity="0.72"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Safehouse pins */}
      {SAFEHOUSES.map((safehouse, i) => {
        const { name, region, x, y } = safehouse;
        const color = REGION_COLOR[region];
        const rgb = REGION_GLOW[region];
        const isActive = hoveredCity === name;
        const animDelay = `${(i * 0.3) % 1.8}s`;

        return (
          <g
            key={name}
            className="pin-group"
            onMouseEnter={() => handlePinEnter(safehouse, x, y)}
            onMouseLeave={handlePinLeave}
          >
            {/* Outer pulse ring 1 */}
            <circle
              cx={x}
              cy={y}
              r="1.6"
              fill={color}
              className="pin-pulse-1"
              opacity="0.22"
              style={{ animationDelay: animDelay }}
            />
            {/* Outer pulse ring 2 — staggered */}
            <circle
              cx={x}
              cy={y}
              r="1.6"
              fill={color}
              className="pin-pulse-2"
              opacity="0.15"
              style={{ animationDelay: animDelay }}
            />
            {/* Ambient glow halo */}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 3.5 : 2.0}
              fill={color}
              opacity={isActive ? 0.2 : 0.08}
              style={{
                transition: 'r 0.2s ease, opacity 0.2s ease',
                filter: `blur(${isActive ? 1 : 0.5}px)`,
              }}
            />
            {/* Core dot */}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 1.7 : 1.1}
              fill={color}
              stroke="white"
              strokeWidth={isActive ? 0.45 : 0.3}
              className="pin-core"
              filter={isActive ? `url(#hover-glow-${region})` : `url(#glow-${region})`}
              style={{
                boxShadow: isActive ? `0 0 8px rgba(${rgb}, 0.9)` : undefined,
              }}
            />
          </g>
        );
      })}

      {/* Tooltip rendered inside SVG via foreignObject for crisp text */}
      {tooltip && (() => {
        const tipX = tooltip.x > 60 ? tooltip.x - 22 : tooltip.x + 3;
        const tipY = tooltip.y > 75 ? tooltip.y - 9 : tooltip.y - 8;
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tipX}
              y={tipY}
              width="19"
              height="7.5"
              rx="1.2"
              fill="#f8fafc"
              fillOpacity="0.96"
              stroke={REGION_COLOR[tooltip.region]}
              strokeWidth="0.4"
            />
            <text
              x={tipX + 9.5}
              y={tipY + 3.2}
              textAnchor="middle"
              fontSize="1.9"
              fill="#0f172a"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {tooltip.name}
            </text>
            <text
              x={tipX + 9.5}
              y={tipY + 5.8}
              textAnchor="middle"
              fontSize="1.55"
              fill={REGION_COLOR[tooltip.region]}
              fontFamily="system-ui, sans-serif"
            >
              {tooltip.region}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DonatePromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <HeartPulse size={24} className="text-teal-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Support a Girl</h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Create an account or log in to make a donation and change a life today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 border border-teal-600 text-teal-600 font-semibold rounded-full hover:bg-teal-50 transition-colors text-sm text-center"
          >
            Log In
          </Link>
          <Link
            to="/register"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors text-sm text-center"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [okrMetric, setOkrMetric] = useState<PublicOkrMetric | null>(null);
  const [hoveredCity, setHoveredCity] = useState<SafehouseName | null>(null);
  const [showDonatePrompt, setShowDonatePrompt] = useState(false);
  const [donorWallPreview, setDonorWallPreview] = useState<DonorWallEntry[]>([]);

  function handleDonateClick() {
    if (isAuthenticated) {
      navigate('/donor/donate');
    } else {
      setShowDonatePrompt(true);
    }
  }
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    document.title = 'Hope Haven — Safe Homes for Survivors';
    Promise.all([
      apiFetch<DashboardMetrics>('/api/dashboard/metrics'),
      apiFetch<PublicOkrMetric>('/api/dashboard/public-okr'),
      apiFetch<DonorWallEntry[]>('/api/donations/wall'),
    ])
      .then(([metricsData, okrData, donorWallData]) => {
        setMetrics(metricsData);
        setOkrMetric(okrData);
        setDonorWallPreview(donorWallData.slice(0, 8));
      })
      .catch(() => null);
  }, []);

  const PHP_TO_USD = 56;
  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const ytdRaw = metrics ? Number(metrics.ytdDonations) : null;
  const ytdDisplay = ytdRaw !== null
    ? `$${Math.round(ytdRaw / PHP_TO_USD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '—';

  return (
    <div className="flex flex-col">
      {showDonatePrompt && <DonatePromptModal onClose={() => setShowDonatePrompt(false)} />}

      {/* ------------------------------------------------------------------ */}
      {/* Hero — background image + dark overlay                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {HERO_IMAGES.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              heroIndex === idx ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
            aria-hidden="true"
          />
        ))}
        <div
          className="relative z-10 max-w-6xl mx-auto w-full px-6 py-24 text-left text-white"
          style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)' }}
        >
          <p className="text-slate-100 text-xs font-semibold tracking-[0.16em] uppercase mb-4">
            Hope Haven Philippines
          </p>
          <h1 className="max-w-2xl text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-[0.02em] leading-tight mb-6">
            Safe Homes for Girls Who Deserve a Future
          </h1>
          <p className="text-lg text-white mb-10 max-w-xl leading-relaxed">
            We provide shelter, healing, and hope to girls who have experienced abuse and
            trafficking across the Philippines.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/impact"
              className="px-7 py-3 bg-white text-slate-900 font-semibold uppercase text-sm tracking-[0.1em] border border-white hover:bg-slate-100 transition-colors"
            >
              See Our Impact
            </Link>
            <button
              onClick={handleDonateClick}
              className="px-7 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            <Link
              to="/donate"
              className="px-7 py-3 border border-white/60 bg-white/10 text-white font-semibold uppercase text-sm tracking-[0.1em] hover:bg-white/20 transition-colors"
            >
              Support a Girl
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats bar — animated count-up                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-slate-100 py-10 px-6 border-y border-slate-200" aria-label="Key statistics">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <AnimatedStatBadge value={metrics?.activeResidents ?? null}  label="Girls in Our Care" />
          <AnimatedStatBadge value={metrics?.activeSafehouses ?? null} label="Active Safehouses" />
          <AnimatedStatBadge value={metrics?.totalSupporters ?? null}  label="Generous Supporters" />
          <DonationStatBadge value={ytdDisplay} label="Raised This Year" />
        </div>
      </section>

      <section className="bg-white py-10 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/60 to-white p-7 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-teal-700 text-center mb-2">
              Most Important Outcome Metric
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">
              {okrMetric?.metricName ?? '90-day Stable Reintegration Rate'}
            </h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch text-center">
              <div className="sm:col-span-1 rounded-xl bg-white border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Rate</p>
                <p className="text-4xl font-extrabold text-teal-700 mt-1">
                  {okrMetric ? `${okrMetric.ratePercent.toFixed(1)}%` : '—'}
                </p>
              </div>

              <div className="sm:col-span-2 rounded-xl bg-white border border-gray-100 p-4 flex flex-col justify-center">
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  {okrMetric
                    ? `${okrMetric.stableCount} of ${okrMetric.eligibleCount} girls were still safe and stable 90 days after leaving our care.`
                    : 'We track whether girls remain safe and stable 90 days after leaving our care.'}
                </p>

                {okrMetric && (
                  <p
                    className={`text-sm mt-2 font-semibold ${
                      okrMetric.deltaPoints >= 0 ? 'text-teal-700' : 'text-amber-700'
                    }`}
                  >
                    {okrMetric.deltaPoints >= 0 ? 'Up ' : 'Down '}
                    {Math.abs(okrMetric.deltaPoints).toFixed(1)} percentage points from the previous group
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
              “Safe and stable” means living in a safe placement 90 days after leaving shelter.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-teal-700 mb-1">
                Donor Recognition
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Wall of Donors</h2>
            </div>
            <Link
              to="/donor-wall"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-teal-200 text-teal-700 font-semibold hover:bg-teal-50 transition-colors"
            >
              View Full Wall
            </Link>
          </div>

          {donorWallPreview.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {donorWallPreview.map((entry) => (
                <div
                  key={`${entry.displayName}-${entry.latestDonationDate ?? 'n/a'}`}
                  className="rounded-xl bg-teal-50/60 border border-teal-100 px-4 py-3 text-center"
                >
                  <p className="font-semibold text-gray-800 truncate">{entry.displayName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Be the first to join our donor wall when you make a donation.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Donor Impact Translator                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-left mb-12">
            <h2 className="text-3xl font-extrabold uppercase tracking-[0.05em] text-slate-900 mb-3">Your Impact in Action</h2>
            <p className="text-slate-600 max-w-2xl">
              Every peso goes directly to the girls in our care. Here is what your gift provides.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                usdAmount: '$5',
                pesoAmount: '₱250',
                impact: '1 day of nutritious meals for a resident',
                bgImage: mealImg,
              },
              {
                usdAmount: '$10',
                pesoAmount: '₱500',
                impact: '1 day of safe housing and pastoral care',
                bgImage: housingImg,
              },
              {
                usdAmount: '$25',
                pesoAmount: '₱1,200',
                impact: '1 trauma counseling session with a licensed therapist',
                bgImage: counselingImg,
              },
              {
                usdAmount: '$70',
                pesoAmount: '₱3,500',
                impact: '1 full month of schooling and life-skills training',
                bgImage: missionImg2,
              },
            ].map(({ usdAmount, pesoAmount, impact, bgImage }) => (
              <div
                key={usdAmount}
                className="relative border border-slate-200 p-6 flex flex-col items-center text-center gap-4 min-h-[15rem] justify-end overflow-hidden"
                style={{
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                <div className="relative z-10">
                  <p className="text-2xl font-extrabold text-white leading-tight">{usdAmount}</p>
                  <p className="text-xs text-white/90 mt-1">{pesoAmount}</p>
                </div>
                <p className="relative z-10 text-sm leading-relaxed text-white/95">{impact}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/donate"
              className="inline-block px-8 py-3 bg-white text-sky-700 font-semibold uppercase text-sm tracking-[0.1em] border border-sky-300 hover:bg-sky-300 hover:text-slate-900 transition-colors"
            >
              Make a Donation
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Three Pillars — with mission image                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-slate-700 text-xs font-semibold tracking-[0.22em] uppercase mb-3">
              How We Help
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-[0.05em] text-slate-900 mb-4">Our Three Pillars</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Every girl who comes through our doors receives a comprehensive programme built on three
              foundations — Caring, Healing, and Teaching.
            </p>
            <ul className="space-y-6">
              {[
                {
                  Icon: Home,
                  colorClasses: 'bg-slate-200 text-slate-700',
                  title: 'Caring',
                  desc: 'Safe housing, nutritious meals, and daily pastoral care from trained staff.',
                },
                {
                  Icon: HeartPulse,
                  colorClasses: 'bg-slate-200 text-slate-700',
                  title: 'Healing',
                  desc: 'Trauma-informed counselling, health monitoring, and psychosocial support.',
                },
                {
                  Icon: GraduationCap,
                  colorClasses: 'bg-slate-200 text-slate-700',
                  title: 'Teaching',
                  desc: 'Education support, life-skills training, and a path toward reintegration.',
                },
              ].map(({ Icon, colorClasses, title, desc }) => (
                <li key={title} className="flex gap-4 items-start">
                  <div className={`p-2.5 shrink-0 ${colorClasses}`} aria-hidden="true">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 uppercase tracking-[0.06em] text-sm">{title}</p>
                    <p className="text-sm text-slate-600 mt-1">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <img
              src={missionImg}
              alt="Hope Haven residents and staff"
              className="object-cover w-full h-80 md:h-96 border border-slate-300 shadow-lg contrast-110 saturate-110"
            />
            <div className="absolute -bottom-5 -left-5 bg-slate-900 text-white px-6 py-4 shadow-xl hidden md:block border border-slate-700">
              <p className="text-2xl font-extrabold">9</p>
              <p className="text-xs text-slate-300 mt-0.5">Safehouses across<br />the Philippines</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Philippines Safehouse Map                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-slate-100 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-slate-600 text-xs font-semibold tracking-[0.16em] uppercase mb-3">
              Nationwide Presence
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-[0.05em] text-slate-900 mb-3">
              Our Safehouses Across the Philippines
            </h2>
            <p className="text-slate-600 max-w-lg mx-auto">
              From northern Luzon to southern Mindanao, Hope Haven maintains nine safe homes
              so that no girl is ever too far from help.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-10 items-center">
            {/* Map */}
            <div className="md:col-span-3 flex justify-center">
              <div
                className="w-[26rem] h-[34rem] relative overflow-visible"
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                }}
              >
                <PhilippinesMap hoveredCity={hoveredCity} onPinHover={setHoveredCity} />
              </div>
            </div>

            {/* Safehouse list */}
            <div className="md:col-span-2 space-y-4">
              {(['Luzon', 'Visayas', 'Mindanao'] as const).map((region) => (
                <div key={region}>
                  <p
                    className="text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: REGION_COLOR[region] }}
                  >
                    {region}
                  </p>
                  <ul className="space-y-1">
                    {SAFEHOUSES.filter((s) => s.region === region).map((s) => {
                      const isActive = hoveredCity === s.name;
                      return (
                        <li
                          key={s.name}
                          className="flex items-center gap-2.5 px-2 py-1 cursor-default transition-all duration-150"
                          style={{
                            backgroundColor: isActive ? `rgba(${REGION_GLOW[region]}, 0.12)` : 'transparent',
                          }}
                          onMouseEnter={() => setHoveredCity(s.name)}
                          onMouseLeave={() => setHoveredCity(null)}
                        >
                          <span
                            className="rounded-full shrink-0 transition-all duration-150"
                            style={{
                              width: isActive ? '10px' : '8px',
                              height: isActive ? '10px' : '8px',
                              backgroundColor: REGION_COLOR[region],
                              boxShadow: isActive
                                ? `0 0 8px rgba(${REGION_GLOW[region]}, 0.9)`
                                : 'none',
                            }}
                          />
                          <span
                            className="text-sm transition-colors duration-150"
                            style={{ color: isActive ? '#1e293b' : '#475569' }}
                          >
                            {displaySafehouseName(s.name)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-300">
                <Link
                  to="/impact"
                  className="text-slate-700 text-sm font-semibold uppercase tracking-[0.1em] hover:text-slate-900 transition-colors"
                >
                  View impact by region →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Anonymous Referral Banner                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-amber-50 border-y border-amber-100 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <p className="text-sm font-semibold text-amber-700 uppercase tracking-widest mb-1">
              Know someone who needs help?
            </p>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Submit an Anonymous Referral</h2>
            <p className="text-gray-500 text-sm max-w-lg">
              If you know a child or young woman who may need shelter, counseling, or protection,
              you can alert our social workers confidentially — no account required.
            </p>
          </div>
          <Link
            to="/referral"
            className="shrink-0 px-7 py-3 bg-amber-600 text-white font-semibold rounded-full hover:bg-amber-700 transition-colors"
          >
            Make a Referral
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA strip — lighthousepic3.jpg background                          */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative py-28 px-6 bg-cover bg-center"
        style={{ backgroundImage: `url(${ctaBg})` }}
      >
        <div
          className="relative z-10 max-w-3xl mx-auto text-center text-white"
          style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)' }}
        >
          <p className="text-slate-200 text-xs font-semibold tracking-[0.16em] uppercase mb-4">
            Stories of Transformation
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.05em] mb-4">Real Stories, Real Change</h2>
          <p className="text-slate-100 mb-10 max-w-xl mx-auto leading-relaxed">
            Every statistic represents a girl whose life has been transformed. Explore our impact
            dashboard to see the full picture behind the numbers.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/impact"
              className="px-8 py-3 bg-white text-slate-900 font-semibold uppercase text-sm tracking-[0.12em] border border-white hover:bg-transparent hover:text-white transition-colors"
            >
              Explore Impact →
            </Link>
            <button
              onClick={handleDonateClick}
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            <Link
              to="/donate"
              className="px-8 py-3 border border-white/70 text-white font-semibold uppercase text-sm tracking-[0.1em] hover:bg-white hover:text-slate-900 transition-colors"
            >
              Give Now
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
