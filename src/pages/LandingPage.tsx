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

      {/* Top Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 right-0 z-20 p-6 flex items-center gap-3"
      >
        <motion.button
          onClick={() => openAuthModal('signin')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-2 text-slate-300 font-medium text-sm tracking-wide hover:text-white transition-all duration-300"
        >
          Sign In
        </motion.button>
        <motion.button
          onClick={() => openAuthModal('signup')}
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)" }}
          whileTap={{ scale: 0.98 }}
          className="relative px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium text-sm tracking-wide overflow-hidden shadow-lg shadow-blue-500/25 transition-all duration-300"
        >
          Get Started
        </motion.button>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center pt-24 md:pt-32 min-h-screen px-6">
        {/* Main content container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-4xl"
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
            className="mb-8 flex justify-center"
          >
            <motion.img
              src="/logo.png"
              alt="Innrvo"
              className="h-96 md:h-[28rem] lg:h-[32rem] drop-shadow-[0_0_60px_rgba(6,182,212,0.4)]"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-2xl md:text-3xl font-light tracking-wide mb-4 text-slate-300"
          >
            Speak it. Feel it. <span className="text-blue-400">Become it.</span>
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
          >
            Create personalized meditations and affirmations in your own voice.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(LandingPage);
