import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, HeartPulse, GraduationCap, Utensils, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, displaySafehouseName } from '../../utils/api';
import type { DashboardMetrics, PublicOkrMetric } from '../../types/models';
import heroBg from '../../assets/lighthousepic1.webp';
import missionImg from '../../assets/lighthousepic2.jpeg';
import ctaBg from '../../assets/lighthousepic3.jpg';

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
      <span className="text-3xl font-bold text-white">
        {value === null ? '—' : animated.toLocaleString()}
      </span>
      <span className="text-sm text-teal-100">{label}</span>
    </div>
  );
}

function DonationStatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-sm text-teal-100">{label}</span>
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
  Luzon:    '#2dd4bf',
  Visayas:  '#34d399',
  Mindanao: '#60a5fa',
};

// RGB triplets for box-shadow / rgba() usage (matches REGION_COLOR)
const REGION_GLOW: Record<string, string> = {
  Luzon:    '45, 212, 191',
  Visayas:  '52, 211, 153',
  Mindanao: '96, 165, 250',
};

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
          <stop offset="0%" stopColor="#0f2a3f" />
          <stop offset="100%" stopColor="#070e1a" />
        </radialGradient>

        {/* Island fill gradient */}
        <linearGradient id="islandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#134e4a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.5" />
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
      <rect x="0" y="0" width="100" height="100" fill="url(#oceanBg)" />

      {/* Island shapes */}
      {/* Luzon main */}
      <path
        d="M 48 10 L 44 14 L 40 18 L 39 22 L 41 26 L 44 28 L 46 32 L 48 36 L 52 38 L 56 36 L 58 32 L 57 27 L 55 23 L 54 18 L 52 13 Z"
        fill="url(#islandGrad)"
        stroke="#2dd4bf"
        strokeWidth="0.4"
        strokeOpacity="0.6"
      />
      {/* Luzon lower peninsula */}
      <path
        d="M 46 32 L 44 36 L 43 40 L 45 43 L 48 44 L 51 43 L 52 40 L 52 38"
        fill="url(#islandGrad)"
        stroke="#2dd4bf"
        strokeWidth="0.4"
        strokeOpacity="0.6"
      />
      {/* Mindoro */}
      <path
        d="M 40 42 L 37 44 L 36 48 L 38 51 L 41 50 L 42 46 Z"
        fill="url(#islandGrad)"
        stroke="#2dd4bf"
        strokeWidth="0.35"
        strokeOpacity="0.4"
      />
      {/* Palawan */}
      <path
        d="M 22 48 L 19 53 L 18 58 L 20 63 L 23 65 L 26 63 L 28 58 L 27 52 Z"
        fill="url(#islandGrad)"
        stroke="#2dd4bf"
        strokeWidth="0.35"
        strokeOpacity="0.4"
      />
      {/* Panay */}
      <path
        d="M 38 48 L 35 51 L 35 55 L 38 57 L 42 56 L 44 53 L 43 49 Z"
        fill="url(#islandGrad)"
        stroke="#34d399"
        strokeWidth="0.35"
        strokeOpacity="0.5"
      />
      {/* Negros */}
      <path
        d="M 44 50 L 43 54 L 44 58 L 46 61 L 49 60 L 50 56 L 49 52 L 47 50 Z"
        fill="url(#islandGrad)"
        stroke="#34d399"
        strokeWidth="0.35"
        strokeOpacity="0.5"
      />
      {/* Cebu */}
      <path
        d="M 51 47 L 50 51 L 51 55 L 53 57 L 56 55 L 56 51 L 54 48 Z"
        fill="url(#islandGrad)"
        stroke="#34d399"
        strokeWidth="0.35"
        strokeOpacity="0.5"
      />
      {/* Leyte / Samar */}
      <path
        d="M 58 44 L 56 48 L 57 52 L 60 54 L 64 53 L 66 49 L 65 45 L 62 43 Z"
        fill="url(#islandGrad)"
        stroke="#34d399"
        strokeWidth="0.35"
        strokeOpacity="0.5"
      />
      {/* Mindanao */}
      <path
        d="M 46 58 L 43 61 L 42 66 L 44 71 L 48 75 L 52 78 L 57 79 L 62 77 L 66 73 L 68 68 L 67 63 L 64 59 L 60 57 L 55 57 L 50 57 Z"
        fill="url(#islandGrad)"
        stroke="#60a5fa"
        strokeWidth="0.4"
        strokeOpacity="0.6"
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
              r="2.2"
              fill={color}
              className="pin-pulse-1"
              style={{ animationDelay: animDelay }}
            />
            {/* Outer pulse ring 2 — staggered */}
            <circle
              cx={x}
              cy={y}
              r="2.2"
              fill={color}
              className="pin-pulse-2"
              style={{ animationDelay: animDelay }}
            />
            {/* Ambient glow halo */}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 3.5 : 2.0}
              fill={color}
              opacity={isActive ? 0.35 : 0.15}
              style={{
                transition: 'r 0.2s ease, opacity 0.2s ease',
                filter: `blur(${isActive ? 1.5 : 0.8}px)`,
              }}
            />
            {/* Core dot */}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 1.8 : 1.1}
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
              fill="#111827"
              fillOpacity="0.95"
              stroke={REGION_COLOR[tooltip.region]}
              strokeWidth="0.4"
            />
            <text
              x={tipX + 9.5}
              y={tipY + 3.2}
              textAnchor="middle"
              fontSize="1.9"
              fill="white"
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

  function handleDonateClick() {
    if (isAuthenticated) {
      navigate('/donor/donate');
    } else {
      setShowDonatePrompt(true);
    }
  }

  useEffect(() => {
    document.title = 'Hope Haven — Safe Homes for Survivors';
    Promise.all([
      apiFetch<DashboardMetrics>('/api/dashboard/metrics'),
      apiFetch<PublicOkrMetric>('/api/dashboard/public-okr'),
    ])
      .then(([metricsData, okrData]) => {
        setMetrics(metricsData);
        setOkrMetric(okrData);
      })
      .catch(() => null);
  }, []);

  const PHP_TO_USD = 56;
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
      <section
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-teal-950/65" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center text-white">
          <p className="text-teal-300 text-sm font-semibold tracking-widest uppercase mb-4">
            Hope Haven Philippines
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Safe Homes for Girls Who Deserve a Future
          </h1>
          <p className="text-lg text-teal-100 mb-10 max-w-xl mx-auto leading-relaxed">
            We provide shelter, healing, and hope to girls who have experienced abuse and
            trafficking across the Philippines.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/impact"
              className="px-7 py-3 bg-white text-teal-800 font-semibold rounded-full hover:bg-teal-50 transition-colors"
            >
              See Our Impact
            </Link>
            <button
              onClick={handleDonateClick}
              className="px-7 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            >
              Support a Girl
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats bar — animated count-up                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-teal-700 py-10 px-6" aria-label="Key statistics">
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
              90-day Stable Reintegration Rate
            </h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch text-center">
              <div className="sm:col-span-1 rounded-xl bg-white border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Rate</p>
                <p className="text-4xl font-extrabold text-teal-700 mt-1">
                  {okrMetric ? `${okrMetric.ratePercent.toFixed(1)}%` : '—'}
                </p>
              </div>

              <div className="sm:col-span-2 rounded-xl bg-white border border-gray-100 p-4 flex flex-col justify-center">
                <p className="text-sm text-gray-700 font-medium">
                  {okrMetric
                    ? `${okrMetric.stableCount} stable outcomes out of ${okrMetric.eligibleCount} eligible exits`
                    : 'Tracking long-term reintegration stability for girls who exited shelter at least 90 days ago.'}
                </p>
                {okrMetric && (
                  <p className={`text-sm mt-1 font-semibold ${okrMetric.deltaPoints >= 0 ? 'text-teal-700' : 'text-amber-700'}`}>
                    {okrMetric.deltaPoints >= 0 ? '+' : ''}{okrMetric.deltaPoints.toFixed(1)} pts vs prior cohort
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Donor Impact Translator                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Your Impact in Action</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Every dollar goes directly to the girls in our care. Here is what your gift provides.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                Icon: Utensils,
                amount: '$5',
                impact: '1 day of nutritious meals for a resident',
                color: 'bg-amber-50 text-amber-600 border-amber-100',
                iconBg: 'bg-amber-100',
              },
              {
                Icon: Home,
                amount: '$9',
                impact: '1 day of safe housing and pastoral care',
                color: 'bg-teal-50 text-teal-600 border-teal-100',
                iconBg: 'bg-teal-100',
              },
              {
                Icon: HeartPulse,
                amount: '$21',
                impact: '1 trauma counseling session with a licensed therapist',
                color: 'bg-rose-50 text-rose-600 border-rose-100',
                iconBg: 'bg-rose-100',
              },
              {
                Icon: GraduationCap,
                amount: '$62',
                impact: '1 full month of schooling and life-skills training',
                color: 'bg-blue-50 text-blue-600 border-blue-100',
                iconBg: 'bg-blue-100',
              },
            ].map(({ Icon, amount, impact, color, iconBg }) => (
              <div
                key={amount}
                className={`rounded-2xl border p-6 flex flex-col items-center text-center gap-4 ${color}`}
              >
                <div className={`p-3 rounded-full ${iconBg}`}>
                  <Icon size={24} />
                </div>
                <p className="text-2xl font-extrabold">{amount}</p>
                <p className="text-sm leading-relaxed opacity-80">{impact}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={handleDonateClick}
              className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
            >
              Make a Donation
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Three Pillars — with mission image                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-teal-600 text-sm font-semibold tracking-widest uppercase mb-3">
              How We Help
            </p>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Three Pillars</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Every girl who comes through our doors receives a comprehensive programme built on three
              foundations — Caring, Healing, and Teaching.
            </p>
            <ul className="space-y-6">
              {[
                {
                  Icon: Home,
                  colorClasses: 'bg-teal-50 text-teal-600',
                  title: 'Caring',
                  desc: 'Safe housing, nutritious meals, and daily pastoral care from trained staff.',
                },
                {
                  Icon: HeartPulse,
                  colorClasses: 'bg-rose-50 text-rose-600',
                  title: 'Healing',
                  desc: 'Trauma-informed counselling, health monitoring, and psychosocial support.',
                },
                {
                  Icon: GraduationCap,
                  colorClasses: 'bg-blue-50 text-blue-600',
                  title: 'Teaching',
                  desc: 'Education support, life-skills training, and a path toward reintegration.',
                },
              ].map(({ Icon, colorClasses, title, desc }) => (
                <li key={title} className="flex gap-4 items-start">
                  <div className={`p-2.5 rounded-xl shrink-0 ${colorClasses}`} aria-hidden="true">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">{title}</p>
                    <p className="text-sm text-gray-500 mt-1">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <img
              src={missionImg}
              alt="Hope Haven residents and staff"
              className="rounded-2xl object-cover w-full h-80 md:h-96 shadow-lg"
            />
            <div className="absolute -bottom-5 -left-5 bg-teal-600 text-white rounded-2xl px-6 py-4 shadow-xl hidden md:block">
              <p className="text-2xl font-extrabold">9</p>
              <p className="text-xs text-teal-100 mt-0.5">Safehouses across<br />the Philippines</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Philippines Safehouse Map                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gray-900 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">
              Nationwide Presence
            </p>
            <h2 className="text-3xl font-bold text-white mb-3">
              Our Safehouses Across the Philippines
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              From northern Luzon to southern Mindanao, Hope Haven maintains nine safe homes
              so that no girl is ever too far from help.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-10 items-center">
            {/* Map */}
            <div className="md:col-span-3 flex justify-center">
              <div
                className="w-full max-w-[18rem] sm:max-w-[20rem] aspect-[3/4] h-auto relative rounded-2xl overflow-visible"
                style={{
                  background: 'radial-gradient(ellipse at center, #0f2a3f 0%, #070e1a 100%)',
                  boxShadow: '0 0 40px rgba(45, 212, 191, 0.08), 0 0 80px rgba(0,0,0,0.6)',
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
                          className="flex items-center gap-2.5 px-2 py-1 rounded-lg cursor-default transition-all duration-150"
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
                            style={{ color: isActive ? 'white' : '#d1d5db' }}
                          >
                            {displaySafehouseName(s.name)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-700">
                <Link
                  to="/impact"
                  className="text-teal-400 text-sm font-semibold hover:text-teal-300 transition-colors"
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
        <div className="absolute inset-0 bg-teal-950/70" />
        <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
          <p className="text-teal-300 text-sm font-semibold tracking-widest uppercase mb-4">
            Stories of Transformation
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Real Stories, Real Change</h2>
          <p className="text-teal-100 mb-10 max-w-xl mx-auto leading-relaxed">
            Every statistic represents a girl whose life has been transformed. Explore our impact
            dashboard to see the full picture behind the numbers.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/impact"
              className="px-8 py-3 bg-white text-teal-800 font-semibold rounded-full hover:bg-teal-50 transition-colors"
            >
              Explore Impact →
            </Link>
            <button
              onClick={handleDonateClick}
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            >
              Give Now
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
