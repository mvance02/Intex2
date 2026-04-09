import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { DonorWallEntry } from '../../types/models';

export default function DonorWallPage() {
  const [entries, setEntries] = useState<DonorWallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<DonorWallEntry[]>('/api/donations/wall')
      .then((data) => {
        setEntries(data);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load donor wall.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-slate-50 min-h-[70vh] py-16 px-6 border-y border-slate-200">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-600 mb-2">
            Community Support
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.05em] text-slate-900">Wall of Donors</h1>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Thank you to supporters who chose to be recognized for helping Hope Haven girls heal and rebuild.
          </p>
        </div>

        {loading && (
          <LoadingSpinner size="lg" label="Loading donor wall…" />
        )}

        {!loading && error && (
          <div className="border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 text-center">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="border border-slate-200 bg-white p-10 text-center text-slate-500">
            No donors have chosen public recognition yet.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <article
                key={`${entry.displayName}-${entry.latestDonationDate ?? 'n/a'}`}
                className="border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Heart size={16} aria-hidden="true" />
                  <span className="text-xs uppercase tracking-[0.08em] font-semibold">Donor</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 break-words">{entry.displayName}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {entry.donationCount} contribution{entry.donationCount === 1 ? '' : 's'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
