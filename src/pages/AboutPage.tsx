import React from 'react';
import AppLayout from '../layouts/AppLayout';
import GlassCard from '../../components/GlassCard';

const AboutPage: React.FC = () => {
  return (
    <AppLayout showBackButton backTo="/" className="flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-20 max-w-3xl mx-auto w-full pb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">About</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">About Innrvo</span>
        </h2>

        <GlassCard className="!p-8 !rounded-2xl mt-8 w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-6">
            <p className="text-slate-300 leading-relaxed text-base">
              At Innrvo, we are on a mission to help as many people as possible reconnect with their inner power and consciously create the reality they truly desire.
            </p>

            <p className="text-slate-400 leading-relaxed">
              We believe that transformation begins within. That when you feel something deeply enough, you embody it. And when you embody it, you attract it.
            </p>

            <p className="text-slate-400 leading-relaxed">
              That's why we created Innrvo.
            </p>

            <p className="text-slate-400 leading-relaxed">
              Our platform allows you to generate personalized meditations and affirmations—then hear them spoken in your own voice. Because no voice carries more authority to your subconscious than your own. When you hear yourself affirm your dreams, your worth, your goals, it lands deeper. It feels real. It becomes familiar.
            </p>

            <p className="text-slate-300 leading-relaxed italic">
              And familiarity is powerful.
            </p>

            <p className="text-slate-400 leading-relaxed">
              By repeatedly listening to your curated audios, you begin to integrate your desired reality at a subconscious level. You don't just imagine it anymore—you feel it, you believe it, you become it.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3 pt-4">We believe creation happens through alignment.</h3>
            <p className="text-slate-400 leading-relaxed">
              When your inner vibration matches what you desire, manifestation becomes natural. Effortless. Inevitable.
            </p>

            <p className="text-slate-400 leading-relaxed">
              Innrvo exists to help you consciously claim your power—to move from unconscious patterns to intentional creation, from wishing to embodying, from dreaming to being.
            </p>

            <div className="pt-6 text-center">
              <p className="text-sky-400 font-medium">Your voice.</p>
              <p className="text-sky-400 font-medium">Your reality.</p>
              <p className="text-sky-400 font-medium">Your power.</p>
              <p className="text-white font-semibold mt-4">Welcome to Innrvo.</p>
            </div>
          </div>
        </GlassCard>

        {/* Founder's Perspective */}
        <GlassCard className="!p-8 !rounded-2xl mt-8 w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Founder's Perspective</h3>

            <p className="text-slate-400 leading-relaxed">
              Through my own experience, I've observed a consistent pattern: when we align our thoughts, emotions, and actions with what we want to create, our external reality often begins to reflect that alignment over time.
            </p>

            <p className="text-slate-400 leading-relaxed">
              It's not about having every step figured out. It's about trusting the process and committing to the inner work, questioning our beliefs, becoming aware of our patterns, and consciously choosing how we respond to life. When this internal shift happens, external circumstances tend to change as well.
            </p>

            <p className="text-slate-400 leading-relaxed">
              Through repetition, we learn to stabilize this inner alignment. Maintaining it is where the real work and the real transformation happens.
            </p>

            <p className="text-slate-400 leading-relaxed">
              I've also learned that this isn't a final destination. It's an ongoing process of growth and self awareness.
            </p>

            <p className="text-slate-400 leading-relaxed">
              Many people begin this journey wanting to improve their financial situation or gain more freedom, which is completely natural. But as we go deeper, our priorities often evolve. We start to recognize our connection with others and understand that personal growth is also about contribution, empathy, and collective progress.
            </p>

            <p className="text-slate-300 leading-relaxed">
              Innrvo was created as a practical tool to support this process, helping people build awareness, strengthen intention, and develop a more conscious relationship with themselves and the world around them.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default AboutPage;
