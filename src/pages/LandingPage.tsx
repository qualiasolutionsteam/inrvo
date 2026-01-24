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
      {/* Background layers */}
      <Background />
      <Starfield />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        onSuccess={closeAuthModal}
        initialMode={authModalMode}
      />

      {/* Minimal Top Navigation */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-20 px-6 md:px-12 py-6 flex items-center justify-between"
      >
        {/* Empty left for balance */}
        <div className="w-20" />

        {/* Right side auth buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => openAuthModal('signin')}
            whileHover={{ opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 text-slate-400 text-sm font-medium tracking-wide hover:text-white transition-colors duration-300"
          >
            Sign In
          </motion.button>
          <motion.button
            onClick={() => openAuthModal('signup')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium tracking-wide hover:bg-white/15 hover:border-white/20 transition-all duration-300"
          >
            Get Started
          </motion.button>
        </div>
      </motion.nav>

      {/* Centered Content - True vertical center */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          {/* Logo with breathing glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-12 md:mb-16 flex justify-center"
          >
            <motion.img
              src="/logo.png"
              alt="Innrvo"
              className="h-64 md:h-80 lg:h-96 w-auto object-contain"
              animate={{
                filter: [
                  "drop-shadow(0 0 40px rgba(6,182,212,0.25))",
                  "drop-shadow(0 0 70px rgba(6,182,212,0.4))",
                  "drop-shadow(0 0 40px rgba(6,182,212,0.25))"
                ]
              }}
              transition={{
                filter: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          </motion.div>

          {/* Tagline - refined typography */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-2xl md:text-3xl lg:text-4xl font-light tracking-wide text-white/90 mb-6"
          >
            Speak it. Feel it.{' '}
            <span className="text-sky-400">Become it.</span>
          </motion.h1>

          {/* Description - subtle and refined */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-slate-400 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-12"
          >
            Create personalized meditations and affirmations in your own voice.
          </motion.p>

          {/* CTA Button - premium glass style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <motion.button
              onClick={() => openAuthModal('signup')}
              whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(6, 182, 212, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-medium tracking-wide overflow-hidden shadow-lg shadow-sky-500/20 transition-all duration-500"
            >
              <span className="relative z-10">Start Your Journey</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Subtle scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-transparent via-slate-500 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default memo(LandingPage);
