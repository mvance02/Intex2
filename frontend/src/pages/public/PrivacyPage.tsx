import { useEffect } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy — Hope Haven';
  }, []);

  const clearConsent = () => {
    localStorage.removeItem('hh_cookie_consent');
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

      <Section title="1. Who We Are">
        <p>
          Hope Haven is a nonprofit organisation operating residential safehouses for girls who have
          experienced abuse or trafficking in the Philippines. This privacy policy explains how we
          collect, use, and protect personal data on this website.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We may collect the following categories of information:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Contact information (name, email, phone) when you reach out or donate</li>
          <li>Usage data (pages visited, browser type) through server logs</li>
          <li>Cookies necessary for site functionality and security</li>
        </ul>
        <p>
          We do <strong>not</strong> publish personally identifiable information about the girls in
          our care. Any resident data is held in a secure, access-controlled internal system and is
          never shared publicly.
        </p>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>Information collected is used solely to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Respond to inquiries and process donations</li>
          <li>Send updates to supporters who have opted in</li>
          <li>Improve the security and performance of this website</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="4. Cookies">
        <p>
          This website uses cookies strictly necessary for it to function. We do not use third-party
          advertising or tracking cookies. You may withdraw your consent at any time using the button
          below.
        </p>
        {/* IS 414: Expand with full cookie category breakdown (functional, analytics, marketing) */}
        <button
          onClick={clearConsent}
          className="mt-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
        >
          Reset Cookie Preferences
        </button>
      </Section>

      <Section title="5. Data Sharing">
        <p>
          We do not sell, rent, or trade personal data. We may share information with trusted
          service providers (such as payment processors) solely to fulfil your request, under strict
          confidentiality agreements.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          Supporter and donation records are retained for seven years to meet Philippine nonprofit
          accounting requirements. You may request deletion of your personal data where this does not
          conflict with legal obligations.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Withdraw consent for optional communications at any time</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@hopehaven.org" className="text-teal-700 underline">
            privacy@hopehaven.org
          </a>
          .
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use industry-standard security measures including encrypted connections (HTTPS),
          access-controlled databases, and role-based permissions to protect all personal data.
        </p>
        {/* IS 414: Document full security controls once implemented */}
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this policy periodically. Changes will be posted on this page with a revised
          date. Continued use of the site after changes constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Hope Haven <br />
          Email:{' '}
          <a href="mailto:privacy@hopehaven.org" className="text-teal-700 underline">
            privacy@hopehaven.org
          </a>
        </p>
      </Section>
    </div>
  );
}
