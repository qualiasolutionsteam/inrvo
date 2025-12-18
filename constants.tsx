import React from 'react';
import { ScriptTemplate, VoiceProfile } from './types';

export interface TemplateSubgroup {
  id: string;
  name: string;
  description: string;
  templates: ScriptTemplate[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: 'sparkle' | 'story';
  subgroups: TemplateSubgroup[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'manifesting',
    name: 'Manifesting',
    description: 'Attract abundance, success, and your deepest desires',
    icon: 'sparkle',
    templates: [
      {
        id: 'abundance',
        title: 'Abundance Flow',
        description: 'Open yourself to unlimited wealth and prosperity.',
        prompt: 'Create a powerful 5-minute manifesting meditation for attracting financial abundance. Use visualization of golden light flowing through the body, affirmations of worthiness, and imagery of money flowing effortlessly. Include gratitude for current blessings and certainty that more is coming.'
      },
      {
        id: 'dream-life',
        title: 'Dream Life Vision',
        description: 'Visualize and attract your ideal life in vivid detail.',
        prompt: 'Write an immersive manifesting meditation where the listener walks through their perfect day in their dream life. Include waking up in their ideal home, doing work they love, surrounded by loving relationships, feeling complete health and vitality. Make it sensory-rich and emotionally powerful.'
      },
      {
        id: 'self-love',
        title: 'Self-Love & Confidence',
        description: 'Manifest unshakeable confidence and deep self-worth.',
        prompt: 'Create a transformative self-love meditation that helps the listener see themselves through eyes of unconditional love. Include mirror visualization, healing inner child work, and powerful affirmations of worthiness. End with feeling radiantly confident and magnetically attractive.'
      },
      {
        id: 'success-mindset',
        title: 'Success Mindset',
        description: 'Reprogram your mind for unstoppable success.',
        prompt: 'Write a powerful success manifesting meditation. Include visualization of achieving major goals, standing ovations, celebrating wins, and feeling deeply fulfilled. Use anchoring techniques to lock in the feeling of success. Include affirmations about being destined for greatness.'
      }
    ]
  },
  {
    id: 'stories',
    name: 'Stories',
    description: 'Immersive narrative journeys for relaxation and escape',
    icon: 'story',
    templates: [
      {
        id: 'enchanted-forest',
        title: 'The Enchanted Forest',
        description: 'Wander through a magical woodland filled with wonder.',
        prompt: 'Write an immersive bedtime story about discovering a hidden enchanted forest. Include glowing mushrooms, friendly woodland creatures, a wise ancient oak tree that shares life wisdom, and a peaceful clearing where the listener can rest. Make it dreamy, slow-paced, and deeply calming.'
      },
      {
        id: 'ocean-voyage',
        title: 'Midnight Ocean Voyage',
        description: 'Sail across calm seas under a blanket of stars.',
        prompt: 'Create a sleep story about a peaceful nighttime boat journey across a calm, moonlit ocean. Include the gentle rocking of the boat, the sound of waves, bioluminescent creatures glowing in the water, and constellations telling ancient stories overhead. End with drifting into peaceful sleep.'
      },
      {
        id: 'mountain-retreat',
        title: 'Mountain Sanctuary',
        description: 'Find peace in a cozy cabin high in the misty mountains.',
        prompt: 'Write a relaxing story about discovering a hidden cabin in the mountains. Include the journey up through misty forests, arriving at a warm cabin with a crackling fireplace, hot tea, soft blankets, and snow gently falling outside. Describe the deep silence and peace of being far from the world.'
      },
      {
        id: 'space-journey',
        title: 'Journey Through the Stars',
        description: 'Float weightlessly through the cosmos on a peaceful voyage.',
        prompt: 'Create a sleep story about floating peacefully through space. Include passing colorful nebulas, watching distant galaxies spin, feeling completely weightless and free, and being held safely by the universe. Make it awe-inspiring yet deeply calming, emphasizing the vastness and peace of space.'
      }
    ]
  }
];

// Flattened templates for backwards compatibility
export const TEMPLATES: ScriptTemplate[] = TEMPLATE_CATEGORIES.flatMap(cat => cat.templates);

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: 'v1', name: 'Zephyr', provider: 'Gemini', voiceName: 'Zephyr', description: 'Deep, resonant, and incredibly calming.' },
  { id: 'v2', name: 'Kore', provider: 'Gemini', voiceName: 'Kore', description: 'Bright, nurturing, and clear.' },
  { id: 'v3', name: 'Puck', provider: 'Gemini', voiceName: 'Puck', description: 'Playful, storytelling, and energetic.' },
  { id: 'v4', name: 'Fenrir', provider: 'Gemini', voiceName: 'Fenrir', description: 'Steady, grounding, and ancient.' }
];

export const ICONS = {
  Logo: ({ className = "h-8" }: { className?: string }) => (
    <svg viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]`}>
      <text x="0" y="38" className="font-sans" fill="currentColor" style={{ fontWeight: 200, fontSize: '32px', letterSpacing: '0.1em' }}>INR</text>
      <text x="75" y="38" className="font-sans" fill="currentColor" style={{ fontWeight: 800, fontSize: '32px' }}>V</text>
      <circle cx="115" cy="30" r="14" stroke="currentColor" strokeWidth="4" />
      <path d="M112 24C115 24 118 27 118 30C118 33 115 36 112 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M108 20C113 20 118 25 118 30C118 35 113 40 108 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // Duotone Sparkle with gradient
  Sparkle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path fill="url(#sparkleGrad)" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path fill="url(#sparkleGrad)" opacity="0.5" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.455L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.455z" />
    </svg>
  ),

  // Duotone Microphone with gradient
  Microphone: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="micGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <path fill="url(#micGrad)" fillRule="evenodd" d="M12 1.5a3 3 0 00-3 3v8.25a3 3 0 106 0V4.5a3 3 0 00-3-3z" clipRule="evenodd" />
      <path fill="currentColor" opacity="0.4" fillRule="evenodd" d="M6.75 10.5a.75.75 0 01.75.75 4.5 4.5 0 109 0 .75.75 0 011.5 0 6 6 0 01-5.25 5.954v1.546h2.25a.75.75 0 010 1.5h-6a.75.75 0 010-1.5H11v-1.546A6 6 0 015.25 11.25a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  ),

  // Duotone Speaker with sound waves
  Speaker: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <path fill="currentColor" d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
      <path fill="currentColor" opacity="0.35" d="M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path fill="currentColor" opacity="0.55" d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
  ),

  // Duotone Play with gradient
  Player: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path fill="url(#playGrad)" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),

  // Pause icon (filled)
  Pause: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <path fill="currentColor" fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm10.5 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" strokeWidth="2" stroke="currentColor" />
    </svg>
  ),

  // Neural icon for loading and tech themes
  Neural: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="2.5" fill="url(#neuralGrad)" />
      <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="6" cy="16" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="16" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="3" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <path stroke="url(#neuralGrad)" strokeWidth="0.75" opacity="0.5" fill="none" d="M12 12L6 8M12 12L18 8M12 12L6 16M12 12L18 16M6 8L3 12M18 8L21 12M6 16L3 12M18 16L21 12" />
    </svg>
  ),

  // Settings/Gear icon (duotone)
  Settings: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4" />
      <path fill="currentColor" fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.034a.5.5 0 01-.288.377l-.607.25a.5.5 0 01-.471-.044L6.2 4.636a1.875 1.875 0 00-2.416.306l-.758.758a1.875 1.875 0 00-.306 2.417l.981 1.483a.5.5 0 01.044.471l-.25.607a.5.5 0 01-.377.288l-1.217.178a1.875 1.875 0 00-1.567 1.85v1.072c0 .917.663 1.699 1.567 1.85l1.217.178a.5.5 0 01.377.288l.25.607a.5.5 0 01-.044.471l-.981 1.483a1.875 1.875 0 00.306 2.417l.758.758a1.875 1.875 0 002.417.306l1.483-.981a.5.5 0 01.471-.044l.607.25a.5.5 0 01.288.377l.178 1.217a1.875 1.875 0 001.85 1.567h1.072c.917 0 1.699-.663 1.85-1.567l.178-1.217a.5.5 0 01.288-.377l.607-.25a.5.5 0 01.471.044l1.483.981a1.875 1.875 0 002.417-.306l.758-.758a1.875 1.875 0 00.306-2.417l-.981-1.483a.5.5 0 01-.044-.471l.25-.607a.5.5 0 01.377-.288l1.217-.178a1.875 1.875 0 001.567-1.85v-1.072c0-.917-.663-1.699-1.567-1.85l-1.217-.178a.5.5 0 01-.377-.288l-.25-.607a.5.5 0 01.044-.471l.981-1.483a1.875 1.875 0 00-.306-2.417l-.758-.758a1.875 1.875 0 00-2.417-.306l-1.483.981a.5.5 0 01-.471.044l-.607-.25a.5.5 0 01-.288-.377l-.178-1.217a1.875 1.875 0 00-1.85-1.567h-1.072zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  ),

  // Back Arrow (filled)
  ArrowBack: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
    </svg>
  ),

  // Skip Previous
  SkipPrev: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.63l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
    </svg>
  ),

  // Skip Next
  SkipNext: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d="M14.805 5.56c-1.25-.713-2.805.19-2.805 1.629v2.34L5.055 5.56C3.805 4.846 2.25 5.748 2.25 7.188v9.124c0 1.44 1.555 2.342 2.805 1.628L12 13.97v2.34c0 1.44 1.555 2.343 2.805 1.63l7.108-4.062c1.26-.72 1.26-2.536 0-3.256L14.805 5.56z" />
    </svg>
  ),

  // Close/X icon
  Close: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  ),

  // Menu/Hamburger icon
  Menu: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
  ),

  // Waveform icon for voice/audio
  Waveform: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path fill="url(#waveGrad)" d="M3 12a1 1 0 011-1h.5a1 1 0 011 1v0a1 1 0 01-1 1H4a1 1 0 01-1-1v0zM6.5 9a1 1 0 011-1H8a1 1 0 011 1v6a1 1 0 01-1 1h-.5a1 1 0 01-1-1V9zM11 5a1 1 0 011-1h.5a1 1 0 011 1v14a1 1 0 01-1 1H12a1 1 0 01-1-1V5zM15.5 7a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1h-.5a1 1 0 01-1-1V7zM20 10a1 1 0 011-1h.5a1 1 0 011 1v4a1 1 0 01-1 1H21a1 1 0 01-1-1v-4z" />
    </svg>
  ),

  // Book/Story icon
  Book: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path fill="url(#bookGrad)" d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533z" />
      <path fill="url(#bookGrad)" opacity="0.6" d="M12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  )
};
