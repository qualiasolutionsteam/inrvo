import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const PrivacyPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-3xl mx-auto w-full pb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
        <h2 className="text-3xl md:text-4xl font-extralight text-center mb-4 tracking-tight">
          <span className="text-white">Privacy Policy</span>
        </h2>
        <p className="text-slate-500 text-center mb-8">Last updated: January 2026</p>

        <GlassCard className="!p-8 !rounded-2xl w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <p className="text-slate-400 leading-relaxed">
              Innrvo ("we", "our", "us") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, share and protect your information in accordance with the General Data Protection Regulation (GDPR), Cyprus Data Protection Law, the ePrivacy Directive and applicable international privacy laws.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Who We Are</h3>
              <p className="text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Controller:</strong> Innrvo<br />
                Registered in Cyprus (EU)<br />
                Email: support@innrvo.com
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Our Role</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo acts as the Data Controller for all personal data processed on the platform. All third-party service providers act strictly as Data Processors under binding contractual agreements (DPAs).
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Data We Collect</h3>
              <ul className="text-slate-400 leading-relaxed space-y-2 list-none pl-0">
                <li><strong className="text-slate-300">Account Data:</strong> name, email address, encrypted password, subscription status.</li>
                <li><strong className="text-slate-300">Voice Data:</strong> voice recordings you upload, AI-generated audio files.</li>
                <li><strong className="text-slate-300">Technical Data:</strong> IP address, browser type, device, operating system.</li>
                <li><strong className="text-slate-300">Usage Data:</strong> pages visited, feature usage, logs, session activity.</li>
                <li><strong className="text-slate-300">Payment Data:</strong> processed by third-party providers. We never store full card numbers.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Data Minimization</h3>
              <p className="text-slate-400 leading-relaxed">
                We collect only data that is necessary, relevant and proportionate to provide our services. We do not collect excessive or irrelevant information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Purpose of Processing</h3>
              <p className="text-slate-400 leading-relaxed mb-3">We process personal data to:</p>
              <ul className="text-slate-400 leading-relaxed space-y-1 list-disc pl-5">
                <li>Provide and maintain the platform</li>
                <li>Generate personalized meditations and affirmations</li>
                <li>Process voice synthesis</li>
                <li>Manage accounts and subscriptions</li>
                <li>Improve user experience</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4 font-medium">
                We do NOT sell, rent or share your data for advertising purposes. We never use your voice to train AI models.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Legal Basis</h3>
              <p className="text-slate-400 leading-relaxed mb-2">We process data based on:</p>
              <ul className="text-slate-400 leading-relaxed space-y-1 list-disc pl-5">
                <li>Contract performance</li>
                <li>Your explicit consent (voice data)</li>
                <li>Legal obligations</li>
                <li>Legitimate interests (security, analytics)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Voice Data Protection</h3>
              <p className="text-slate-400 leading-relaxed">
                Your voice remains your property. It is used only to generate your personal audio content. We never share, sell or reuse your voice for any other purpose.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Third-Party Processors</h3>
              <p className="text-slate-400 leading-relaxed mb-2">We work with trusted partners including:</p>
              <ul className="text-slate-400 leading-relaxed space-y-1 list-disc pl-5">
                <li>ElevenLabs (voice synthesis)</li>
                <li>Cloud hosting providers</li>
                <li>Payment processors</li>
                <li>Analytics providers (only with consent)</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-3">
                All partners are bound by GDPR-compliant contracts and security obligations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. Data Retention</h3>
              <ul className="text-slate-400 leading-relaxed space-y-1 list-disc pl-5">
                <li>Account data: while your account is active</li>
                <li>Voice data: until you delete it or request deletion</li>
                <li>Billing records: 7 years (legal requirement)</li>
                <li>Logs: up to 12 months</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">10. Your Rights</h3>
              <p className="text-slate-400 leading-relaxed mb-3">
                You have the right to access, correct, delete, restrict, export your data and withdraw consent at any time.
              </p>
              <p className="text-slate-400 leading-relaxed mb-2">You may exercise your rights:</p>
              <ul className="text-slate-400 leading-relaxed space-y-1 list-disc pl-5">
                <li>Via your account dashboard</li>
                <li>By emailing support@innrvo.com</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4 italic">
                <strong>Startup Commitment:</strong> We are a growing startup. If any automated tool fails, contact us and we will manually process your request promptly. Privacy is a core value of Innrvo.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">11. Data Portability</h3>
              <p className="text-slate-400 leading-relaxed">
                You may request your data in a machine-readable format.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">12. Automated Processing</h3>
              <p className="text-slate-400 leading-relaxed">
                We use AI to generate audio. No automated decision produces legal effects.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">13. Security</h3>
              <p className="text-slate-400 leading-relaxed">
                We use encryption, access controls, monitoring, secure servers and conduct regular security reviews. All staff are bound by confidentiality agreements.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">14. Data Breaches</h3>
              <p className="text-slate-400 leading-relaxed">
                If a breach occurs, authorities will be notified within 72 hours where required. Users will be informed when necessary. We maintain an incident response plan.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">15. DPIA</h3>
              <p className="text-slate-400 leading-relaxed">
                We conduct Data Protection Impact Assessments when required, especially for biometric data processing.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">16. Government Requests</h3>
              <p className="text-slate-400 leading-relaxed">
                We only disclose data when legally required and after verifying the request.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">17. International Transfers</h3>
              <p className="text-slate-400 leading-relaxed">
                If data leaves the EU, we apply Standard Contractual Clauses and GDPR safeguards.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">18. Cookies</h3>
              <p className="text-slate-400 leading-relaxed">
                We use essential cookies and optional analytics/marketing cookies with consent.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">19. Children</h3>
              <p className="text-slate-400 leading-relaxed">
                We do not knowingly collect data from anyone under 18. Accounts are deleted if detected.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">20. Regulatory Cooperation</h3>
              <p className="text-slate-400 leading-relaxed">
                We cooperate fully with supervisory authorities and maintain compliance documentation.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">21. Complaints</h3>
              <p className="text-slate-400 leading-relaxed">
                You may contact us first at support@innrvo.com. You also have the right to complain to the Cyprus Data Protection Authority.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">22. Updates</h3>
              <p className="text-slate-400 leading-relaxed">
                We may update this policy. Material changes will be notified by email.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">23. Our Values</h3>
              <p className="text-slate-400 leading-relaxed">
                Privacy is part of our core values. We believe in transparency, human support and accountability. If anything fails, we are here to help.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">24. Contact</h3>
              <p className="text-slate-400 leading-relaxed">
                support@innrvo.com
              </p>
            </section>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default PrivacyPage;
