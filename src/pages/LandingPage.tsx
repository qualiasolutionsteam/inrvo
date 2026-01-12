import { memo } from 'react';
import { motion } from 'framer-motion';
import { Mic, Brain, Heart } from 'lucide-react';
import Background from '../../components/Background';
import Starfield from '../../components/Starfield';
import AuthModal from '../../components/AuthModal';
import { useAuthModal } from '../contexts/modals/AuthModalContext';

const features = [
  { icon: Brain, label: 'AI-Generated Scripts', desc: 'Unique meditations created just for you' },
  { icon: Mic, label: 'Voice Cloning', desc: 'Hear your meditations in any voice' },
  { icon: Heart, label: 'Personalized', desc: 'Tailored to your mood and needs' },
];

const LandingPage = () => {
  const { showAuthModal, authModalMode, openAuthModal, closeAuthModal } = useAuthModal();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layers - same as main app */}
      <Background />
      <Starfield />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        onSuccess={closeAuthModal}
        initialMode={authModalMode}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Main content container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4 flex justify-center"
          >
            <img src="/logo.png" alt="Innrvo" className="h-16 md:h-20 lg:h-24" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-lg md:text-xl font-light tracking-wide mb-4"
          >
            Meditation, made for you
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-slate-500 text-base max-w-md mx-auto mb-10"
          >
            Describe how you're feeling, and AI creates a personalized guided meditation — delivered in your chosen voice.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            {/* Primary CTA - Get Started */}
            <motion.button
              onClick={() => openAuthModal('signup')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-base tracking-wide overflow-hidden shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
            >
              <span className="relative z-10">Get Started Free</span>
            </motion.button>

            {/* Secondary CTA - Sign In */}
            <motion.button
              onClick={() => openAuthModal('signin')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 rounded-full border border-white/10 text-slate-400 font-medium text-base tracking-wide hover:text-white hover:border-white/20 transition-all duration-300"
            >
              Sign In
            </motion.button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
                className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-white text-sm font-medium mb-1">{feature.label}</h3>
                <p className="text-slate-500 text-xs text-center">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Subtle bottom indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <p className="text-slate-600 text-xs tracking-wider">
            No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(LandingPage);
