import { Link } from 'react-router-dom';
import { Home, HeartPulse, GraduationCap, Users, ShieldCheck, Utensils } from 'lucide-react';

const programs = [
  {
    icon: Home,
    color: 'bg-teal-50 text-teal-600',
    title: 'Safe Housing',
    description: 'Every donation helps maintain safe, secure facilities for girls who have nowhere else to turn. Funds cover rent, utilities, maintenance, and security.',
    example: '₱500 covers one day of safe housing for a resident.',
  },
  {
    icon: HeartPulse,
    color: 'bg-rose-50 text-rose-600',
    title: 'Trauma Counseling',
    description: 'Licensed social workers and psychologists provide individual and group therapy sessions. Your support funds session costs, training, and clinical supervision.',
    example: '₱1,200 funds one individual counseling session.',
  },
  {
    icon: GraduationCap,
    color: 'bg-blue-50 text-blue-600',
    title: 'Education & Skills',
    description: 'We keep every girl enrolled in school and provide life-skills training to prepare them for independent living. Funds cover school fees, uniforms, and supplies.',
    example: '₱3,500 covers one month of school expenses per girl.',
  },
  {
    icon: Utensils,
    color: 'bg-amber-50 text-amber-600',
    title: 'Nutrition & Health',
    description: 'Three nutritious meals daily, regular medical and dental checkups, and medication when needed. Your gift ensures no girl goes hungry or untreated.',
    example: '₱250 feeds a resident for one full day.',
  },
  {
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
    title: 'Family Reintegration',
    description: 'Safely returning girls to loving families or transitioning them to independent living requires home visits, case conferences, and ongoing support.',
    example: '₱2,000 funds one reintegration home visit.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-green-50 text-green-600',
    title: 'Staff & Operations',
    description: 'Trained, compassionate staff are our greatest resource. Funds support salaries, professional development, and the administrative systems that keep everything running.',
    example: '₱5,000 contributes one week of social worker salary.',
  },
];

const breakdowns = [
  { label: 'Direct Resident Care', pct: 72, color: 'bg-teal-500' },
  { label: 'Staff & Programs', pct: 18, color: 'bg-teal-300' },
  { label: 'Operations & Admin', pct: 7,  color: 'bg-teal-200' },
  { label: 'Fundraising',        pct: 3,  color: 'bg-gray-200' },
];

export default function DonatePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-teal-800 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4">Where Your Donation Goes</h1>
          <p className="text-teal-100 text-lg leading-relaxed">
            Every peso given to Hope Haven is invested directly in the lives of girls recovering
            from abuse and trafficking. Here is exactly how your support makes a difference.
          </p>
        </div>
      </section>

      {/* Fund breakdown */}
      <section className="max-w-3xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Fund Allocation</h2>
        <div className="space-y-4">
          {breakdowns.map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>{label}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Based on the most recent annual report. Hope Haven is committed to transparency — view our{' '}
          <Link to="/impact" className="underline hover:text-teal-600">impact dashboard</Link> for full details.
        </p>
      </section>

      {/* Program areas */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-10 text-center">Our Program Areas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(({ icon: Icon, color, title, description, example }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className={`inline-flex p-2.5 rounded-xl mb-4 ${color}`} aria-hidden="true">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{description}</p>
                <p className="text-xs font-medium text-teal-700 bg-teal-50 rounded-lg px-3 py-2">{example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Types of giving */}
      <section className="max-w-3xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Ways to Give</h2>
        <div className="space-y-4">
          {[
            { type: 'Monetary Donation', detail: 'One-time or recurring financial gifts in any amount.' },
            { type: 'In-Kind Donation', detail: 'Goods such as food, clothing, school supplies, hygiene kits, or furniture.' },
            { type: 'Skills Contribution', detail: 'Volunteer your professional expertise — legal aid, medical services, tutoring, or training.' },
            { type: 'Social Media Support', detail: 'Share our posts and campaigns to raise awareness and reach new supporters.' },
          ].map(({ type, detail }) => (
            <div key={type} className="flex gap-4 items-start border border-gray-100 rounded-xl p-4">
              <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800">{type}</p>
                <p className="text-sm text-gray-500 mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-700 text-white py-16 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-3">Ready to Make a Difference?</h2>
          <p className="text-teal-100 mb-8">
            Contact us to arrange your donation. We accept bank transfers, GCash, and in-kind contributions.
          </p>
          <a
            href="mailto:donate@hopehaven.org"
            className="inline-block px-8 py-3 bg-white text-teal-700 font-semibold rounded-full hover:bg-teal-50 transition-colors"
          >
            Contact Us to Donate
          </a>
        </div>
      </section>
    </div>
  );
}
