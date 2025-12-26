import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const TermsPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-2xl mx-auto w-full">
        <div className="inline-block px-4 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Legal</div>
        <h2 className="text-3xl md:text-4xl font-extralight text-center mb-4 tracking-tight">
          <span className="text-white">Terms of Service</span>
        </h2>
        <p className="text-slate-500 text-center mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <GlassCard className="!p-8 !rounded-2xl w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h3>
              <p className="text-slate-400 leading-relaxed">
                By accessing or using INrVO, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Use of Service</h3>
              <p className="text-slate-400 leading-relaxed">
                You may use INrVO for personal, non-commercial purposes. You agree not to misuse the service or help anyone else do so.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. User Content</h3>
              <p className="text-slate-400 leading-relaxed">
                You retain ownership of any content you create using INrVO. By using our service, you grant us a license to process your content to provide the service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Voice Cloning</h3>
              <p className="text-slate-400 leading-relaxed">
                You may only clone voices that you have legal rights to. You must not clone voices of others without their explicit consent.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Limitation of Liability</h3>
              <p className="text-slate-400 leading-relaxed">
                INrVO is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Changes to Terms</h3>
              <p className="text-slate-400 leading-relaxed">
                We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default TermsPage;
