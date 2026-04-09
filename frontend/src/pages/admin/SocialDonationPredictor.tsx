import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import type {
  SocialDraftPredictionRequest,
  SocialDraftPredictionResult,
  SocialDraftSweepHourResult,
  SocialOptimizeRequest,
  SocialOptimizeResult,
  SocialWeeklyScheduleRequest,
  SocialWeeklyScheduleResult,
} from '../../types/models';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'WhatsApp', 'YouTube'];
const POST_TYPE_OPTIONS = ['Campaign', 'EducationalContent', 'EventPromotion', 'FundraisingAppeal', 'ImpactStory', 'ThankYou'];
const MEDIA_TYPE_OPTIONS = ['Carousel', 'Photo', 'Reel', 'Text', 'Video'];
const CONTENT_TOPIC_OPTIONS = [
  'AwarenessRaising',
  'CampaignLaunch',
  'DonorImpact',
  'Education',
  'EventRecap',
  'Gratitude',
  'Health',
  'Reintegration',
  'SafehouseLife',
];
const SENTIMENT_OPTIONS = ['Celebratory', 'Emotional', 'Grateful', 'Hopeful', 'Informative', 'Urgent'];
const CTA_OPTIONS = ['DonateNow', 'LearnMore', 'ShareStory', 'SignUp'];

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

type TabKey = 'weekly' | 'optimizer' | 'manual';

export default function SocialDonationPredictor() {
  const [activeTab, setActiveTab] = useState<TabKey>('weekly');

  useEffect(() => { document.title = 'Social Donation Predictor — Hope Haven'; }, []);

  // --- Manual prediction state ---
  const [socialDraft, setSocialDraft] = useState<SocialDraftPredictionRequest>({
    platform: 'Instagram',
    day_of_week: 'Tuesday',
    post_hour: 18,
    post_type: 'FundraisingAppeal',
    media_type: 'Carousel',
    content_topic: 'Education',
    sentiment_tone: 'Hopeful',
    num_hashtags: 3,
    mentions_count: 0,
    has_call_to_action: true,
    call_to_action_type: 'DonateNow',
    features_resident_story: false,
    caption_length: 280,
    is_boosted: false,
    boost_budget_php: 0,
  });
  const [socialResult, setSocialResult] = useState<SocialDraftPredictionResult | null>(null);
  const [socialSweep, setSocialSweep] = useState<SocialDraftSweepHourResult | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  // --- Optimizer state ---
  const [optPlatform, setOptPlatform] = useState('Instagram');
  const [optTarget, setOptTarget] = useState<'donation_value' | 'referrals'>('donation_value');
  const [optResult, setOptResult] = useState<SocialOptimizeResult | null>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  // --- Weekly schedule state ---
  const ALL_PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'WhatsApp', 'YouTube'] as const;
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([...ALL_PLATFORMS]);
  const [weeklyTarget, setWeeklyTarget] = useState<'donation_value' | 'referrals'>('donation_value');
  const [weeklyResult, setWeeklyResult] = useState<SocialWeeklyScheduleResult | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const runSocialPrediction = useCallback(async () => {
    setSocialLoading(true);
    setSocialError(null);
    setServiceUnavailable(false);
    try {
      const [draftResult, sweepResult] = await Promise.all([
        apiFetch<SocialDraftPredictionResult>('/api/predict/social/draft', {
          method: 'POST',
          body: JSON.stringify(socialDraft),
        }),
        apiFetch<SocialDraftSweepHourResult>('/api/predict/social/draft/sweep-hours', {
          method: 'POST',
          body: JSON.stringify(socialDraft),
        }),
      ]);
      setSocialResult(draftResult);
      setSocialSweep(sweepResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run social prediction.';
      setSocialError(message);
      if (message.includes('503')) setServiceUnavailable(true);
    } finally {
      setSocialLoading(false);
    }
  }, [socialDraft]);

  const runOptimizer = useCallback(async () => {
    setOptLoading(true);
    setOptError(null);
    setServiceUnavailable(false);
    try {
      const req: SocialOptimizeRequest = {
        platform: optPlatform,
        optimize_for: optTarget,
        top_n: 10,
      };
      const result = await apiFetch<SocialOptimizeResult>('/api/predict/social/optimize', {
        method: 'POST',
        body: JSON.stringify(req),
      });
      setOptResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run optimizer.';
      setOptError(message);
      if (message.includes('503')) setServiceUnavailable(true);
    } finally {
      setOptLoading(false);
    }
  }, [optPlatform, optTarget]);

  const runWeeklySchedule = useCallback(async () => {
    setWeeklyLoading(true);
    setWeeklyError(null);
    setServiceUnavailable(false);
    try {
      const req: SocialWeeklyScheduleRequest = {
        optimize_for: weeklyTarget,
        platforms: selectedPlatforms,
      };
      const result = await apiFetch<SocialWeeklyScheduleResult>('/api/predict/social/weekly-schedule', {
        method: 'POST',
        body: JSON.stringify(req),
      });
      setWeeklyResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate schedule.';
      setWeeklyError(message);
      if (message.includes('503')) setServiceUnavailable(true);
    } finally {
      setWeeklyLoading(false);
    }
  }, [weeklyTarget, selectedPlatforms]);

  const tabClass = (key: TabKey) =>
    `px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors border-b-2 ${
      activeTab === key
        ? 'text-slate-700 border-sky-600'
        : 'text-gray-500 border-transparent hover:text-gray-700'
    }`;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Donation Predictor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Forecast donation impact or find the optimal post strategy using the ML pipeline.
        </p>
      </div>

      {serviceUnavailable && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          The predictor service is currently unavailable. Please verify backend config and ensure the social ML API is running.
        </p>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200">
        <button type="button" className={tabClass('weekly')} onClick={() => setActiveTab('weekly')}>
          Weekly Schedule
        </button>
        <button type="button" className={tabClass('optimizer')} onClick={() => setActiveTab('optimizer')}>
          Post Optimizer
        </button>
        <button type="button" className={tabClass('manual')} onClick={() => setActiveTab('manual')}>
          Manual Prediction
        </button>
      </div>

      {/* ====================== WEEKLY SCHEDULE TAB ====================== */}
      {activeTab === 'weekly' && (
        <section className="bg-white border border-gray-200 p-5 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Weekly Posting Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">
              Generate an optimized 7-day content calendar. Each day gets a unique post type and
              content topic for maximum variety and impact.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Platforms to include</p>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      selectedPlatforms.includes(p)
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {selectedPlatforms.length < 2 && (
                <p className="text-xs text-red-500 mt-1">Select at least 2 platforms</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-gray-700">
                Optimize for
                <select
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value as 'donation_value' | 'referrals')}
                  className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="donation_value">Maximize Donation Value</option>
                  <option value="referrals">Maximize Referrals</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={runWeeklySchedule}
                  disabled={weeklyLoading || selectedPlatforms.length < 2}
                  className="w-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors disabled:opacity-60"
                >
                  {weeklyLoading ? 'Generating schedule...' : 'Generate Weekly Schedule'}
                </button>
              </div>
            </div>
          </div>

          {weeklyError && <span className="text-sm text-red-600">{weeklyError}</span>}

          {weeklyResult && (
            <div className="space-y-4">
              {/* Weekly total summary */}
              <div className="flex items-center gap-4">
                <div className="bg-sky-50 border border-sky-200 px-4 py-2">
                  <p className="text-xs text-slate-700 uppercase tracking-wide">Projected Weekly Total</p>
                  <p className="text-2xl font-bold text-slate-700">
                    {weeklyResult.optimize_for === 'referrals'
                      ? weeklyResult.weekly_total_predicted.toFixed(1) + ' referrals'
                      : formatPeso(weeklyResult.weekly_total_predicted)}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {weeklyResult.total_combinations_evaluated.toLocaleString()} combinations evaluated
                  across all platforms
                </span>
              </div>

              {/* Day-by-day schedule cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                {weeklyResult.schedule.map((day) => (
                  <div
                    key={day.day_of_week}
                    className="border border-gray-200 p-4 space-y-2 hover:border-sky-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 text-sm">{day.day_of_week}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5">
                        {formatHour(day.post_hour)}
                      </span>
                    </div>
                    <div className="mb-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.06em] bg-sky-100 text-slate-800 px-2 py-0.5">
                        {day.platform}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="text-gray-400">Type:</span> {day.post_type}</p>
                      <p><span className="text-gray-400">Media:</span> {day.media_type}</p>
                      <p><span className="text-gray-400">Topic:</span> {day.content_topic}</p>
                      <p><span className="text-gray-400">Tone:</span> {day.sentiment_tone}</p>
                      <p><span className="text-gray-400">CTA:</span> {day.call_to_action_type}</p>
                    </div>
                    <div className="pt-1 border-t border-gray-100">
                      <p className="text-sm font-semibold text-slate-700">
                        {weeklyResult.optimize_for === 'referrals'
                          ? day.predicted_value.toFixed(2) + ' ref.'
                          : formatPeso(day.predicted_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 italic">{weeklyResult.disclaimer}</p>
            </div>
          )}
        </section>
      )}

      {/* ====================== OPTIMIZER TAB ====================== */}
      {activeTab === 'optimizer' && (
        <section className="bg-white border border-gray-200 p-5 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Find the Optimal Post</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a platform and what you want to maximize. The model evaluates thousands of
              combinations and returns the top 10 recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-gray-700">
              Platform
              <select
                value={optPlatform}
                onChange={(e) => setOptPlatform(e.target.value)}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Optimize for
              <select
                value={optTarget}
                onChange={(e) => setOptTarget(e.target.value as 'donation_value' | 'referrals')}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="donation_value">Maximize Donation Value (₱)</option>
                <option value="referrals">Maximize Referrals</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={runOptimizer}
                disabled={optLoading}
                className="w-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors disabled:opacity-60"
              >
                {optLoading ? 'Analyzing combinations...' : 'Find Optimal Post'}
              </button>
            </div>
          </div>

          {optError && <span className="text-sm text-red-600">{optError}</span>}

          {optResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="bg-sky-50 text-slate-700 px-2 py-1 font-medium">
                  {optResult.total_combinations_evaluated.toLocaleString()} combinations evaluated
                </span>
                <span>for <span className="font-semibold">{optResult.platform}</span></span>
              </div>

              {/* Top recommendation highlight */}
              {optResult.recommendations.length > 0 && (
                <div className="bg-sky-50 border border-sky-200 p-5">
                  <p className="text-xs text-slate-700 uppercase tracking-wide font-semibold mb-2">
                    #1 Recommended Post
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Day</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].day_of_week}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-semibold text-gray-900">{formatHour(optResult.recommendations[0].post_hour)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Post Type</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].post_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Media</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].media_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Content Topic</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].content_topic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tone</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].sentiment_tone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Call to Action</p>
                      <p className="font-semibold text-gray-900">{optResult.recommendations[0].call_to_action_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {optResult.optimize_for === 'referrals' ? 'Predicted Referrals' : 'Predicted Value'}
                      </p>
                      <p className="font-bold text-slate-700 text-lg">
                        {optResult.optimize_for === 'referrals'
                          ? optResult.recommendations[0].predicted_value.toFixed(2)
                          : formatPeso(optResult.recommendations[0].predicted_value)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full recommendations table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Day</th>
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Post Type</th>
                      <th className="py-2 pr-3">Media</th>
                      <th className="py-2 pr-3">Topic</th>
                      <th className="py-2 pr-3">Tone</th>
                      <th className="py-2 pr-3">CTA</th>
                      <th className="py-2 pr-3 text-right">
                        {optResult.optimize_for === 'referrals' ? 'Referrals' : 'Value (₱)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {optResult.recommendations.map((rec) => (
                      <tr key={rec.rank} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-700">{rec.rank}</td>
                        <td className="py-2 pr-3">{rec.day_of_week}</td>
                        <td className="py-2 pr-3">{formatHour(rec.post_hour)}</td>
                        <td className="py-2 pr-3">{rec.post_type}</td>
                        <td className="py-2 pr-3">{rec.media_type}</td>
                        <td className="py-2 pr-3">{rec.content_topic}</td>
                        <td className="py-2 pr-3">{rec.sentiment_tone}</td>
                        <td className="py-2 pr-3">{rec.call_to_action_type}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-700">
                          {optResult.optimize_for === 'referrals'
                            ? rec.predicted_value.toFixed(2)
                            : formatPeso(rec.predicted_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 italic">{optResult.disclaimer}</p>
            </div>
          )}
        </section>
      )}

      {/* ====================== MANUAL PREDICTION TAB ====================== */}
      {activeTab === 'manual' && (
        <section className="bg-white border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manual Post Prediction</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure every field manually and see the predicted donation referrals, value, and posting hour.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-sm text-gray-700">
              Platform
              <select
                value={socialDraft.platform}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, platform: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Day of week
              <select
                value={socialDraft.day_of_week}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, day_of_week: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Post hour (0-23)
              <input
                type="number"
                min={0}
                max={23}
                value={socialDraft.post_hour}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, post_hour: Number(e.target.value || 0) }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Post type
              <select
                value={socialDraft.post_type}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, post_type: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {POST_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Media type
              <select
                value={socialDraft.media_type}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, media_type: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {MEDIA_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Content topic
              <select
                value={socialDraft.content_topic}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, content_topic: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {CONTENT_TOPIC_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Sentiment tone
              <select
                value={socialDraft.sentiment_tone}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, sentiment_tone: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {SENTIMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Call-to-action type
              <select
                value={socialDraft.call_to_action_type}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, call_to_action_type: e.target.value }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              >
                {CTA_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Number of hashtags
              <input
                type="number"
                min={0}
                value={socialDraft.num_hashtags}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, num_hashtags: Number(e.target.value || 0) }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Mentions count
              <input
                type="number"
                min={0}
                value={socialDraft.mentions_count}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, mentions_count: Number(e.target.value || 0) }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Caption length
              <input
                type="number"
                min={0}
                value={socialDraft.caption_length}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, caption_length: Number(e.target.value || 0) }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Boost budget (PHP)
              <input
                type="number"
                min={0}
                step={100}
                value={socialDraft.boost_budget_php}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, boost_budget_php: Number(e.target.value || 0) }))}
                className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700 flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={socialDraft.has_call_to_action}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, has_call_to_action: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Has call to action
            </label>
            <label className="text-sm text-gray-700 flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={socialDraft.features_resident_story}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, features_resident_story: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Features resident story
            </label>
            <label className="text-sm text-gray-700 flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={socialDraft.is_boosted}
                onChange={(e) => setSocialDraft((prev) => ({ ...prev, is_boosted: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Is boosted post
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSocialPrediction}
              disabled={socialLoading}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors disabled:opacity-60"
            >
              {socialLoading ? 'Running prediction...' : 'Run Prediction'}
            </button>
            {socialError && <span className="text-sm text-red-600">{socialError}</span>}
          </div>

          {socialResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Predicted referrals</p>
                <p className="text-xl font-semibold text-gray-900">{socialResult.predicted_donation_referrals.toFixed(2)}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Predicted donation value</p>
                <p className="text-xl font-semibold text-gray-900">{formatPeso(socialResult.predicted_estimated_donation_value_php)}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">High-performer probability</p>
                <p className="text-xl font-semibold text-gray-900">{formatPercent(socialResult.high_performer_probability)}</p>
              </div>
            </div>
          )}

          {socialSweep && (
            <p className="text-sm text-gray-700">
              Best posting hour: <span className="font-semibold">{socialSweep.best_post_hour}:00</span>
              {' '}({socialSweep.predicted_donation_referrals_at_best.toFixed(2)} predicted referrals)
            </p>
          )}
        </section>
      )}
    </div>
  );
}
