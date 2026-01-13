import { memo } from 'react';
import { motion } from 'framer-motion';
import Background from '../../components/Background';
import Starfield from '../../components/Starfield';
import AuthModal from '../../components/AuthModal';
import { useAuthModal } from '../contexts/modals/AuthModalContext';

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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Main content container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl -mt-16"
        >
          {/* Logo/Brand with floating animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -8, 0]
            }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="mb-6 flex justify-center"
          >
            <motion.img
              src="/logo.png"
              alt="Innrvo"
              className="h-48 md:h-60 lg:h-72 drop-shadow-[0_0_40px_rgba(6,182,212,0.3)]"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </motion.div>

          {/* Subtitle with gradient text */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl md:text-2xl font-light tracking-wide mb-3 bg-gradient-to-r from-slate-300 via-cyan-200 to-slate-300 bg-clip-text text-transparent"
          >
            Meditation, made for you
          </motion.p>

          {/* Description with stagger effect */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="text-slate-400 text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Describe how you're feeling, and AI creates a personalized guided meditation — delivered in your chosen voice.
          </motion.p>

          {/* CTA Buttons with enhanced animations */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* Primary CTA - Get Started */}
            <motion.button
              onClick={() => openAuthModal('signup')}
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(6, 182, 212, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              className="relative px-10 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium text-lg tracking-wide overflow-hidden shadow-lg shadow-cyan-500/25 transition-all duration-300"
            >
              <motion.span
                className="relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Get Started Free
              </motion.span>
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.button>

            {/* Secondary CTA - Sign In */}
            <motion.button
              onClick={() => openAuthModal('signin')}
              whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-4 rounded-full border border-white/10 text-slate-300 font-medium text-lg tracking-wide hover:text-white transition-all duration-300"
            >
              Sign In
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Subtle bottom indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
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
