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
  icon: 'leaf' | 'moon' | 'sparkle' | 'book' | 'fire' | 'pray';
  color: string; // Tailwind color class for category theming
  subgroups: TemplateSubgroup[];
}

// 12 Universal Themes used across all categories
const THEMES = {
  selfLove: { id: 'self-love', name: 'Self Love & Worth', description: 'Cultivate deep self-love and recognize your inherent worth' },
  loveCompassion: { id: 'love-compassion', name: 'Love & Compassion', description: 'Open your heart to love and compassion for self and others' },
  peaceHealing: { id: 'peace-healing', name: 'Peace & Healing', description: 'Find inner peace and promote healing in body and mind' },
  higherSelf: { id: 'higher-self', name: 'Higher Self & Consciousness', description: 'Connect with your higher self and expand consciousness' },
  clearingBeliefs: { id: 'clearing-beliefs', name: 'Clearing Limiting Beliefs', description: 'Release limiting beliefs that hold you back' },
  wealthAbundance: { id: 'wealth-abundance', name: 'Wealth & Abundance', description: 'Attract wealth, prosperity, and abundance into your life' },
  gratitude: { id: 'gratitude', name: 'Gratitude & Appreciation', description: 'Cultivate deep gratitude and appreciation for life' },
  joyHappiness: { id: 'joy-happiness', name: 'Joy & Happiness', description: 'Reconnect with your natural state of joy and happiness' },
  confidence: { id: 'confidence', name: 'Confidence & Self Belief', description: 'Build unshakeable confidence and self-belief' },
  servicePurpose: { id: 'service-purpose', name: 'Service & Purpose', description: 'Discover your purpose and live a life of service' },
  emotionalHealing: { id: 'emotional-healing', name: 'Emotional Healing & Sadness', description: 'Heal emotional wounds and process sadness' },
  trustSurrender: { id: 'trust-surrender', name: 'Trust & Surrender', description: 'Learn to trust the process and surrender to life\'s flow' },
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  // 🌿 AFFIRMATIONS
  {
    id: 'affirmations',
    name: 'Affirmations',
    description: 'Powerful positive statements to reprogram your mind',
    icon: 'leaf',
    color: 'emerald',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'aff-self-love-1', title: 'I Am Worthy of Love', description: 'Affirm your inherent worthiness of love and respect.', prompt: 'Create powerful affirmations focused on self-love and self-worth. Include statements like "I am worthy of love exactly as I am", "I deserve happiness and joy", "I am enough". Use a warm, nurturing tone with pauses between affirmations.' },
          { id: 'aff-self-love-2', title: 'Embracing My True Self', description: 'Accept and celebrate who you truly are.', prompt: 'Write affirmations for radical self-acceptance and self-love. Include "I love and accept myself completely", "I honor my unique journey", "I am beautiful inside and out". Create a gentle, affirming tone.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'aff-love-1', title: 'Heart of Compassion', description: 'Open your heart to give and receive love.', prompt: 'Create affirmations focused on love and compassion. Include "My heart is open to give and receive love", "I radiate love and kindness", "Compassion flows through me naturally". Use a soft, heartfelt tone.' },
          { id: 'aff-love-2', title: 'Loving Kindness', description: 'Cultivate loving kindness for all beings.', prompt: 'Write loving-kindness affirmations. Include "I send love to myself and all beings", "My compassion knows no bounds", "Love guides all my actions". Create a peaceful, expansive tone.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'aff-peace-1', title: 'Inner Peace Flows', description: 'Affirm your natural state of peace.', prompt: 'Create peace and healing affirmations. Include "Peace flows through every cell of my body", "I am calm, centered, and at ease", "Healing energy surrounds me". Use a serene, calming tone.' },
          { id: 'aff-peace-2', title: 'Healing Body & Mind', description: 'Support your body\'s natural healing.', prompt: 'Write healing affirmations for body and mind. Include "My body knows how to heal itself", "Every breath brings healing", "I release all that no longer serves me". Create a nurturing, supportive tone.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'aff-higher-1', title: 'Connected to My Higher Self', description: 'Strengthen your connection to divine wisdom.', prompt: 'Create affirmations for higher consciousness. Include "I am connected to infinite wisdom", "My higher self guides me perfectly", "I am one with universal consciousness". Use an elevated, spiritual tone.' },
          { id: 'aff-higher-2', title: 'Expanding Consciousness', description: 'Expand your awareness and spiritual growth.', prompt: 'Write consciousness-expanding affirmations. Include "My awareness expands daily", "I am awakening to my true nature", "Divine light flows through me". Create an inspiring, transcendent tone.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'aff-clearing-1', title: 'Releasing Old Patterns', description: 'Let go of beliefs that limit you.', prompt: 'Create affirmations for releasing limiting beliefs. Include "I release all beliefs that no longer serve me", "I am free from the past", "New empowering beliefs flow into my life". Use a liberating, empowering tone.' },
          { id: 'aff-clearing-2', title: 'Breaking Free', description: 'Break free from self-imposed limitations.', prompt: 'Write affirmations for breaking through barriers. Include "I break free from all limitations", "Nothing can hold me back", "I choose new, empowering thoughts". Create a powerful, determined tone.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'aff-wealth-1', title: 'Money Flows to Me', description: 'Attract financial abundance effortlessly.', prompt: 'Create wealth and abundance affirmations. Include "Money flows to me easily and effortlessly", "I am a magnet for prosperity", "Abundance is my birthright". Use a confident, abundant tone.' },
          { id: 'aff-wealth-2', title: 'Prosperity Consciousness', description: 'Embody the energy of abundance.', prompt: 'Write prosperity affirmations. Include "I live in an abundant universe", "Wealth comes to me from expected and unexpected sources", "I am worthy of financial freedom". Create an expansive, prosperous tone.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'aff-gratitude-1', title: 'Grateful Heart', description: 'Cultivate deep appreciation for life.', prompt: 'Create gratitude affirmations. Include "I am grateful for the abundance in my life", "Thank you for this beautiful day", "Gratitude fills my heart". Use a warm, appreciative tone.' },
          { id: 'aff-gratitude-2', title: 'Appreciation for All', description: 'Find blessings in every moment.', prompt: 'Write appreciation affirmations. Include "I appreciate the small miracles in my life", "Every experience is a gift", "I see beauty everywhere". Create a joyful, thankful tone.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'aff-joy-1', title: 'I Choose Joy', description: 'Embrace your natural state of happiness.', prompt: 'Create joy and happiness affirmations. Include "I choose joy in every moment", "Happiness is my natural state", "I radiate positive energy". Use an uplifting, joyful tone.' },
          { id: 'aff-joy-2', title: 'Living in Bliss', description: 'Experience deep, lasting happiness.', prompt: 'Write bliss affirmations. Include "I am filled with joy and contentment", "My life is full of wonderful moments", "I attract happiness wherever I go". Create a bright, cheerful tone.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'aff-conf-1', title: 'Unstoppable Confidence', description: 'Build unshakeable self-belief.', prompt: 'Create confidence affirmations. Include "I am confident in who I am", "I trust myself completely", "I am capable of achieving anything". Use a strong, empowering tone.' },
          { id: 'aff-conf-2', title: 'I Believe in Myself', description: 'Strengthen your inner power.', prompt: 'Write self-belief affirmations. Include "I believe in my abilities", "I am powerful beyond measure", "My confidence grows stronger each day". Create a bold, assertive tone.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'aff-purpose-1', title: 'Living My Purpose', description: 'Align with your life\'s mission.', prompt: 'Create purpose affirmations. Include "I am living my divine purpose", "My life has meaning and significance", "I serve the world with my unique gifts". Use an inspired, purposeful tone.' },
          { id: 'aff-purpose-2', title: 'Called to Serve', description: 'Embrace your role in service to others.', prompt: 'Write service affirmations. Include "I am here to make a difference", "My work matters", "I serve with love and dedication". Create a meaningful, heartfelt tone.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'aff-emotional-1', title: 'Healing My Heart', description: 'Gently heal emotional wounds.', prompt: 'Create emotional healing affirmations. Include "I allow myself to feel and heal", "My heart is mending beautifully", "I release old pain with love". Use a gentle, compassionate tone.' },
          { id: 'aff-emotional-2', title: 'From Sadness to Strength', description: 'Transform pain into wisdom.', prompt: 'Write affirmations for processing sadness. Include "It is safe to feel my emotions", "Sadness passes through me like a wave", "I emerge stronger from every experience". Create a supportive, understanding tone.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'aff-trust-1', title: 'Trusting the Journey', description: 'Let go and trust life\'s process.', prompt: 'Create trust and surrender affirmations. Include "I trust the process of life", "Everything is unfolding perfectly", "I surrender control and embrace flow". Use a peaceful, accepting tone.' },
          { id: 'aff-trust-2', title: 'Divine Surrender', description: 'Release attachment to outcomes.', prompt: 'Write surrender affirmations. Include "I let go and let the universe guide me", "I am exactly where I need to be", "I trust in divine timing". Create a serene, faithful tone.' }
        ]
      }
    ]
  },

  // 🌙 MEDITATIONS
  {
    id: 'meditations',
    name: 'Meditations',
    description: 'Guided meditations for transformation and inner peace',
    icon: 'moon',
    color: 'cyan',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'med-self-love-1', title: 'Self-Love Meditation', description: 'A journey to embrace your beautiful self.', prompt: 'Create a guided meditation focused on self-love. Guide the listener to see themselves through eyes of unconditional love. Include heart-opening visualizations, mirror work, and affirmations of worthiness. End with feeling deeply loved and accepted.' },
          { id: 'med-self-love-2', title: 'Inner Child Healing', description: 'Embrace and heal your inner child.', prompt: 'Write a meditation for inner child healing. Guide the listener to meet and embrace their younger self with love. Include gentle reassurance, nurturing visualizations, and healing of old wounds. End with integration and wholeness.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'med-love-1', title: 'Loving-Kindness Meditation', description: 'Radiate love to yourself and all beings.', prompt: 'Create a loving-kindness (metta) meditation. Guide the listener to cultivate feelings of love for themselves, loved ones, neutral people, difficult people, and all beings. Include heart visualization and expansion of compassion.' },
          { id: 'med-love-2', title: 'Heart Opening', description: 'Open your heart center to give and receive love.', prompt: 'Write a heart chakra meditation. Guide the listener to open and heal their heart center. Include visualization of green or pink light, releasing past hurts, and expanding capacity for love.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'med-peace-1', title: 'Deep Peace Meditation', description: 'Sink into profound inner peace.', prompt: 'Create a meditation for deep peace. Guide the listener into progressively deeper states of relaxation and peace. Include body scan, breath awareness, and visualization of peaceful settings. End with feeling completely at peace.' },
          { id: 'med-peace-2', title: 'Healing Light Meditation', description: 'Channel healing energy through your body.', prompt: 'Write a healing meditation with visualization of healing light. Guide the listener to draw healing energy into their body, directing it to areas needing healing. Include golden or white light visualization.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'med-higher-1', title: 'Meeting Your Higher Self', description: 'Connect with your wisest, highest self.', prompt: 'Create a meditation to meet the higher self. Guide the listener on a journey to meet their wisest, most enlightened self. Include receiving guidance, wisdom, and unconditional love from this higher aspect.' },
          { id: 'med-higher-2', title: 'Expanding Consciousness', description: 'Expand your awareness beyond the physical.', prompt: 'Write an expansion meditation. Guide the listener to expand their awareness beyond the body, room, city, planet, into cosmic consciousness. Include feeling connected to all that is.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'med-clearing-1', title: 'Releasing Limiting Beliefs', description: 'Let go of what holds you back.', prompt: 'Create a meditation for releasing limiting beliefs. Guide the listener to identify, release, and replace limiting beliefs with empowering ones. Include visualization of releasing old programming and installing new beliefs.' },
          { id: 'med-clearing-2', title: 'Cord Cutting Meditation', description: 'Release energetic attachments.', prompt: 'Write a cord cutting meditation. Guide the listener to identify and release unhealthy energetic cords and attachments. Include visualization of loving release and reclaiming personal energy.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'med-wealth-1', title: 'Abundance Meditation', description: 'Open to receive unlimited prosperity.', prompt: 'Create an abundance meditation. Guide the listener to shift into abundance consciousness. Include visualization of golden light of prosperity, feeling wealthy, and releasing scarcity mindset.' },
          { id: 'med-wealth-2', title: 'Manifesting Prosperity', description: 'Align your energy with wealth.', prompt: 'Write a prosperity manifestation meditation. Guide the listener to visualize their ideal financial reality. Include feeling the emotions of having achieved financial freedom.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'med-gratitude-1', title: 'Gratitude Meditation', description: 'Cultivate deep appreciation.', prompt: 'Create a gratitude meditation. Guide the listener to deeply appreciate their blessings. Include visualization of gratitude as golden light in the heart, expanding with each blessing acknowledged.' },
          { id: 'med-gratitude-2', title: 'Thankfulness Journey', description: 'A journey through your blessings.', prompt: 'Write a gratitude journey meditation. Guide the listener through different areas of life, finding gratitude in each. Include relationships, health, experiences, and simple pleasures.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'med-joy-1', title: 'Awakening Inner Joy', description: 'Reconnect with your natural happiness.', prompt: 'Create a meditation for awakening inner joy. Guide the listener to their natural state of happiness. Include accessing joyful memories, feeling lightness, and radiating positive energy.' },
          { id: 'med-joy-2', title: 'Bliss Meditation', description: 'Experience deep states of bliss.', prompt: 'Write a bliss meditation. Guide the listener into deep states of contentment and happiness. Include releasing resistance, opening to pleasure, and feeling deeply fulfilled.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'med-conf-1', title: 'Confidence Activation', description: 'Activate your inner power.', prompt: 'Create a confidence meditation. Guide the listener to access and amplify feelings of confidence. Include recalling past successes, power poses, and visualization of confident self.' },
          { id: 'med-conf-2', title: 'Inner Strength Meditation', description: 'Connect with your core strength.', prompt: 'Write a meditation for inner strength. Guide the listener to their core of inner power. Include visualization of golden energy in the solar plexus, feeling unshakeable.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'med-purpose-1', title: 'Discovering Your Purpose', description: 'Uncover your life\'s mission.', prompt: 'Create a purpose discovery meditation. Guide the listener to connect with their life purpose. Include questions from the soul, receiving guidance, and clarity about their mission.' },
          { id: 'med-purpose-2', title: 'Aligned with Service', description: 'Align your life with meaningful service.', prompt: 'Write a meditation for service alignment. Guide the listener to understand how they can best serve. Include connecting with the desire to contribute and finding their unique way to help.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'med-emotional-1', title: 'Emotional Release', description: 'Safely release stored emotions.', prompt: 'Create an emotional release meditation. Guide the listener to safely feel and release stored emotions. Include body awareness, allowing feelings to flow, and gentle release.' },
          { id: 'med-emotional-2', title: 'Healing Grief & Sadness', description: 'Gently process grief and loss.', prompt: 'Write a grief healing meditation. Guide the listener through processing sadness and grief. Include honoring the pain, gentle release, and finding peace.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'med-trust-1', title: 'Surrender Meditation', description: 'Release control and trust the flow.', prompt: 'Create a surrender meditation. Guide the listener to let go of the need to control. Include releasing tension, trusting the universe, and flowing with life.' },
          { id: 'med-trust-2', title: 'Trusting Divine Timing', description: 'Trust that everything happens perfectly.', prompt: 'Write a meditation for trusting divine timing. Guide the listener to release impatience and trust that everything happens at the right time.' }
        ]
      }
    ]
  },

  // ✨ MANIFESTATIONS
  {
    id: 'manifestations',
    name: 'Manifestations',
    description: 'Powerful visualizations to create your dream reality',
    icon: 'sparkle',
    color: 'violet',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'man-self-love-1', title: 'Manifesting Self-Love', description: 'Become someone who deeply loves themselves.', prompt: 'Create a manifestation script for becoming someone who truly loves themselves. Guide the listener to visualize themselves living with complete self-love, how they treat themselves, their boundaries, and their inner dialogue.' },
          { id: 'man-self-love-2', title: 'Your Most Confident Self', description: 'Step into your highest version.', prompt: 'Write a manifestation for embodying your most confident, self-loving self. Include vivid visualization of how this version walks, talks, and lives.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'man-love-1', title: 'Manifesting True Love', description: 'Attract your perfect partner.', prompt: 'Create a manifestation for attracting romantic love. Guide the listener to visualize their ideal relationship, how it feels, the connection they share, and the life they build together.' },
          { id: 'man-love-2', title: 'Loving Relationships', description: 'Manifest harmonious relationships.', prompt: 'Write a manifestation for loving relationships in all areas. Include visualization of peaceful family dynamics, supportive friendships, and meaningful connections.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'man-peace-1', title: 'Manifesting Perfect Health', description: 'Visualize your body in perfect health.', prompt: 'Create a health manifestation. Guide the listener to visualize their body in perfect health, every cell vibrating with vitality, feeling strong and energetic.' },
          { id: 'man-peace-2', title: 'A Peaceful Life', description: 'Manifest a life of peace and ease.', prompt: 'Write a manifestation for a peaceful, stress-free life. Include visualization of calm mornings, easy days, and restful nights.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'man-higher-1', title: 'Manifesting Spiritual Growth', description: 'Accelerate your spiritual evolution.', prompt: 'Create a manifestation for spiritual growth. Guide the listener to visualize themselves as deeply connected, intuitive, and spiritually evolved.' },
          { id: 'man-higher-2', title: 'Living from Higher Consciousness', description: 'Embody elevated awareness daily.', prompt: 'Write a manifestation for living from higher consciousness. Include visualization of responding from wisdom, seeing clearly, and living in alignment.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'man-clearing-1', title: 'New Empowering Beliefs', description: 'Manifest a new mindset.', prompt: 'Create a manifestation for new empowering beliefs. Guide the listener to visualize themselves thinking, believing, and acting from empowering perspectives.' },
          { id: 'man-clearing-2', title: 'Freedom from the Past', description: 'Visualize being completely free.', prompt: 'Write a manifestation for freedom from past limitations. Include visualization of being unburdened, light, and completely free.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'man-wealth-1', title: 'Manifesting Financial Freedom', description: 'Create your abundant reality.', prompt: 'Create a wealth manifestation. Guide the listener through a day in their financially free life - waking up without money stress, making choices freely, giving generously.' },
          { id: 'man-wealth-2', title: 'Millionaire Lifestyle', description: 'Visualize your dream lifestyle.', prompt: 'Write a manifestation for achieving wealth. Include vivid visualization of the home, car, travel, and lifestyle they desire, feeling it as already real.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'man-gratitude-1', title: 'Manifesting from Gratitude', description: 'Attract more through appreciation.', prompt: 'Create a gratitude manifestation. Guide the listener to give thanks for what they want as if already received, feeling deep appreciation for their manifested reality.' },
          { id: 'man-gratitude-2', title: 'Abundance Through Thanks', description: 'Multiply blessings through gratitude.', prompt: 'Write a manifestation using gratitude as the creative force. Include thanking the universe for all that is coming and all that has been received.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'man-joy-1', title: 'Manifesting Joy', description: 'Create a life filled with happiness.', prompt: 'Create a joy manifestation. Guide the listener to visualize a life filled with laughter, fun, and genuine happiness. Include specific joyful moments and experiences.' },
          { id: 'man-joy-2', title: 'Your Happiest Life', description: 'Visualize your most joyful existence.', prompt: 'Write a manifestation for ultimate happiness. Include visualization of daily moments of joy, fulfilling activities, and deep contentment.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'man-conf-1', title: 'Unstoppable Success', description: 'Manifest your successful self.', prompt: 'Create a success manifestation. Guide the listener to visualize achieving their biggest goals, receiving recognition, and feeling deeply successful.' },
          { id: 'man-conf-2', title: 'Confident in All Situations', description: 'See yourself handling anything with ease.', prompt: 'Write a confidence manifestation. Include visualization of handling challenging situations with ease, speaking up, and being respected.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'man-purpose-1', title: 'Living Your Purpose', description: 'Manifest alignment with your mission.', prompt: 'Create a purpose manifestation. Guide the listener to visualize living fully aligned with their purpose, making an impact, and feeling deeply fulfilled.' },
          { id: 'man-purpose-2', title: 'Dream Career Manifestation', description: 'Visualize your ideal work.', prompt: 'Write a manifestation for dream career or calling. Include visualization of meaningful work, positive impact, and professional fulfillment.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'man-emotional-1', title: 'Manifesting Emotional Freedom', description: 'Visualize being emotionally free.', prompt: 'Create a manifestation for emotional freedom. Guide the listener to visualize themselves as emotionally healthy, resilient, and at peace with their past.' },
          { id: 'man-emotional-2', title: 'Healed and Whole', description: 'See yourself completely healed.', prompt: 'Write a manifestation for complete emotional healing. Include visualization of being whole, healed, and emotionally balanced.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'man-trust-1', title: 'Manifesting with Trust', description: 'Release and let the universe deliver.', prompt: 'Create a trust-based manifestation. Guide the listener to state their intention, then completely release attachment, trusting the universe to deliver in perfect timing.' },
          { id: 'man-trust-2', title: 'Surrendered Manifestation', description: 'Manifest through letting go.', prompt: 'Write a manifestation through surrender. Include setting the intention then visualizing completely letting go, trusting all is handled.' }
        ]
      }
    ]
  },

  // 📖 BEDTIME STORIES
  {
    id: 'bedtime-stories',
    name: 'Bedtime Stories',
    description: 'Soothing stories to guide you into peaceful sleep',
    icon: 'book',
    color: 'pink',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'bed-self-love-1', title: 'The Garden of Self-Love', description: 'A magical garden where you learn to love yourself.', prompt: 'Write a bedtime story about discovering a magical garden where every flower represents something beautiful about the listener. Include a wise gardener who teaches self-love. Make it dreamy and soothing.' },
          { id: 'bed-self-love-2', title: 'The Mirror Lake', description: 'A lake that shows your true beauty.', prompt: 'Create a sleep story about finding a magical lake that reflects the listener\'s inner beauty and worth. Include gentle imagery and a peaceful journey to self-acceptance.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'bed-love-1', title: 'The Village of Kind Hearts', description: 'A village where everyone lives with love.', prompt: 'Write a bedtime story about discovering a village where everyone radiates love and kindness. Include warm interactions and the feeling of belonging. Make it cozy and heartwarming.' },
          { id: 'bed-love-2', title: 'The Lighthouse of Love', description: 'A lighthouse that beams love across the world.', prompt: 'Create a sleep story about visiting a lighthouse that sends love-light across the ocean. Include the peaceful keeper and the warmth of the light.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'bed-peace-1', title: 'The Healing Forest', description: 'A forest where nature heals all wounds.', prompt: 'Write a bedtime story about walking through a healing forest. Include magical plants, soothing streams, and the feeling of being restored. Very calming and slow-paced.' },
          { id: 'bed-peace-2', title: 'The Temple of Peace', description: 'An ancient temple of perfect tranquility.', prompt: 'Create a sleep story about finding an ancient temple of peace. Include gentle monks, sacred silence, and deep serenity.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'bed-higher-1', title: 'The Mountain of Wisdom', description: 'A journey to meet your wisest self.', prompt: 'Write a bedtime story about climbing a peaceful mountain to meet your higher self at the summit. Include beautiful scenery and profound wisdom.' },
          { id: 'bed-higher-2', title: 'The Starlight Temple', description: 'A temple in the stars for cosmic wisdom.', prompt: 'Create a sleep story about floating to a temple among the stars. Include meeting celestial guides and receiving wisdom for your journey.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'bed-clearing-1', title: 'The River of Release', description: 'A magical river that carries away worries.', prompt: 'Write a bedtime story about sitting by a magical river and placing worries on leaves to float away. Include the peace of letting go.' },
          { id: 'bed-clearing-2', title: 'The Clearing in the Woods', description: 'A sacred clearing where burdens lift away.', prompt: 'Create a sleep story about finding a clearing where old beliefs and burdens magically dissolve. Include feeling lighter with each moment.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'bed-wealth-1', title: 'The Golden Valley', description: 'A valley where abundance flows freely.', prompt: 'Write a bedtime story about discovering a valley where abundance is everywhere - golden fields, overflowing orchards, and generous inhabitants. Make it feel prosperous and peaceful.' },
          { id: 'bed-wealth-2', title: 'The Treasure Within', description: 'A journey to find the treasure inside.', prompt: 'Create a sleep story about a quest that leads not to external treasure, but to discovering the wealth within. Include the realization that you have everything you need.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'bed-gratitude-1', title: 'The Gratitude Garden', description: 'A garden that grows with thankfulness.', prompt: 'Write a bedtime story about a magical garden where flowers bloom each time you feel grateful. Include beautiful imagery and the joy of appreciation.' },
          { id: 'bed-gratitude-2', title: 'The Thank You Stars', description: 'Stars that light up with gratitude.', prompt: 'Create a sleep story about stars that shine brighter when you send them gratitude. Include lying under the night sky and watching it illuminate with thankfulness.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'bed-joy-1', title: 'The Carnival of Joy', description: 'A magical carnival of pure happiness.', prompt: 'Write a bedtime story about visiting a magical carnival where everything brings joy. Include gentle rides, sweet treats, and infectious laughter. Make it whimsical and happy.' },
          { id: 'bed-joy-2', title: 'The Laughter Meadow', description: 'A meadow where happiness blooms.', prompt: 'Create a sleep story about finding a meadow where the flowers release giggles and the breeze carries contentment. Include playful animals and warm sunshine.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'bed-conf-1', title: 'The Castle of Courage', description: 'A castle where you discover your strength.', prompt: 'Write a bedtime story about visiting a castle where each room reveals a strength you possess. Include kind guardians and the feeling of empowerment.' },
          { id: 'bed-conf-2', title: 'The Dragon and the Knight', description: 'Befriending the dragon of fear.', prompt: 'Create a sleep story where a gentle knight befriends a dragon who represents their fears. Include the dragon becoming a protective ally.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'bed-purpose-1', title: 'The Map of Meaning', description: 'Finding a map to your purpose.', prompt: 'Write a bedtime story about discovering an old map that leads to your life purpose. Include clues along the way and the joy of discovery.' },
          { id: 'bed-purpose-2', title: 'The Village That Needed You', description: 'Discovering how you can help.', prompt: 'Create a sleep story about finding a village that needed exactly what you have to offer. Include the fulfillment of contributing your unique gifts.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'bed-emotional-1', title: 'The Healing Rain', description: 'Gentle rain that washes away pain.', prompt: 'Write a bedtime story about being in a safe shelter while healing rain falls outside, washing away old pain and nourishing new growth.' },
          { id: 'bed-emotional-2', title: 'The Comfort Cottage', description: 'A cottage where all feelings are welcome.', prompt: 'Create a sleep story about finding a cottage where a wise grandmother figure welcomes all emotions and helps them pass gently.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'bed-trust-1', title: 'Floating Down the River', description: 'Trusting the river to carry you.', prompt: 'Write a bedtime story about floating peacefully down a gentle river, completely trusting it to carry you to beautiful destinations.' },
          { id: 'bed-trust-2', title: 'The Cloud Bed', description: 'Surrendering to sleep on a cloud.', prompt: 'Create a sleep story about being carried to a soft cloud bed where you can completely let go and trust you are held safely.' }
        ]
      }
    ]
  },

  // 🔥 EMPOWERING SPEECHES
  {
    id: 'empowering-speeches',
    name: 'Empowering Speeches',
    description: 'Motivational speeches to ignite your inner fire',
    icon: 'fire',
    color: 'orange',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'emp-self-love-1', title: 'You Are Enough', description: 'A powerful reminder of your inherent worth.', prompt: 'Write an empowering speech about being enough exactly as you are. Include powerful reminders of inherent worth, examples of self-acceptance, and a call to love yourself fiercely. Motivational and heartfelt.' },
          { id: 'emp-self-love-2', title: 'Becoming Your Own Best Friend', description: 'Learn to be there for yourself.', prompt: 'Create a motivational speech about becoming your own biggest supporter. Include how to talk to yourself with kindness and show up for yourself.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'emp-love-1', title: 'Lead with Love', description: 'Let love guide all your actions.', prompt: 'Write an empowering speech about leading life with love. Include how love transforms relationships, work, and self. Inspiring and warm.' },
          { id: 'emp-love-2', title: 'The Power of Compassion', description: 'Compassion as your superpower.', prompt: 'Create a motivational speech about compassion as strength. Include how caring for others and self makes you powerful.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'emp-peace-1', title: 'Your Healing Journey', description: 'Embrace your path to wholeness.', prompt: 'Write an empowering speech about the healing journey. Include validation of the process, encouragement to keep going, and celebration of progress. Supportive and hopeful.' },
          { id: 'emp-peace-2', title: 'Choosing Peace', description: 'Peace is always a choice.', prompt: 'Create a motivational speech about actively choosing peace. Include practical wisdom about finding calm amid chaos.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'emp-higher-1', title: 'Awaken Your Potential', description: 'You have unlimited potential within.', prompt: 'Write an empowering speech about awakening dormant potential. Include reminders of inner power, examples of transformation, and encouragement to reach higher.' },
          { id: 'emp-higher-2', title: 'Rise to Your Highest Self', description: 'Become who you were meant to be.', prompt: 'Create a motivational speech about embodying your highest self. Include the vision of who you can become and steps to get there.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'emp-clearing-1', title: 'Break the Chains', description: 'Free yourself from limiting beliefs.', prompt: 'Write an empowering speech about breaking free from limiting beliefs. Include identifying common limitations, how they formed, and powerful permission to release them.' },
          { id: 'emp-clearing-2', title: 'Rewrite Your Story', description: 'You can change your narrative.', prompt: 'Create a motivational speech about rewriting your internal story. Include the power of new perspectives and choosing empowering beliefs.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'emp-wealth-1', title: 'You Deserve Abundance', description: 'Claim your right to prosperity.', prompt: 'Write an empowering speech about deserving abundance. Include permission to desire wealth, releasing money shame, and stepping into prosperity consciousness.' },
          { id: 'emp-wealth-2', title: 'The Wealth Mindset', description: 'Think like the successful person you are.', prompt: 'Create a motivational speech about developing a wealth mindset. Include how successful people think and how to adopt those patterns.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'emp-gratitude-1', title: 'Gratitude Changes Everything', description: 'The transformative power of thanks.', prompt: 'Write an empowering speech about how gratitude transforms life. Include science of gratitude, personal examples, and a call to practice daily appreciation.' },
          { id: 'emp-gratitude-2', title: 'Count Your Blessings', description: 'Recognize the abundance you already have.', prompt: 'Create a motivational speech about recognizing current blessings. Include shifting focus from lack to abundance.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'emp-joy-1', title: 'Choose Joy Today', description: 'Happiness is a choice you make now.', prompt: 'Write an empowering speech about choosing joy regardless of circumstances. Include practical ways to shift into joy and permission to be happy.' },
          { id: 'emp-joy-2', title: 'You Deserve to Be Happy', description: 'Claim your right to happiness.', prompt: 'Create a motivational speech about deserving happiness. Include releasing guilt about joy and embracing pleasure in life.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'emp-conf-1', title: 'Unleash Your Power', description: 'Step into your full power.', prompt: 'Write an empowering speech about claiming personal power. Include recognizing inner strength, standing tall, and owning your space. Bold and energizing.' },
          { id: 'emp-conf-2', title: 'Fear Will Not Stop You', description: 'Act despite the fear.', prompt: 'Create a motivational speech about moving forward despite fear. Include reframing fear as excitement and taking bold action.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'emp-purpose-1', title: 'Your Life Has Meaning', description: 'You are here for a reason.', prompt: 'Write an empowering speech about living with purpose. Include the importance of contribution, finding meaning, and making an impact.' },
          { id: 'emp-purpose-2', title: 'Answer the Call', description: 'Step into your calling.', prompt: 'Create a motivational speech about answering your life\'s calling. Include recognizing the signs and having courage to pursue your mission.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'emp-emotional-1', title: 'Your Pain Has Purpose', description: 'Transform pain into power.', prompt: 'Write an empowering speech about how struggles become strengths. Include reframing hardship, finding meaning in pain, and emerging stronger.' },
          { id: 'emp-emotional-2', title: 'It\'s Okay to Feel', description: 'Embrace all your emotions.', prompt: 'Create a motivational speech about emotional acceptance. Include permission to feel, the strength in vulnerability, and healthy expression.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'emp-trust-1', title: 'Let Go and Trust', description: 'Surrender is strength.', prompt: 'Write an empowering speech about the power of surrender. Include releasing control, trusting the process, and finding peace in uncertainty.' },
          { id: 'emp-trust-2', title: 'Everything Is Working Out', description: 'Trust that life has your back.', prompt: 'Create a motivational speech about trusting life\'s process. Include evidence of things working out and encouragement to believe in positive outcomes.' }
        ]
      }
    ]
  },

  // 🙏 PRAYERS & GRATITUDE
  {
    id: 'prayers-gratitude',
    name: 'Prayers & Gratitude',
    description: 'Sacred words of prayer and deep appreciation',
    icon: 'pray',
    color: 'amber',
    subgroups: [
      {
        id: THEMES.selfLove.id,
        name: THEMES.selfLove.name,
        description: THEMES.selfLove.description,
        templates: [
          { id: 'pray-self-love-1', title: 'Prayer for Self-Love', description: 'Ask for help loving yourself.', prompt: 'Write a heartfelt prayer asking for help with self-love. Include requesting the ability to see yourself as worthy, beloved, and enough. Reverent and personal.' },
          { id: 'pray-self-love-2', title: 'Gratitude for Who I Am', description: 'Give thanks for your unique self.', prompt: 'Create a gratitude prayer thanking the divine for making you who you are. Include appreciation for your unique qualities and journey.' }
        ]
      },
      {
        id: THEMES.loveCompassion.id,
        name: THEMES.loveCompassion.name,
        description: THEMES.loveCompassion.description,
        templates: [
          { id: 'pray-love-1', title: 'Prayer for an Open Heart', description: 'Ask for capacity to love fully.', prompt: 'Write a prayer asking for an open, loving heart. Include requests for compassion, forgiveness, and the ability to love without conditions.' },
          { id: 'pray-love-2', title: 'Gratitude for Love in My Life', description: 'Give thanks for those who love you.', prompt: 'Create a gratitude prayer for the love in your life. Include specific appreciation for loved ones and the feeling of being loved.' }
        ]
      },
      {
        id: THEMES.peaceHealing.id,
        name: THEMES.peaceHealing.name,
        description: THEMES.peaceHealing.description,
        templates: [
          { id: 'pray-peace-1', title: 'Prayer for Healing', description: 'Ask for healing in body and soul.', prompt: 'Write a healing prayer asking for restoration of body, mind, and spirit. Include surrender to divine healing and gratitude for the healing already occurring.' },
          { id: 'pray-peace-2', title: 'Prayer for Peace', description: 'Request inner and outer peace.', prompt: 'Create a prayer for peace. Include personal peace, peace in relationships, and peace in the world. Calm and hopeful.' }
        ]
      },
      {
        id: THEMES.higherSelf.id,
        name: THEMES.higherSelf.name,
        description: THEMES.higherSelf.description,
        templates: [
          { id: 'pray-higher-1', title: 'Prayer for Divine Connection', description: 'Deepen your spiritual connection.', prompt: 'Write a prayer for deeper connection with the divine/higher power. Include longing for closeness, gratitude for presence, and openness to guidance.' },
          { id: 'pray-higher-2', title: 'Prayer for Spiritual Growth', description: 'Ask for growth on your path.', prompt: 'Create a prayer for spiritual evolution. Include request for wisdom, awareness, and alignment with highest good.' }
        ]
      },
      {
        id: THEMES.clearingBeliefs.id,
        name: THEMES.clearingBeliefs.name,
        description: THEMES.clearingBeliefs.description,
        templates: [
          { id: 'pray-clearing-1', title: 'Prayer for Release', description: 'Ask for help letting go.', prompt: 'Write a prayer for releasing what no longer serves. Include asking for help letting go of old patterns, beliefs, and attachments.' },
          { id: 'pray-clearing-2', title: 'Prayer for Freedom', description: 'Request liberation from the past.', prompt: 'Create a prayer for freedom from past wounds and limitations. Include request for breaking free and fresh start.' }
        ]
      },
      {
        id: THEMES.wealthAbundance.id,
        name: THEMES.wealthAbundance.name,
        description: THEMES.wealthAbundance.description,
        templates: [
          { id: 'pray-wealth-1', title: 'Prayer for Provision', description: 'Trust in divine provision.', prompt: 'Write a prayer of trust in divine provision. Include gratitude for current blessings and faith that needs will be met abundantly.' },
          { id: 'pray-wealth-2', title: 'Gratitude for Abundance', description: 'Give thanks for prosperity.', prompt: 'Create a gratitude prayer for abundance in all forms. Include appreciation for material blessings, opportunities, and overflow.' }
        ]
      },
      {
        id: THEMES.gratitude.id,
        name: THEMES.gratitude.name,
        description: THEMES.gratitude.description,
        templates: [
          { id: 'pray-gratitude-1', title: 'Deep Gratitude Prayer', description: 'Profound thanks for all blessings.', prompt: 'Write a deep gratitude prayer covering all aspects of life. Include thanks for the big and small, seen and unseen blessings. Heartfelt and comprehensive.' },
          { id: 'pray-gratitude-2', title: 'Morning Gratitude Prayer', description: 'Start the day with thanks.', prompt: 'Create a morning gratitude prayer. Include thanks for the new day, opportunities ahead, and blessings already received.' }
        ]
      },
      {
        id: THEMES.joyHappiness.id,
        name: THEMES.joyHappiness.name,
        description: THEMES.joyHappiness.description,
        templates: [
          { id: 'pray-joy-1', title: 'Prayer for Joy', description: 'Ask for the gift of joy.', prompt: 'Write a prayer asking for joy regardless of circumstances. Include request for lightness of spirit and ability to find happiness.' },
          { id: 'pray-joy-2', title: 'Gratitude for Happiness', description: 'Give thanks for moments of joy.', prompt: 'Create a prayer of gratitude for joy and happiness. Include specific moments of happiness and the ability to experience pleasure.' }
        ]
      },
      {
        id: THEMES.confidence.id,
        name: THEMES.confidence.name,
        description: THEMES.confidence.description,
        templates: [
          { id: 'pray-conf-1', title: 'Prayer for Courage', description: 'Ask for strength and bravery.', prompt: 'Write a prayer for courage and confidence. Include request for boldness, strength to overcome fear, and trust in capabilities.' },
          { id: 'pray-conf-2', title: 'Prayer Before Challenge', description: 'Seek support facing difficulty.', prompt: 'Create a prayer for support before facing a challenge. Include request for calm, confidence, and positive outcome.' }
        ]
      },
      {
        id: THEMES.servicePurpose.id,
        name: THEMES.servicePurpose.name,
        description: THEMES.servicePurpose.description,
        templates: [
          { id: 'pray-purpose-1', title: 'Prayer for Purpose', description: 'Seek guidance on your path.', prompt: 'Write a prayer for clarity of purpose. Include asking for guidance, revelation of calling, and courage to follow it.' },
          { id: 'pray-purpose-2', title: 'Prayer to Serve', description: 'Offer yourself in service.', prompt: 'Create a prayer of offering yourself in service. Include willingness to be used for good and request for opportunities to help.' }
        ]
      },
      {
        id: THEMES.emotionalHealing.id,
        name: THEMES.emotionalHealing.name,
        description: THEMES.emotionalHealing.description,
        templates: [
          { id: 'pray-emotional-1', title: 'Prayer Through Pain', description: 'Seek comfort in difficult times.', prompt: 'Write a prayer for comfort during emotional pain. Include crying out honestly, asking for comfort, and trusting in being held.' },
          { id: 'pray-emotional-2', title: 'Prayer for Emotional Healing', description: 'Ask for healing of the heart.', prompt: 'Create a prayer specifically for emotional healing. Include naming the pain, asking for healing, and gratitude for the process.' }
        ]
      },
      {
        id: THEMES.trustSurrender.id,
        name: THEMES.trustSurrender.name,
        description: THEMES.trustSurrender.description,
        templates: [
          { id: 'pray-trust-1', title: 'Prayer of Surrender', description: 'Release control to the divine.', prompt: 'Write a prayer of complete surrender. Include letting go of outcomes, trusting divine plan, and finding peace in not knowing.' },
          { id: 'pray-trust-2', title: 'Thy Will Be Done', description: 'Accept divine will over personal desires.', prompt: 'Create a prayer of accepting divine will. Include releasing personal agenda and embracing whatever is for highest good.' }
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

// Nature/Ambient Sounds - Looping environmental audio
// All sounds from Archive.org (public domain, CORS-enabled)
export interface NatureSound {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'rain' | 'fire' | 'wind' | 'noise' | 'ocean' | 'forest' | 'storm' | 'water';
  audioUrl: string;
}

export const NATURE_SOUNDS: NatureSound[] = [
  // No Sound Option
  { id: 'none', name: 'No Sound', description: 'Nature sounds disabled', icon: 'VolumeOff', category: 'noise', audioUrl: '' },

  // Rain - archive.org relaxingsounds collection (Pixabay blocks hotlinking)
  { id: 'gentle-rain', name: 'Gentle Rain', description: 'Light, soothing rainfall', icon: 'CloudRain', category: 'rain', audioUrl: 'https://archive.org/download/relaxingsounds/Rain%207%20%28Lightest%29%208h%20DripsOnTrees-no%20thunder.mp3' },
  { id: 'heavy-rain', name: 'Heavy Rain', description: 'Immersive heavy rainfall', icon: 'CloudRain', category: 'rain', audioUrl: 'https://archive.org/download/relaxingsounds/Rain%201%20%28Heavy%29%2011h%20GentleThunder%2CWind.mp3' },

  // Fire - archive.org relaxingsounds collection
  { id: 'crackling-fire', name: 'Crackling Fire', description: 'Campfire with crackling', icon: 'Flame', category: 'fire', audioUrl: 'https://archive.org/download/relaxingsounds/FIRE%201%2010h%20CracklingCampfire%2CCrickets%2CRainOrRiver-Night.mp3' },
  { id: 'fireplace', name: 'Cozy Fireplace', description: 'Indoor fireplace warmth', icon: 'Flame', category: 'fire', audioUrl: 'https://archive.org/download/relaxingsounds/FIRE%202%203h%20Blazing%20Fireplace.mp3' },

  // Wind - archive.org relaxingsounds collection
  { id: 'gentle-wind', name: 'Gentle Breeze', description: 'Soft wind through trees', icon: 'Wind', category: 'wind', audioUrl: 'https://archive.org/download/relaxingsounds/Wind%201%208h%20%28or%20Rapids%29%20Gentle%2CLowPitch%2CBrownNoise.mp3' },
  { id: 'howling-wind', name: 'Howling Wind', description: 'Strong winter wind', icon: 'Wind', category: 'wind', audioUrl: 'https://archive.org/download/relaxingsounds/Wind%203%207h%20HowlingBlizzard%2CSnowSounds.mp3' },

  // White Noise/Fan - archive.org relaxingsounds collection
  { id: 'white-noise', name: 'White Noise', description: 'Strong box fan white noise', icon: 'Radio', category: 'noise', audioUrl: 'https://archive.org/download/relaxingsounds/FAN%201%2010h%20Strong%20Box%20Fan.mp3' },
  { id: 'fan-noise', name: 'Fan Noise', description: 'Oscillating fan sound', icon: 'Radio', category: 'noise', audioUrl: 'https://archive.org/download/relaxingsounds/FAN%202%2010h%20Gentle%2COscillating%20Fan.mp3' },

  // Ocean - archive.org relaxingsounds collection
  { id: 'ocean-waves', name: 'Ocean Waves', description: 'Beach waves at sunset', icon: 'Waves', category: 'ocean', audioUrl: 'https://archive.org/download/relaxingsounds/Waves%201%2010h%20Beach-Sunset%20into%20Night.mp3' },
  { id: 'gentle-ocean', name: 'Gentle Surf', description: 'Calm night beach waves', icon: 'Waves', category: 'ocean', audioUrl: 'https://archive.org/download/relaxingsounds/Waves%203%2010h%20Night%20Beach-Gentle%2C%20NO%20GULLS.mp3' },

  // Forest - archive.org relaxingsounds collection
  { id: 'forest-birds', name: 'Rainforest', description: 'Birds, insects, river falls', icon: 'Trees', category: 'forest', audioUrl: 'https://archive.org/download/relaxingsounds/Rainforest%205h%20Bubbling%20River%20Falls%28gentle%29%2CBirds%2CInsects%2CAnimals-Daytime%2CSouth%20America.mp3' },
  { id: 'morning-forest', name: 'Crickets & Frogs', description: 'Night forest sounds', icon: 'Trees', category: 'forest', audioUrl: 'https://archive.org/download/relaxingsounds/Crickets%20%26%20Frogs%206h%20Owls%2CLite%20Rain%20Drips-Night.mp3' },

  // Storm - archive.org relaxingsounds collection
  { id: 'thunderstorm', name: 'Thunderstorm', description: 'Rain with fierce thunder', icon: 'CloudLightning', category: 'storm', audioUrl: 'https://archive.org/download/relaxingsounds/Thunder%204%205h%20Fierce%2CRain%2BWindHowls.mp3' },
  { id: 'distant-thunder', name: 'Distant Thunder', description: 'Low rumbling thunder', icon: 'CloudLightning', category: 'storm', audioUrl: 'https://archive.org/download/relaxingsounds/Thunder%203%205h%20LowRumbling%2BRain-no%20wind.mp3' },

  // Stream/Water - archive.org relaxingsounds collection
  { id: 'mountain-stream', name: 'Mountain Stream', description: 'Waterfall and stream', icon: 'Droplets', category: 'water', audioUrl: 'https://archive.org/download/relaxingsounds/Falls%202%203h%20%28Low%20pitch%29MountainStreamWaterfalls.mp3' },
  { id: 'river-rapids', name: 'River Rapids', description: 'Fast-flowing river', icon: 'Droplets', category: 'water', audioUrl: 'https://archive.org/download/relaxingsounds/Falls%201%209h%20River%20Rapids%28High%20pitch%29%2CLiteSplashing.mp3' },
];

// Nature sound category styling
export const NATURE_SOUND_CATEGORIES: Record<string, { label: string; color: string; bgColor: string }> = {
  'rain': { label: 'Rain', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  'fire': { label: 'Fire', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  'wind': { label: 'Wind', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  'noise': { label: 'Noise', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  'ocean': { label: 'Ocean', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  'forest': { label: 'Forest', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'storm': { label: 'Storm', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'water': { label: 'Water', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
};

// Pre-computed nature sounds grouped by category
export const NATURE_SOUNDS_BY_CATEGORY: Record<string, NatureSound[]> = NATURE_SOUNDS.reduce((acc, sound) => {
  if (sound.id === 'none') return acc; // Skip 'none' from categories
  if (!acc[sound.category]) acc[sound.category] = [];
  acc[sound.category].push(sound);
  return acc;
}, {} as Record<string, NatureSound[]>);

// V3 Alpha Audio Tags - Enhanced with native ElevenLabs V3 support
// V3 supports native audio tags: [sighs], [whispers], [calm], [thoughtfully]
export const AUDIO_TAG_CATEGORIES: { id: string; name: string; color: string; bgColor: string; tags: { id: string; label: string; description: string }[] }[] = [
  {
    id: 'pauses',
    name: 'Pauses',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    tags: [
      { id: 'pause', label: '[pause]', description: 'A natural 2-3 second pause (...)' },
      { id: 'short_pause', label: '[short pause]', description: 'A brief 1-2 second pause (..)' },
      { id: 'long_pause', label: '[long pause]', description: 'A longer 3-5 second pause (......)'  },
      { id: 'silence', label: '[silence]', description: 'Extended silence (........)' },
    ]
  },
  {
    id: 'breathing',
    name: 'Breathing',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    tags: [
      { id: 'deep_breath', label: '[deep breath]', description: 'Natural sigh with breathing cue' },
      { id: 'inhale', label: '[inhale]', description: 'Breathing in with subtle sound' },
      { id: 'exhale', label: '[exhale]', description: 'Breathing out with sigh' },
      { id: 'exhale_slowly', label: '[exhale slowly]', description: 'Slow, relaxing exhale' },
      { id: 'sigh', label: '[sigh]', description: 'A natural, relaxing sigh sound' },
    ]
  },
  {
    id: 'voice',
    name: 'Voice Style',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    tags: [
      { id: 'whisper', label: '[whisper]', description: 'Speak in a soft whisper' },
      { id: 'soft_voice', label: '[soft voice]', description: 'Calm, gentle delivery' },
      { id: 'calm', label: '[calm]', description: 'Calm, measured tone' },
      { id: 'thoughtfully', label: '[thoughtfully]', description: 'Reflective, contemplative delivery' },
    ]
  },
  {
    id: 'sections',
    name: 'Sections',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    tags: [
      { id: 'whisper_section', label: '[whisper: ...]', description: 'Whisper a specific section (replace ... with text)' },
    ]
  },
  {
    id: 'sounds',
    name: 'Sounds',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    tags: [
      { id: 'gentle_giggle', label: '[gentle giggle]', description: 'A soft, warm laugh' },
      { id: 'hum', label: '[hum]', description: 'A gentle humming sound' },
      { id: 'soft_hum', label: '[soft hum]', description: 'A very soft humming sound' },
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
 * V3 Alpha: Added calm, thoughtfully tags for voice modulation
 */
export const KEYWORD_TAG_MAP: Record<string, string[]> = {
  // Breathing related
  'breath': ['deep_breath', 'exhale', 'sigh'],
  'breathing': ['deep_breath', 'exhale', 'inhale'],
  'inhale': ['inhale', 'deep_breath'],
  'exhale': ['exhale', 'exhale_slowly'],
  // Pause/calm related
  'pause': ['short_pause', 'long_pause', 'pause'],
  'calm': ['calm', 'long_pause', 'silence'],
  'peace': ['calm', 'long_pause', 'silence'],
  'peaceful': ['calm', 'long_pause'],
  'quiet': ['silence', 'calm'],
  'silent': ['silence'],
  'stillness': ['silence', 'long_pause', 'calm'],
  // Sound related
  'laugh': ['gentle_giggle'],
  'happy': ['gentle_giggle'],
  'joy': ['gentle_giggle'],
  'gentle': ['soft_hum', 'calm'],
  'hum': ['hum', 'soft_hum'],
  // Voice related
  'whisper': ['whisper', 'whisper_section'],
  'soft': ['whisper', 'soft_hum', 'soft_voice'],
  'sigh': ['sigh'],
  'relax': ['sigh', 'deep_breath', 'calm'],
  'release': ['sigh', 'exhale', 'exhale_slowly'],
  // V3 voice style tags
  'thoughtful': ['thoughtfully'],
  'reflect': ['thoughtfully', 'calm'],
  'contemplate': ['thoughtfully', 'long_pause'],
  'meditate': ['calm', 'deep_breath', 'sigh'],
  'serene': ['calm', 'silence'],
};

/**
 * Background music category styling configuration
 */
export const MUSIC_CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'ambient': { label: 'Ambient', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
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
    <img src="/logo.png" alt="Innrvo" className={`${className} transition-all duration-300`} />
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

  // Moon icon for meditations
  Moon: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <path fill="url(#moonGrad)" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),

  // Pray/Hands icon for prayers & gratitude
  Pray: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${className} icon-glow`}>
      <defs>
        <linearGradient id="prayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path fill="url(#prayGrad)" d="M12 2C10.343 2 9 3.343 9 5v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V5c0-.552.448-1 1-1s1 .448 1 1v4.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414L9 9.586V5c0-1.657 1.343-3 3-3z" />
      <path fill="url(#prayGrad)" opacity="0.8" d="M7 14v6a2 2 0 002 2h6a2 2 0 002-2v-6l-5 3-5-3z" />
      <path fill="url(#prayGrad)" d="M12 12l5-3v-1a2 2 0 00-2-2h-6a2 2 0 00-2 2v1l5 3z" opacity="0.6" />
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
  ),

  // Nature Sound Icons
  VolumeOff: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
    </svg>
  ),

  CloudRain: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="rainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path fill="url(#rainGrad)" d="M4.5 13.5a6.5 6.5 0 1112.58-3.32A4.5 4.5 0 1118.5 18H5a3.5 3.5 0 01-.5-6.97z" opacity="0.8"/>
      <path stroke="url(#rainGrad)" strokeWidth="2" strokeLinecap="round" d="M8 19v2M12 19v2M16 19v2" />
    </svg>
  ),

  Flame: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path fill="url(#fireGrad)" d="M12.356 2.065c.203-.208.557-.02.497.264-.432 2.024.08 4.194 1.549 5.738 1.503 1.578 2.146 3.788 1.61 5.868-.114.446.24.887.676.78a.797.797 0 00.572-.63c.168-.962.066-1.957-.287-2.876-.126-.328.188-.68.502-.501.994.567 1.785 1.434 2.263 2.468 1.127 2.444.576 5.414-1.554 7.332-2.357 2.124-5.98 2.376-8.622.6-2.415-1.623-3.476-4.72-2.533-7.39.298-.844.758-1.612 1.353-2.266.217-.238.598-.084.603.245.027 1.832.982 3.469 2.497 4.284.273.147.597-.082.579-.392-.18-3.048.855-6.02 2.961-8.265a14.1 14.1 0 011.334-1.259z" />
    </svg>
  ),

  Wind: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2" opacity="0.6"/>
      <path d="M9.6 4.6A2 2 0 1111 8H2" />
      <path d="M12.6 19.4A2 2 0 1014 16H2" opacity="0.8"/>
    </svg>
  ),

  Radio: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M20.432 4.103a.75.75 0 00-.942-.479L6.75 7.636V6.75a.75.75 0 00-.75-.75H4.5a.75.75 0 00-.75.75v.878l-.962.29A2.25 2.25 0 001.5 9.973v8.777a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25V9.75a2.25 2.25 0 00-1.589-2.146l-.479-.144V4.103zM6 11.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6zm4.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6zm4.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6z" clipRule="evenodd" opacity="0.8"/>
    </svg>
  ),

  Waves: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="wavesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path fill="none" stroke="url(#wavesGrad)" strokeWidth="2" strokeLinecap="round" d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path fill="none" stroke="url(#wavesGrad)" strokeWidth="2" strokeLinecap="round" d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" opacity="0.8"/>
      <path fill="none" stroke="url(#wavesGrad)" strokeWidth="2" strokeLinecap="round" d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" opacity="0.6"/>
    </svg>
  ),

  Trees: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="treesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path fill="url(#treesGrad)" d="M8.5 3l-5 8h3l-3 5h4v5h2v-5h4l-3-5h3l-5-8z" />
      <path fill="url(#treesGrad)" opacity="0.6" d="M17 8l-3.5 5.5h2l-2 3.5h3v4h1.5v-4h3l-2-3.5h2L17 8z" />
    </svg>
  ),

  CloudLightning: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="stormGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path fill="url(#stormGrad)" opacity="0.7" d="M4.5 12.5a6.5 6.5 0 1112.58-3.32A4.5 4.5 0 1118.5 17H5a3.5 3.5 0 01-.5-4.5z" />
      <path fill="#fbbf24" d="M13 11l-2 4h3l-2 5 5-6h-3l2-5-3 2z" />
    </svg>
  ),

  Droplets: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="dropletsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <path fill="url(#dropletsGrad)" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      <path fill="url(#dropletsGrad)" opacity="0.5" d="M18 14l2.83 2.83a4 4 0 11-5.66 0z" />
    </svg>
  ),

  Leaf: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path fill="url(#leafGrad)" d="M21 3v2c0 9.627-5.373 14-12 14H7.098c.212-3.012 1.15-4.835 3.598-7.001 1.204-1.065 1.102-1.68.509-1.327-4.084 2.43-6.112 5.714-6.202 10.958L5 22h2c6.284 0 11.372-3.832 12.69-9.889l.228-.981C20.89 7.17 21 4.373 21 3z"/>
    </svg>
  )
};
