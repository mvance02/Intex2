import { useCallback, useState } from 'react';
import { apiFetch } from '../../utils/api';
import type {
  SocialDraftPredictionRequest,
  SocialDraftPredictionResult,
  SocialDraftSweepHourResult,
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
  return `P${amount.toLocaleString('en-PH')}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function SocialDonationPredictor() {
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

  const runSocialPrediction = useCallback(async () => {
    setSocialLoading(true);
    setSocialError(null);
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
      setSocialError(err instanceof Error ? err.message : 'Failed to run social prediction.');
    } finally {
      setSocialLoading(false);
    }
  }, [socialDraft]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Donation Predictor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Forecast donation referrals and suggested posting hour using the social donation ML pipeline.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="text-sm text-gray-700">
            Platform
            <select
              value={socialDraft.platform}
              onChange={(e) => setSocialDraft((prev) => ({ ...prev, platform: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-700">
            Post type
            <select
              value={socialDraft.post_type}
              onChange={(e) => setSocialDraft((prev) => ({ ...prev, post_type: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {CTA_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runSocialPrediction}
            disabled={socialLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors disabled:opacity-60"
          >
            {socialLoading ? 'Running prediction...' : 'Run Prediction'}
          </button>
          {socialError && <span className="text-sm text-red-600">{socialError}</span>}
        </div>

        {socialResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Predicted referrals</p>
              <p className="text-xl font-semibold text-gray-900">{socialResult.predicted_donation_referrals.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Predicted donation value</p>
              <p className="text-xl font-semibold text-gray-900">{formatPeso(socialResult.predicted_estimated_donation_value_php)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
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
    </div>
  );
}
