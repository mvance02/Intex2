import { useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function ReferralPage() {
  const [form, setForm] = useState({
    referrerName: '',
    referrerContact: '',
    subjectAge: '',
    subjectLocation: '',
    situation: '',
    urgency: 'routine',
    anonymous: false,
  });
  const [state, setState] = useState<FormState>('idle');
  const [refNumber, setRefNumber] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    try {
      const { referenceNumber } = await apiFetch<{ referenceNumber: string }>('/api/referrals', {
        method: 'POST',
        body: JSON.stringify({
          subjectLocation: form.subjectLocation,
          situation: form.situation,
          urgency: form.urgency,
          subjectAge: form.subjectAge || null,
          referrerName: form.referrerName || null,
          referrerContact: form.referrerContact || null,
          anonymous: form.anonymous,
        }),
      });
      setRefNumber(referenceNumber);
      setState('success');
    } catch {
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full">
            <ShieldCheck size={40} className="text-teal-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Referral Received</h1>
        <p className="text-gray-500 leading-relaxed mb-6">
          Thank you for reaching out. A Hope Haven social worker will review this referral and
          respond within 48 hours. If this is an emergency, please contact local authorities
          immediately.
        </p>
        <p className="text-sm text-gray-400">
          Reference number: <span className="font-mono font-semibold">{refNumber}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Anonymous Referral</h1>
        <p className="text-gray-500 leading-relaxed">
          If you know a child or young woman who may need shelter, counseling, or protection,
          you can submit a confidential referral here. You do not need to share your identity.
        </p>
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>For immediate danger, contact local police (911) or the DSWD hotline (1-800-10-5786 or 02-931-8101).</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">About the Person in Need</legend>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approximate Age <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="subjectAge"
                value={form.subjectAge}
                onChange={handleChange}
                placeholder="e.g. 14"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location / Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subjectLocation"
                value={form.subjectLocation}
                onChange={handleChange}
                required
                placeholder="City, province, or barangay"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe the Situation <span className="text-red-500">*</span>
            </label>
            <textarea
              name="situation"
              value={form.situation}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Please describe what you have observed or know about the situation. Include any relevant details that may help our social workers respond appropriately."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
            <select
              name="urgency"
              value={form.urgency}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="routine">Routine — Within a week</option>
              <option value="soon">Soon — Within 48 hours</option>
              <option value="urgent">Urgent — Today</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="space-y-4 pt-2 border-t border-gray-100">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide pt-4">Your Information (Optional)</legend>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              name="anonymous"
              checked={form.anonymous}
              onChange={handleChange}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Submit completely anonymously (no contact info)
          </label>

          {!form.anonymous && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  name="referrerName"
                  value={form.referrerName}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone or Email</label>
                <input
                  type="text"
                  name="referrerContact"
                  value={form.referrerContact}
                  onChange={handleChange}
                  placeholder="How we can reach you"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </fieldset>

        {state === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again or contact us directly.</p>
        )}

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="w-full py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition-colors disabled:opacity-60"
        >
          {state === 'submitting' ? 'Submitting…' : 'Submit Referral'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          All referrals are kept strictly confidential and reviewed only by licensed social workers.
        </p>
      </form>
    </div>
  );
}
