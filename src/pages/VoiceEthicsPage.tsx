import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const VoiceEthicsPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-3xl mx-auto w-full pb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Policy</div>
        <h2 className="text-3xl md:text-4xl font-extralight text-center mb-4 tracking-tight">
          <span className="text-white">Voice & AI Ethics Policy</span>
        </h2>
        <p className="text-slate-500 text-center mb-8">Last updated: January 2026</p>

        <GlassCard className="!p-8 !rounded-2xl w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <p className="text-slate-400 leading-relaxed">
              This policy governs how Innrvo uses artificial intelligence (AI) and voice cloning technology. By using our platform, you agree to this policy.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Purpose of Voice AI</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo uses AI voice synthesis exclusively to allow users to hear their own meditations and affirmations in their own voice. This technology is used only for personal development, private listening, self-reflection and wellbeing practices. It is not used for public broadcasting, commercial licensing, advertising, impersonation, deepfake creation or fraud.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Voice Ownership</h3>
              <p className="text-slate-300 leading-relaxed font-medium">
                You retain 100% ownership of your voice. Innrvo does not claim, license, monetize or transfer any rights to your voice. Your voice belongs solely to you.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Consent Requirement</h3>
              <p className="text-slate-400 leading-relaxed">
                By uploading voice recordings, you confirm that you are the voice owner and give informed consent for AI processing. You understand this consent can be withdrawn at any time.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Strict Usage Limits</h3>
              <p className="text-slate-400 leading-relaxed">
                Your voice is processed only to generate your personal meditation and affirmation audio. We will never sell, share, train models with, or allow third-party access to your voice. We do not generate public content or allow deceptive use.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. AI Transparency (EU AI Act)</h3>
              <p className="text-slate-400 leading-relaxed">
                All generated audio is AI-generated, labeled inside the platform and must not be misrepresented as human speech. We comply with EU AI Act transparency obligations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. User Responsibility</h3>
              <p className="text-slate-400 leading-relaxed">
                You agree not to upload third-party voices, impersonate others, create misleading content or violate any laws. You are responsible for your use of generated content and any consequences arising from it.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Prohibited Conduct</h3>
              <p className="text-slate-400 leading-relaxed">
                You may not clone celebrities or public figures, commit fraud, manipulate, mislead, conduct political propaganda, harass or threaten others. Violations result in account termination and potential legal reporting.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Data Protection (GDPR)</h3>
              <p className="text-slate-400 leading-relaxed">
                Voice data is treated as personal data and potentially biometric data. We apply explicit consent, data minimization, secure storage, deletion rights and DPIAs when required. You may delete your data at any time via your account or by contacting support.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. Startup Transparency</h3>
              <p className="text-slate-300 leading-relaxed italic">
                As a growing startup, some automated functions may experience temporary technical issues. If this occurs, contact support@innrvo.com and we will manually process your request promptly. Privacy and ethics are core values of Innrvo.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">10. Security Measures</h3>
              <p className="text-slate-400 leading-relaxed">
                We implement encryption, access controls, secure servers, vendor DPAs and monitoring systems. While no system is 100% secure, we apply industry standards.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">11. Liability Disclaimer</h3>
              <p className="text-slate-400 leading-relaxed">
                To the maximum extent permitted by law, Innrvo is not liable for misuse by users, external sharing, third-party actions or legal consequences. Use of this technology is at your own risk.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">12. No Guarantee & No Professional Advice</h3>
              <p className="text-slate-400 leading-relaxed">
                Innrvo does not guarantee outcomes and does not provide therapy, medical treatment or coaching. Content is for personal reflection only.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">13. Regulatory Compliance</h3>
              <p className="text-slate-400 leading-relaxed">
                We comply with GDPR, Cyprus Data Protection Law, EU AI Act, DSA and consumer law. We cooperate with authorities.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">14. Reporting Abuse</h3>
              <p className="text-slate-400 leading-relaxed">
                To report misuse, email legal@innrvo.com. We investigate and take appropriate action.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">15. Changes</h3>
              <p className="text-slate-400 leading-relaxed">
                We may update this policy. Material changes will be notified. Continued use constitutes acceptance.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">16. Governing Law</h3>
              <p className="text-slate-400 leading-relaxed">
                This policy is governed by Cyprus law. EU mandatory laws apply.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">17. Contact</h3>
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

export default VoiceEthicsPage;
