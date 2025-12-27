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
  icon: 'sparkle' | 'story' | 'affirmation' | 'hypnosis';
  color: string; // Tailwind color class for category theming
  subgroups: TemplateSubgroup[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Guided meditations for transformation and inner peace',
    icon: 'sparkle',
    color: 'cyan',
    subgroups: [
      {
        id: 'happiness',
        name: 'Happiness',
        description: 'Cultivate joy, gratitude, and inner peace',
        templates: [
          {
            id: 'self-love',
            title: 'Self-Love & Confidence',
            description: 'Manifest unshakeable confidence and deep self-worth.',
            prompt: 'Create a transformative self-love meditation that helps the listener see themselves through eyes of unconditional love. Include mirror visualization, healing inner child work, and powerful affirmations of worthiness. End with feeling radiantly confident and magnetically attractive.'
          },
          {
            id: 'gratitude',
            title: 'Gratitude Flow',
            description: 'Open your heart to appreciation and abundance.',
            prompt: 'Write a heartfelt gratitude meditation. Guide the listener to reflect on blessings in their life - relationships, health, simple pleasures. Include visualization of gratitude as warm golden light filling the heart. End with feeling deeply thankful and at peace.'
          },
          {
            id: 'inner-joy',
            title: 'Awakening Inner Joy',
            description: 'Reconnect with your natural state of happiness.',
            prompt: 'Create a meditation to awaken the listener\'s inner joy. Guide them to release stress and reconnect with childlike wonder. Include visualization of a golden sun in the heart center radiating warmth, and memories of pure happiness. End with feeling light, playful, and genuinely happy.'
          }
        ]
      },
      {
        id: 'money',
        name: 'Money & Abundance',
        description: 'Attract wealth, prosperity, and financial freedom',
        templates: [
          {
            id: 'abundance',
            title: 'Abundance Flow',
            description: 'Open yourself to unlimited wealth and prosperity.',
            prompt: 'Create a powerful 5-minute manifesting meditation for attracting financial abundance. Use visualization of golden light flowing through the body, affirmations of worthiness, and imagery of money flowing effortlessly. Include gratitude for current blessings and certainty that more is coming.'
          },
          {
            id: 'success-mindset',
            title: 'Success Mindset',
            description: 'Reprogram your mind for unstoppable success.',
            prompt: 'Write a powerful success manifesting meditation. Include visualization of achieving major goals, standing ovations, celebrating wins, and feeling deeply fulfilled. Use anchoring techniques to lock in the feeling of success. Include affirmations about being destined for greatness.'
          },
          {
            id: 'money-magnet',
            title: 'Money Magnet',
            description: 'Become a magnet for financial opportunities.',
            prompt: 'Create a meditation that transforms limiting beliefs about money. Guide the listener to release scarcity mindset and embrace abundance consciousness. Include visualization of being surrounded by opportunities, doors opening, and wealth flowing naturally toward them.'
          }
        ]
      },
      {
        id: 'health',
        name: 'Health & Vitality',
        description: 'Heal your body and cultivate radiant wellness',
        templates: [
          {
            id: 'healing-light',
            title: 'Healing Light',
            description: 'Channel healing energy throughout your body.',
            prompt: 'Create a healing meditation where warm, golden healing light enters through the crown and flows through every cell of the body. Focus on releasing tension, pain, and illness. Include visualization of cells regenerating and the body returning to perfect health. End feeling vibrant and whole.'
          },
          {
            id: 'dream-life',
            title: 'Dream Life Vision',
            description: 'Visualize your ideal life in vivid detail.',
            prompt: 'Write an immersive manifesting meditation where the listener walks through their perfect day in their dream life. Include waking up in their ideal home, doing work they love, surrounded by loving relationships, feeling complete health and vitality. Make it sensory-rich and emotionally powerful.'
          },
          {
            id: 'immune-boost',
            title: 'Immune System Boost',
            description: 'Strengthen your body\'s natural defenses.',
            prompt: 'Create a meditation focused on boosting the immune system. Guide the listener to visualize their white blood cells as tiny warriors of light, patrolling and protecting the body. Include affirmations of health and vitality, ending with feeling strong, protected, and resilient.'
          }
        ]
      },
      {
        id: 'sleep',
        name: 'Sleep & Relaxation',
        description: 'Deep relaxation for restful, restorative sleep',
        templates: [
          {
            id: 'deep-sleep',
            title: 'Deep Sleep Journey',
            description: 'Drift into the deepest, most restful sleep.',
            prompt: 'Create a sleep meditation that guides the listener into deep, restorative rest. Include progressive relaxation from toes to head, visualization of sinking into a soft cloud, and gentle affirmations about sleeping peacefully through the night. Use a slow, hypnotic pace.'
          },
          {
            id: 'release-day',
            title: 'Release the Day',
            description: 'Let go of the day\'s stress and worries.',
            prompt: 'Write a meditation for releasing the day\'s tensions. Guide the listener to mentally review and release each worry, visualizing them floating away like leaves on a stream. Include body scan relaxation and gentle transition into peaceful sleep.'
          }
        ]
      },
      {
        id: 'anxiety',
        name: 'Anxiety & Stress Relief',
        description: 'Calm the mind and soothe the nervous system',
        templates: [
          {
            id: 'calm-storm',
            title: 'Calm Within the Storm',
            description: 'Find your center of peace amid chaos.',
            prompt: 'Create a meditation for anxiety relief. Guide the listener to find their inner sanctuary of calm, using breath awareness and grounding techniques. Include visualization of being in the eye of a storm - peaceful and still while chaos swirls outside. End with feeling centered and capable.'
          },
          {
            id: 'letting-go',
            title: 'Letting Go of Worry',
            description: 'Release anxious thoughts and find peace.',
            prompt: 'Write a meditation focused on releasing worry and anxiety. Use the metaphor of placing each worry in a balloon and watching them float away into the sky. Include grounding exercises and affirmations of safety and trust in the process of life.'
          }
        ]
      }
    ]
  },
  {
    id: 'affirmations',
    name: 'Affirmations',
    description: 'Powerful positive statements to reprogram your mind',
    icon: 'affirmation',
    color: 'amber',
    subgroups: [
      {
        id: 'confidence',
        name: 'Confidence & Self-Worth',
        description: 'Build unshakeable confidence and self-belief',
        templates: [
          {
            id: 'i-am-worthy',
            title: 'I Am Worthy',
            description: 'Affirmations for deep self-worth and value.',
            prompt: 'Create a powerful affirmation script focused on self-worth. Include statements like "I am worthy of love and respect", "I deserve all the good things life has to offer", and "My worth is not determined by others." Use a confident, empowering tone with pauses between affirmations for integration.'
          },
          {
            id: 'unstoppable-confidence',
            title: 'Unstoppable Confidence',
            description: 'Feel confident in any situation.',
            prompt: 'Write confidence-building affirmations that create unshakeable self-belief. Include "I am confident in who I am", "I trust my abilities completely", "I radiate confidence and attract success." Use a strong, assertive tone with breathing pauses between statements.'
          },
          {
            id: 'self-acceptance',
            title: 'Complete Self-Acceptance',
            description: 'Embrace and love yourself fully.',
            prompt: 'Create affirmations for radical self-acceptance. Include "I accept myself exactly as I am", "I love and approve of myself", "My imperfections make me unique and beautiful." Guide the listener to feel complete acceptance and compassion for themselves.'
          }
        ]
      },
      {
        id: 'abundance-aff',
        name: 'Abundance & Prosperity',
        description: 'Attract wealth, success, and opportunities',
        templates: [
          {
            id: 'money-flows',
            title: 'Money Flows to Me',
            description: 'Attract financial abundance effortlessly.',
            prompt: 'Create wealth affirmations that reprogram the subconscious for abundance. Include "Money flows to me easily and effortlessly", "I am a magnet for wealth", "Abundance is my natural state." Use a calm yet confident tone with pauses for the affirmations to sink in.'
          },
          {
            id: 'success-attracts',
            title: 'I Attract Success',
            description: 'Draw success and opportunities to you.',
            prompt: 'Write success-focused affirmations. Include "I attract success in everything I do", "Opportunities come to me naturally", "I am destined for greatness." Create a powerful, motivating tone that builds momentum and belief.'
          },
          {
            id: 'abundant-life',
            title: 'Living an Abundant Life',
            description: 'Embody abundance in all areas of life.',
            prompt: 'Create holistic abundance affirmations covering wealth, health, love, and happiness. Include "I live an abundantly blessed life", "Everything I need comes to me at the perfect time", "I am grateful for the abundance that surrounds me."'
          }
        ]
      },
      {
        id: 'health-aff',
        name: 'Health & Vitality',
        description: 'Program your mind for optimal health',
        templates: [
          {
            id: 'perfect-health',
            title: 'Perfect Health',
            description: 'Affirm vibrant health and wellness.',
            prompt: 'Create health affirmations that support physical wellbeing. Include "My body is healthy, strong, and vital", "Every cell in my body radiates health", "I am grateful for my perfect health." Use a calm, nurturing tone that promotes healing.'
          },
          {
            id: 'energy-vitality',
            title: 'Boundless Energy',
            description: 'Feel energized and alive.',
            prompt: 'Write energy and vitality affirmations. Include "I have unlimited energy", "My body is strong and capable", "I wake up each day feeling refreshed and alive." Create an uplifting, energizing tone.'
          }
        ]
      },
      {
        id: 'love-aff',
        name: 'Love & Relationships',
        description: 'Attract love and nurture relationships',
        templates: [
          {
            id: 'attract-love',
            title: 'Attracting True Love',
            description: 'Open your heart to romantic love.',
            prompt: 'Create affirmations for attracting romantic love. Include "I am ready to receive deep, lasting love", "My soulmate is drawn to me", "I deserve a loving, supportive partner." Use a warm, open-hearted tone that radiates love energy.'
          },
          {
            id: 'self-love-aff',
            title: 'Deep Self-Love',
            description: 'Cultivate unconditional self-love.',
            prompt: 'Write self-love affirmations that build a foundation of inner love. Include "I love myself unconditionally", "I treat myself with kindness and compassion", "I am my own best friend." Create a gentle, nurturing tone.'
          }
        ]
      },
      {
        id: 'morning-aff',
        name: 'Morning Power',
        description: 'Start your day with intention and power',
        templates: [
          {
            id: 'morning-power',
            title: 'Morning Power Routine',
            description: 'Energize and set intentions for the day.',
            prompt: 'Create morning affirmations to start the day powerfully. Include "Today is going to be an amazing day", "I am focused, energized, and ready", "Great things are coming to me today." Use an energizing, motivating tone to kickstart the day.'
          },
          {
            id: 'gratitude-morning',
            title: 'Morning Gratitude',
            description: 'Begin your day in a state of thankfulness.',
            prompt: 'Write morning gratitude affirmations. Include "I am grateful for this new day", "I appreciate all the blessings in my life", "Today I choose to see the good in everything." Create a warm, appreciative tone.'
          }
        ]
      }
    ]
  },
  {
    id: 'hypnosis',
    name: 'Self-Hypnosis',
    description: 'Deep subconscious reprogramming for lasting change',
    icon: 'hypnosis',
    color: 'violet',
    subgroups: [
      {
        id: 'weight-loss',
        name: 'Weight Loss',
        description: 'Reprogram your relationship with food and body',
        templates: [
          {
            id: 'eat-mindfully',
            title: 'Mindful Eating',
            description: 'Transform your relationship with food.',
            prompt: 'Create a self-hypnosis script for mindful eating. Include deep relaxation induction, then suggestions for eating slowly, savoring each bite, recognizing true hunger vs emotional eating, and stopping when satisfied. Use hypnotic language patterns and embed suggestions in the subconscious.'
          },
          {
            id: 'love-exercise',
            title: 'Love Exercise',
            description: 'Program your mind to enjoy movement.',
            prompt: 'Write a hypnosis script for developing a love of exercise. Include relaxation, then suggestions for feeling energized by movement, looking forward to workouts, and seeing exercise as self-care. Use future pacing and visualization of an active, fit lifestyle.'
          },
          {
            id: 'ideal-body',
            title: 'Visualize Your Ideal Body',
            description: 'See and become your healthiest self.',
            prompt: 'Create a hypnosis script for weight loss visualization. Guide the listener into deep relaxation, then have them vividly imagine their ideal healthy body, how it feels to move in that body, the confidence they carry. Anchor these feelings and suggest they are manifesting this reality.'
          }
        ]
      },
      {
        id: 'quit-smoking',
        name: 'Quit Smoking',
        description: 'Break free from nicotine addiction',
        templates: [
          {
            id: 'smoke-free',
            title: 'Becoming Smoke-Free',
            description: 'Release the smoking habit for good.',
            prompt: 'Create a hypnosis script for quitting smoking. Include deep relaxation, then powerful suggestions for feeling disgusted by cigarettes, breathing freely, and feeling proud as a non-smoker. Use aversion techniques and positive visualization of a healthy, smoke-free life.'
          },
          {
            id: 'freedom-from-cravings',
            title: 'Freedom from Cravings',
            description: 'Eliminate nicotine cravings.',
            prompt: 'Write a hypnosis script focused on eliminating cravings. Guide into deep trance, then suggest that cravings are simply signals to breathe deeply, that each passing craving makes you stronger, and that you are free from the need for nicotine.'
          }
        ]
      },
      {
        id: 'fear-phobia',
        name: 'Fears & Phobias',
        description: 'Overcome deep-seated fears',
        templates: [
          {
            id: 'fear-release',
            title: 'Release Fear',
            description: 'Let go of limiting fears and anxiety.',
            prompt: 'Create a general fear-release hypnosis script. Guide into deep relaxation, then use dissociation techniques to view fear from a safe distance. Include suggestions for feeling safe, capable, and confident. Reframe the fear as excitement and install feelings of courage and calm.'
          },
          {
            id: 'public-speaking',
            title: 'Confident Public Speaking',
            description: 'Speak with ease and confidence.',
            prompt: 'Write a hypnosis script for overcoming fear of public speaking. Include relaxation, then visualization of speaking confidently to audiences, enjoying the spotlight, and receiving positive responses. Anchor confidence to the act of speaking publicly.'
          }
        ]
      },
      {
        id: 'sleep-hyp',
        name: 'Deep Sleep',
        description: 'Hypnotic induction for profound rest',
        templates: [
          {
            id: 'deep-sleep-hyp',
            title: 'Hypnotic Sleep Journey',
            description: 'Fall into the deepest, most restorative sleep.',
            prompt: 'Create a sleep hypnosis script with progressive relaxation. Include counting down from 10 to 1 while descending a beautiful staircase, each step bringing deeper relaxation. Suggest sleeping through the night, waking refreshed, and having pleasant dreams.'
          },
          {
            id: 'insomnia-cure',
            title: 'Cure Insomnia',
            description: 'Reprogram for natural, easy sleep.',
            prompt: 'Write a hypnosis script for chronic insomnia. Include suggestions that the bed is a trigger for deep sleep, that the mind quiets naturally at night, and that sleep comes easily. Use hypnotic compounding and post-hypnotic suggestions for future nights.'
          }
        ]
      },
      {
        id: 'confidence-hyp',
        name: 'Confidence & Success',
        description: 'Unlock your full potential',
        templates: [
          {
            id: 'unstoppable-you',
            title: 'Unstoppable You',
            description: 'Install unshakeable confidence.',
            prompt: 'Create a confidence-building hypnosis script. Guide into trance, then access memories of past confidence, amplify those feelings, and install them as the default state. Include suggestions for radiating confidence, handling any situation, and attracting success naturally.'
          },
          {
            id: 'millionaire-mind',
            title: 'Millionaire Mindset',
            description: 'Reprogram your brain for wealth.',
            prompt: 'Write a hypnosis script for developing a millionaire mindset. Include suggestions for seeing opportunities everywhere, making smart decisions, taking inspired action, and believing you deserve wealth. Use embedded commands and visualization of financial success.'
          }
        ]
      }
    ]
  },
  {
    id: 'stories',
    name: 'Sleep Stories',
    description: 'Immersive narrative journeys for relaxation and escape',
    icon: 'story',
    color: 'pink',
    subgroups: [
      {
        id: 'bedtime',
        name: 'Bedtime',
        description: 'Drift into peaceful sleep with calming tales',
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
            id: 'cloud-village',
            title: 'Village in the Clouds',
            description: 'Discover a peaceful village floating among the clouds.',
            prompt: 'Write a bedtime story about floating up to a magical village in the clouds. Include soft, cottony ground, gentle cloud beings who tend to dreams, a cozy cloud cottage where the listener can rest, and the distant twinkling of stars above. Make it ethereal and deeply peaceful.'
          }
        ]
      },
      {
        id: 'afternoon',
        name: 'Afternoon',
        description: 'Relaxing escapes for daytime unwinding',
        templates: [
          {
            id: 'mountain-retreat',
            title: 'Mountain Sanctuary',
            description: 'Find peace in a cozy cabin high in the misty mountains.',
            prompt: 'Write a relaxing story about discovering a hidden cabin in the mountains. Include the journey up through misty forests, arriving at a warm cabin with a crackling fireplace, hot tea, soft blankets, and snow gently falling outside. Describe the deep silence and peace of being far from the world.'
          },
          {
            id: 'garden-meditation',
            title: 'Secret Garden',
            description: 'Discover a hidden garden of tranquility.',
            prompt: 'Create a peaceful story about finding a secret walled garden. Include wandering through fragrant flowers, sitting by a gentle fountain, watching butterflies dance, and feeling the warm sun on your skin. Make it sensory-rich and deeply calming for afternoon relaxation.'
          },
          {
            id: 'library-rain',
            title: 'Rainy Day Library',
            description: 'Cozy up in a grand library while rain patters outside.',
            prompt: 'Write a relaxing story about spending an afternoon in a grand old library. Include tall bookshelves, comfortable leather chairs, the smell of old books, and rain gently tapping against tall windows. The listener finds a perfect book and loses themselves in peaceful reading.'
          }
        ]
      },
      {
        id: 'morning',
        name: 'Morning',
        description: 'Energizing stories to start your day with intention',
        templates: [
          {
            id: 'space-journey',
            title: 'Journey Through the Stars',
            description: 'Float weightlessly through the cosmos.',
            prompt: 'Create a story about floating peacefully through space. Include passing colorful nebulas, watching distant galaxies spin, feeling completely weightless and free, and being held safely by the universe. Make it awe-inspiring yet grounding, perfect for starting the day with wonder.'
          },
          {
            id: 'sunrise-beach',
            title: 'Sunrise Beach Walk',
            description: 'Greet the day on a peaceful shoreline.',
            prompt: 'Write an uplifting morning story about walking along a beautiful beach at sunrise. Include the soft sand beneath your feet, gentle waves, seabirds calling, and the golden sun rising over the horizon. Fill the listener with hope, energy, and gratitude for the new day.'
          }
        ]
      },
      {
        id: 'children',
        name: 'Children\'s Stories',
        description: 'Magical tales for young listeners',
        templates: [
          {
            id: 'teddy-adventure',
            title: 'Teddy\'s Big Adventure',
            description: 'Join Teddy Bear on a magical nighttime journey.',
            prompt: 'Write a children\'s bedtime story about a teddy bear who comes alive at night and goes on adventures. Include visiting the moon, making friends with friendly stars, and returning safely before morning. Keep it warm, safe, and full of wonder. Perfect for ages 3-8.'
          },
          {
            id: 'dream-train',
            title: 'The Dream Train',
            description: 'Take a magical train ride to the land of dreams.',
            prompt: 'Create a children\'s sleep story about a magical train that takes sleepy children to dreamland. Include colorful carriages, friendly conductors, passing through cotton candy clouds, and arriving at a wonderful land of happy dreams. Gentle and reassuring for young listeners.'
          },
          {
            id: 'underwater-kingdom',
            title: 'The Underwater Kingdom',
            description: 'Discover a magical world beneath the waves.',
            prompt: 'Write a children\'s story about visiting a friendly underwater kingdom. Include meeting kind mermaids, playing with dolphins, exploring coral castles, and attending a bubble party. Make it magical, safe, and ending with the child floating back to their cozy bed.'
          }
        ]
      }
    ]
  }
];

// Flattened templates for backwards compatibility
export const TEMPLATES: ScriptTemplate[] = TEMPLATE_CATEGORIES.flatMap(cat =>
  cat.subgroups.flatMap(subgroup => subgroup.templates)
);

// Default voices removed - users must clone their own voices
// Browser voices are now available as FREE alternatives
// This ensures personalized experience and reduces API costs
export const VOICE_PROFILES: VoiceProfile[] = [];

// Browser voice categories for UI grouping
export const BROWSER_VOICE_CATEGORIES = [
  { id: 'en-US', name: 'English (US)', langPrefix: 'en-US' },
  { id: 'en-GB', name: 'English (UK)', langPrefix: 'en-GB' },
  { id: 'en-AU', name: 'English (Australian)', langPrefix: 'en-AU' },
  { id: 'en', name: 'English (Other)', langPrefix: 'en' },
] as const;

export interface BackgroundTrack {
  id: string;
  name: string;
  description: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental' | 'lofi' | 'classical';
  audioUrl?: string; // URL to audio file for playback
  previewUrl?: string; // For future use
}

// Free royalty-free audio for background music
// Real meditation music from Archive.org (public domain, CORS-enabled)
// Source: https://archive.org/details/meditation-music and related collections
export const BACKGROUND_TRACKS: BackgroundTrack[] = [
  // No Music Option
  { id: 'none', name: 'No Music', description: 'Voice only, no background', category: 'ambient' },

  // Japanese/Zen - Peaceful Asian-inspired tracks
  { id: 'japanese-garden', name: 'Japanese Garden', description: 'Peaceful Japanese garden music', category: 'nature', audioUrl: 'https://archive.org/download/meditation-music/Japanese%20Garden%20Relaxing%20Music.mp3' },
  { id: 'zen-spirit', name: 'Zen Spirit', description: 'Japanese relaxation sounds', category: 'nature', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Zen%20Spirit%20Japanese%20Music%20Relaxing%20Songs%20and%20Sounds%20of%20Nature.mp3' },
  { id: 'samurai-relax', name: 'Samurai Meditation', description: 'Deep Japanese meditation', category: 'nature', audioUrl: 'https://archive.org/download/meditation-music/Samurai%20Relax%20Meditation%20Music.mp3' },
  { id: 'relaxing-japanese', name: 'Relaxing Japanese', description: 'Calming Japanese melodies', category: 'nature', audioUrl: 'https://archive.org/download/meditation-music/Relaxing%20Japanese%20Music.mp3' },

  // Flute & Nature - Wind instruments with nature sounds
  { id: 'native-flute', name: 'Native Flute & Rain', description: 'Native American flutes with rain', category: 'nature', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Rain%20and%20Native%20American%20Flutes%20-%20Relaxing%20Music.mp3' },
  { id: 'meditation-music', name: 'Deep Meditation', description: 'Calming meditation music', category: 'ambient', audioUrl: 'https://archive.org/download/meditation-music/Meditation%20Music.mp3' },
  { id: 'morning-forest', name: 'Morning Forest', description: '8 hours of nature sounds', category: 'nature', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Morning%20in%20the%20Forest%208%20HOURS%20of%20Relaxing%20Nature%20Music%20-%20Meditation%20Yoga%20Calming%20Relaxation.mp3' },

  // Spiritual & Healing - Buddhist and healing frequencies
  { id: 'buddhist', name: 'Buddhist Meditation', description: 'Positive energy music', category: 'ambient', audioUrl: 'https://archive.org/download/meditation-music/Buddhist%20Meditation%20Music%20for%20Positive%20Energy.mp3' },
  { id: 'pure-energy', name: 'Pure Positive Energy', description: 'Healing vibration music', category: 'ambient', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Pure%20Clean%20Positive%20Energy%20Vibration%20Meditation%20Music%20Healing%20Music%20Relax%20Mind%20Body%20Soul.mp3' },
  { id: 'cleanse-energy', name: 'Energy Cleanse', description: 'Cleanse negative energy', category: 'ambient', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Music%20to%20Cleanse%20of%20Negative%20Energy%20at%20Home%20Space.mp3' },

  // Yoga & Relaxation - For yoga and deep relaxation
  { id: 'yoga-music', name: 'Yoga & Relaxation', description: 'Calming music for yoga', category: 'instrumental', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Yoga%20Music%20Relaxing%20Music%20Calming%20Music%20Stress%20Relief%20Music%20Peaceful%20Music%20Relax%20%E2%9C%BF2658C.mp3' },
  { id: 'spa-relaxing', name: 'Spa Meditation', description: 'Relaxing spa instrumental', category: 'instrumental', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Relaxing%20Spa%20Music%20Calming%20Music%20Relaxation%20Music%20Meditation%20Music%20Instrumental%20Music%20%E2%98%AF689.mp3' },
  { id: 'evening-meditation', name: 'Evening Meditation', description: '3 hours yoga & massage music', category: 'instrumental', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/3%20HOURS%20Relaxing%20Music%20Evening%20Meditation%20Background%20for%20Yoga%20Massage%20Spa.mp3' },

  // Focus & Concentration - For work and study
  { id: 'concentration', name: 'Focus & Concentration', description: 'Music for studying', category: 'instrumental', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Music%20for%20Concentration%20Studying%20and%20Stress%20Relief.mp3' },
  { id: 'zen-balance', name: 'Zen Balance', description: 'Full album for relaxation', category: 'ambient', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/ZEN%20MUSIC%20FOR%20BALANCE%20AND%20RELAXATION%5BFULL%20ALBUM%5DHD%20-%20YouTube.mp3' },

  // Healing Frequencies - Binaural and frequency-based
  { id: 'healing-528', name: '528Hz Healing', description: 'Full body regeneration', category: 'binaural', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/528Hz%20-%20Whole%20Body%20Regeneration%20-%20Full%20Body%20Healing%20Emotional%20Physical%20Healing.mp3' },
  { id: 'serotonin', name: 'Happiness Frequency', description: 'Serotonin & dopamine release', category: 'binaural', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/Happiness%20Frequency%20-%20Serotonin%20Dopamine%20and%20Endorphin%20Release%20Music%2010%20Hz%20Binaural%20Beats.mp3' },
  { id: 'earth-frequency', name: 'Earth Frequency 7.83Hz', description: 'Boost positive energy', category: 'binaural', audioUrl: 'https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/7.83%20Hz%20The%20Powerful%20Healing%20Frequency%20of%20Earths%20Magnetic%20Field%20Boost%20Positive%20Energy.mp3' },
];

export const AUDIO_TAG_CATEGORIES: { id: string; name: string; color: string; bgColor: string; tags: { id: string; label: string; description: string }[] }[] = [
  {
    id: 'pauses',
    name: 'Pauses',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    tags: [
      { id: 'pause', label: '[pause]', description: 'A natural 2-3 second pause' },
      { id: 'short_pause', label: '[short pause]', description: 'A brief 1-2 second pause' },
      { id: 'long_pause', label: '[long pause]', description: 'A longer 3-5 second pause' },
      { id: 'silence', label: '[silence]', description: 'A moment of complete silence' },
    ]
  },
  {
    id: 'breathing',
    name: 'Breathing',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    tags: [
      { id: 'deep_breath', label: '[deep breath]', description: 'A full deep breath cycle' },
      { id: 'inhale', label: '[inhale]', description: 'Sound of breathing in deeply' },
      { id: 'exhale', label: '[exhale]', description: 'Sound of breathing out slowly' },
      { id: 'exhale_slowly', label: '[exhale slowly]', description: 'A slow, relaxing exhale' },
    ]
  },
  {
    id: 'voice',
    name: 'Voice Style',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    tags: [
      { id: 'whisper', label: '[whisper]', description: 'Speak in a soft whisper' },
      { id: 'soft_voice', label: '[soft voice]', description: 'Speak very gently' },
    ]
  },
  {
    id: 'sounds',
    name: 'Sounds',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    tags: [
      { id: 'gentle_giggle', label: '[gentle giggle]', description: 'A soft, warm laugh' },
      { id: 'sigh', label: '[sigh]', description: 'A relaxing sigh' },
      { id: 'hum', label: '[hum]', description: 'A gentle humming sound' },
    ]
  },
];

// ============================================================================
// Static data moved from App.tsx for performance optimization
// These were previously memoized with useMemo but recreated on every render
// Moving them here saves memory and prevents unnecessary recalculations
// ============================================================================

/**
 * Keyword to audio tag mapping for smart tag suggestions
 * Used by getSuggestedTags() in App.tsx
 */
export const KEYWORD_TAG_MAP: Record<string, string[]> = {
  // Breathing related
  'breath': ['deep_breath', 'exhale'],
  'breathing': ['deep_breath', 'exhale'],
  'inhale': ['deep_breath'],
  'exhale': ['exhale'],
  // Pause/calm related
  'pause': ['short_pause', 'long_pause'],
  'calm': ['long_pause', 'silence'],
  'peace': ['long_pause', 'silence'],
  'quiet': ['silence'],
  'silent': ['silence'],
  'stillness': ['silence', 'long_pause'],
  // Sound related
  'laugh': ['giggling'],
  'happy': ['giggling'],
  'joy': ['giggling'],
  'gentle': ['soft_hum'],
  'hum': ['soft_hum'],
  // Voice related
  'whisper': ['whisper'],
  'soft': ['whisper', 'soft_hum'],
  'sigh': ['sigh'],
  'relax': ['sigh', 'deep_breath'],
  'release': ['sigh', 'exhale'],
};

/**
 * Background music category styling configuration
 */
export const MUSIC_CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'ambient': { label: 'Ambient', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  'nature': { label: 'Nature', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'binaural': { label: 'Binaural', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  'instrumental': { label: 'Instrumental', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'lofi': { label: 'Lo-Fi', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  'classical': { label: 'Classical', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
};

/**
 * Pre-computed tracks grouped by category
 * Avoids recalculating this on every render
 */
export const TRACKS_BY_CATEGORY: Record<string, BackgroundTrack[]> = BACKGROUND_TRACKS.reduce((acc, track) => {
  if (!acc[track.category]) acc[track.category] = [];
  acc[track.category].push(track);
  return acc;
}, {} as Record<string, BackgroundTrack[]>);

/**
 * Get suggested audio tags based on prompt content
 * Moved from App.tsx useMemo for better performance
 */
export function getSuggestedTags(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const suggestions: string[] = [];

  Object.entries(KEYWORD_TAG_MAP).forEach(([keyword, tags]) => {
    if (lowerPrompt.includes(keyword)) {
      tags.forEach(tag => {
        if (!suggestions.includes(tag)) {
          suggestions.push(tag);
        }
      });
    }
  });

  // Limit to top 4 suggestions
  return suggestions.slice(0, 4);
}

// ============================================================================
// Icons
// ============================================================================

export const ICONS = {
  Logo: ({ className = "h-8" }: { className?: string }) => (
    <svg viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} transition-all duration-300`}>
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
          <stop offset="0%" stopColor="#22d3ee" />
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
          <stop offset="0%" stopColor="#22d3ee" />
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

  // Sidebar toggle icon - minimalist 3-line hamburger menu
  SidebarToggle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),

  // Waveform icon for voice/audio
  Waveform: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path fill="url(#waveGrad)" d="M5 9a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 019 9v6a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 015 15V9zM10.5 4a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 0114.5 4v16a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5V4zM16 8a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 0120 8v8a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 0116 16V8z" />
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
  ),

  // Affirmation icon - Heart with plus (positive statements)
  Affirmation: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="affirmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path fill="url(#affirmGrad)" d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      <path fill="white" opacity="0.9" d="M12 8v4m-2-2h4" strokeWidth="0" />
    </svg>
  ),

  // Hypnosis icon - Spiral/concentric circles
  Hypnosis: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="hypnosisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="none" stroke="url(#hypnosisGrad)" strokeWidth="1.5" opacity="0.3" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="url(#hypnosisGrad)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="url(#hypnosisGrad)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.5" fill="url(#hypnosisGrad)" />
    </svg>
  ),

  // Music note icon for background music
  Music: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="musicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path fill="url(#musicGrad)" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
    </svg>
  ),

  // Plus icon for menu button
  Plus: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  // Tags icon for audio tags
  Tags: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="tagsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path fill="url(#tagsGrad)" d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/>
      <circle fill="url(#tagsGrad)" cx="6" cy="9" r="1"/>
      <path fill="url(#tagsGrad)" opacity="0.5" d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
    </svg>
  ),

  // Send/Arrow Up icon (ChatGPT style)
  Send: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
};
