import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const PrivacyPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-2xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
        <h2 className="text-3xl md:text-4xl font-extralight text-center mb-4 tracking-tight">
          <span className="text-white">Privacy Policy</span>
        </h2>
        <p className="text-slate-500 text-center mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <GlassCard className="!p-8 !rounded-2xl w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Information We Collect</h3>
              <p className="text-slate-400 leading-relaxed">
                We collect information you provide directly, including email address for authentication, voice samples for cloning, and meditation preferences.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">How We Use Your Information</h3>
              <p className="text-slate-400 leading-relaxed">
                We use your information to provide personalized meditation experiences, improve our AI models, and communicate service updates.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Data Storage</h3>
              <p className="text-slate-400 leading-relaxed">
                Your data is stored securely on Supabase servers. Voice samples and generated audio are encrypted at rest.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Third-Party Services</h3>
              <p className="text-slate-400 leading-relaxed">
                We use third-party services for authentication (Supabase), voice synthesis (Fish Audio), and AI processing (Google Gemini). Each service has its own privacy policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Your Rights</h3>
              <p className="text-slate-400 leading-relaxed">
                You can request access to, correction of, or deletion of your personal data at any time by contacting us.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Contact</h3>
              <p className="text-slate-400 leading-relaxed">
                For privacy-related inquiries, please contact us at privacy@inrvo.app.
              </p>
            </section>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default PrivacyPage;
