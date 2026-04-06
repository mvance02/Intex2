import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, HeartPulse, GraduationCap } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import type { DashboardMetrics } from '../../types/models';

function StatBadge({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-sm text-teal-100">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    document.title = 'Hope Haven — Safe Homes for Survivors';
    apiFetch<DashboardMetrics>('/api/dashboard/metrics')
      .then(setMetrics)
      .catch(() => null);
  }, []);

  const ytd = metrics
    ? `₱${Number(metrics.ytdDonations).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    : '—';

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-teal-800">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-600 opacity-90" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
            Safe Homes for Girls Who Deserve a Future
          </h1>
          <p className="text-lg text-teal-100 mb-10 max-w-xl mx-auto">
            Hope Haven provides shelter, healing, and hope to girls who have experienced abuse and
            trafficking in the Philippines.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/impact"
              className="px-7 py-3 bg-white text-teal-800 font-semibold rounded-full hover:bg-teal-50 transition-colors"
            >
              See Our Impact
            </Link>
            <a
              href="mailto:donate@hopehaven.org"
              className="px-7 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            >
              Support a Girl
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-teal-700 py-8 px-6" aria-label="Key statistics">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <StatBadge value={metrics?.activeResidents ?? '—'} label="Girls in Our Care" />
          <StatBadge value={metrics?.activeSafehouses ?? '—'} label="Active Safehouses" />
          <StatBadge value={metrics?.totalSupporters ?? '—'} label="Generous Supporters" />
          <StatBadge value={ytd} label="Raised This Year" />
        </div>
      </section>

      {/* Mission section */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Three Pillars</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Every girl who comes through our doors receives a comprehensive programme built on three
            foundations — Caring, Healing, and Teaching.
          </p>
          <ul className="space-y-5">
            {[
              { Icon: Home,        color: 'bg-teal-50 text-teal-600',  title: 'Caring',   desc: 'Safe housing, nutritious meals, and daily pastoral care.' },
              { Icon: HeartPulse,  color: 'bg-rose-50 text-rose-600',  title: 'Healing',  desc: 'Trauma-informed counselling and regular health monitoring.' },
              { Icon: GraduationCap, color: 'bg-blue-50 text-blue-600', title: 'Teaching', desc: 'Education support and life-skills training toward reintegration.' },
            ].map(({ Icon, color, title, desc }) => (
              <li key={title} className="flex gap-4 items-start">
                <div className={`p-2.5 rounded-xl shrink-0 ${color}`} aria-hidden="true">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-700">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-teal-50 rounded-2xl p-8 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-teal-800">Make a Difference Today</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your support funds safe beds, trained social workers, school supplies, and the daily
            care that gives girls a second chance at a full life.
          </p>
          <Link
            to="/impact"
            className="mt-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-full text-center hover:bg-teal-700 transition-colors"
          >
            View Impact Reports →
          </Link>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Real Stories, Real Change</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Every statistic represents a girl whose life has changed. Explore our impact dashboard
            to see the full picture.
          </p>
          <Link
            to="/impact"
            className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors"
          >
            Explore Impact →
          </Link>
        </div>
      </section>
    </div>
  );
}
