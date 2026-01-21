import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const TermsPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-3xl mx-auto w-full pb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
        <h2 className="text-3xl md:text-4xl font-extralight text-center mb-4 tracking-tight">
          <span className="text-white">Terms & Conditions</span>
        </h2>
        <p className="text-slate-500 text-center mb-8">Last updated: January 2026</p>

        <GlassCard className="!p-8 !rounded-2xl w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <p className="text-slate-400 leading-relaxed">
              By accessing or using Innrvo ("Platform", "Service", "we", "us", "our"), you agree to these Terms & Conditions ("Terms"). If you do not agree, you must immediately stop using the Service.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Company Information</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo is operated by Innrvo, registered in Cyprus (EU). Email: support@innrvo.com
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Eligibility & Verification</h3>
              <p className="text-slate-400 leading-relaxed">
                You must be at least 18 years old. We may request age or identity verification.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Nature of Service</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo provides AI-generated meditations, affirmations, synthetic voice generation and personal development tools. The service is not medical, therapeutic, financial or legal advice.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. No Professional Relationship</h3>
              <p className="text-slate-400 leading-relaxed">
                No therapist, doctor, coach or fiduciary relationship is created. You remain responsible for your decisions.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Mental Health Disclaimer</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo is not a substitute for professional care. Seek qualified help if needed.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Voice Ownership & Consent</h3>
              <p className="text-slate-400 leading-relaxed">
                You confirm ownership and grant explicit consent for AI processing. Your voice is used only for your personal content.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. User Generated Content Responsibility</h3>
              <p className="text-slate-400 leading-relaxed">
                You are solely responsible for all content you upload.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Prohibited Uses</h3>
              <p className="text-slate-400 leading-relaxed">
                No impersonation, fraud, deception, political manipulation or illegal use allowed.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. AI Transparency</h3>
              <p className="text-slate-400 leading-relaxed">
                All content is AI-generated and labeled accordingly.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">10. Account Security</h3>
              <p className="text-slate-400 leading-relaxed">
                You are responsible for securing your account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">11. Payments & Subscriptions</h3>
              <p className="text-slate-400 leading-relaxed">
                Subscriptions auto-renew unless canceled. EU users waive 14-day withdrawal once service starts.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">12. Data Protection</h3>
              <p className="text-slate-400 leading-relaxed">
                We comply with GDPR and Cyprus law. See Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">13. Data Breach Procedure</h3>
              <p className="text-slate-400 leading-relaxed">
                Authorities notified within 72 hours where required.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">14. No Guarantee</h3>
              <p className="text-slate-400 leading-relaxed">
                No promised outcomes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">15. No Reliance</h3>
              <p className="text-slate-400 leading-relaxed">
                You do not rely on Innrvo for life decisions.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">16. Limitation of Liability</h3>
              <p className="text-slate-400 leading-relaxed">
                We are not liable for indirect damages.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">17. Liability Cap</h3>
              <p className="text-slate-400 leading-relaxed">
                Liability capped at payments made in last 12 months.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">18. Indemnification</h3>
              <p className="text-slate-400 leading-relaxed">
                You indemnify Innrvo for misuse.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">19. Intellectual Property</h3>
              <p className="text-slate-400 leading-relaxed">
                Platform content belongs to Innrvo. You retain voice ownership.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">20. Right to Refuse Service</h3>
              <p className="text-slate-400 leading-relaxed">
                We may terminate at our discretion.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">21. Platform Monitoring</h3>
              <p className="text-slate-400 leading-relaxed">
                We may monitor and remove content.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">22. Service Availability</h3>
              <p className="text-slate-400 leading-relaxed">
                Service provided as-is.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">23. Third Party Services</h3>
              <p className="text-slate-400 leading-relaxed">
                We are not responsible for third-party outages.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">24. Export Control</h3>
              <p className="text-slate-400 leading-relaxed">
                You confirm no sanctions violations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">25. Force Majeure</h3>
              <p className="text-slate-400 leading-relaxed">
                No liability for uncontrollable events.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">26. DSA Compliance</h3>
              <p className="text-slate-400 leading-relaxed">
                Illegal content reporting: legal@innrvo.com
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">27. Arbitration</h3>
              <p className="text-slate-400 leading-relaxed">
                Disputes resolved by arbitration in Cyprus.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">28. Class Action Waiver</h3>
              <p className="text-slate-400 leading-relaxed">
                No group lawsuits allowed.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">29. Severability</h3>
              <p className="text-slate-400 leading-relaxed">
                Invalid clauses do not affect others.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">30. Survival</h3>
              <p className="text-slate-400 leading-relaxed">
                Key clauses survive termination.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">31. Assignment</h3>
              <p className="text-slate-400 leading-relaxed">
                We may transfer rights.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">32. Language</h3>
              <p className="text-slate-400 leading-relaxed">
                English prevails.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">33. Entire Agreement</h3>
              <p className="text-slate-400 leading-relaxed">
                These Terms form the entire agreement.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">34. Regulatory Authority</h3>
              <p className="text-slate-400 leading-relaxed">
                Cyprus Data Protection Authority
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">35. Updates</h3>
              <p className="text-slate-400 leading-relaxed">
                Material changes notified by email.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">36. Governing Law</h3>
              <p className="text-slate-400 leading-relaxed">
                Cyprus law applies.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">37. Contact</h3>
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

export default TermsPage;
