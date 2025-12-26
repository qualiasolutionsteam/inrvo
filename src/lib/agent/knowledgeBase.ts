/**
 * INrVO Meditation Agent Knowledge Base
 *
 * A comprehensive collection of wisdom traditions, teachers, and meditation practices
 * that inform the conversational AI meditation assistant.
 */

// ============================================================================
// WISDOM TRADITIONS & TEACHERS
// ============================================================================

export interface WisdomTeacher {
  name: string;
  tradition: WisdomTradition;
  themes: string[];
  coreTeaching: string;
  quotes: string[];
  meditationStyles: MeditationType[];
}

export type WisdomTradition =
  | 'modern_consciousness'
  | 'ancient_wisdom'
  | 'psychology_healing'
  | 'mindfulness'
  | 'science_consciousness';

export type MeditationType =
  | 'guided_visualization'
  | 'breathwork'
  | 'body_scan'
  | 'loving_kindness'
  | 'sleep_story'
  | 'affirmations'
  | 'walking_meditation'
  | 'shadow_work'
  | 'gratitude'
  | 'manifestation'
  | 'presence'
  | 'inquiry'
  | 'surrender';

export const WISDOM_TEACHERS: WisdomTeacher[] = [
  // ========== MODERN CONSCIOUSNESS PIONEERS ==========
  {
    name: 'Bruce Lipton',
    tradition: 'modern_consciousness',
    themes: ['epigenetics', 'belief systems', 'mind-body connection', 'cellular consciousness'],
    coreTeaching: 'Your beliefs control your biology. The mind is the true healer.',
    quotes: [
      'The moment you change your perception is the moment you rewrite the chemistry of your body.',
      'Your perspective is always limited by how much you know. Expand your knowledge and you will transform your mind.',
      'The cells of your body are merely following instructions given by the nervous system, by the brain. The brain is interpreting signals from the environment.',
    ],
    meditationStyles: ['guided_visualization', 'affirmations', 'body_scan'],
  },
  {
    name: 'Bob Proctor',
    tradition: 'modern_consciousness',
    themes: ['paradigm shifts', 'self-belief', 'abundance consciousness', 'subconscious reprogramming'],
    coreTeaching: 'Change your paradigm, change your life. You are worthy of infinite abundance.',
    quotes: [
      'See yourself living in abundance and you will attract it.',
      'Faith and fear both demand you believe in something you cannot see. You choose.',
      'Set a goal to achieve something that is so big, so exhilarating that it excites you and scares you at the same time.',
    ],
    meditationStyles: ['affirmations', 'manifestation', 'guided_visualization'],
  },
  {
    name: 'John Hagelin',
    tradition: 'modern_consciousness',
    themes: ['quantum physics', 'unified field', 'collective consciousness', 'transcendence'],
    coreTeaching: 'Consciousness is the unified field. We are all connected at the deepest level of reality.',
    quotes: [
      'The unified field is the ocean of pure potentiality.',
      'At the quantum level, the observer and observed are one.',
      'Peace in the world begins with peace in the individual.',
    ],
    meditationStyles: ['presence', 'guided_visualization', 'breathwork'],
  },
  {
    name: 'Joe Dispenza',
    tradition: 'modern_consciousness',
    themes: ['neuroplasticity', 'healing', 'elevated emotions', 'breaking habits', 'becoming supernatural'],
    coreTeaching: 'Your personality creates your personal reality. Change your energy, change your life.',
    quotes: [
      'The moment you start feeling abundant and worthy, you are generating wealth.',
      'We cannot create a new future by holding on to the emotions of the past.',
      'The best way to predict your future is to create it, not from the known but from the unknown.',
      'When you marry a clear intention with an elevated emotion, you begin to change your biology.',
    ],
    meditationStyles: ['guided_visualization', 'breathwork', 'body_scan', 'manifestation'],
  },
  {
    name: 'Gregg Braden',
    tradition: 'modern_consciousness',
    themes: ['science and spirituality', 'heart coherence', 'divine matrix', 'resilience'],
    coreTeaching: 'The heart is the bridge between science and spirituality. Feel as if your prayer has already been answered.',
    quotes: [
      'The feeling is the prayer.',
      'We must become in our lives the very things that we choose to experience in our world.',
      'When we form heart-centered beliefs within our bodies, in the language of physics we are creating the electrical and magnetic expression of them.',
    ],
    meditationStyles: ['guided_visualization', 'gratitude', 'manifestation', 'breathwork'],
  },
  {
    name: 'Lynne McTaggart',
    tradition: 'modern_consciousness',
    themes: ['intention', 'collective consciousness', 'field of connection', 'power of thought'],
    coreTeaching: 'Our intentions ripple out and affect the world. We are all bound by an invisible field.',
    quotes: [
      'A thought is not only a thing; a thought is a thing that influences other things.',
      'We are all connected in a vast field of information and energy.',
      'The power of group intention is exponentially greater than individual intention.',
    ],
    meditationStyles: ['manifestation', 'loving_kindness', 'guided_visualization'],
  },
  {
    name: 'Deepak Chopra',
    tradition: 'modern_consciousness',
    themes: ['mind-body healing', 'consciousness-based living', 'quantum healing', 'ageless body'],
    coreTeaching: 'You are not in the world; the world is in you. Consciousness is the ground of all being.',
    quotes: [
      'In the midst of movement and chaos, keep stillness inside of you.',
      'Every time you are tempted to react in the same old way, ask if you want to be a prisoner of the past or a pioneer of the future.',
      'The less you open your heart to others, the more your heart suffers.',
      'You must find the place inside yourself where nothing is impossible.',
    ],
    meditationStyles: ['presence', 'breathwork', 'body_scan', 'guided_visualization'],
  },
  {
    name: 'Marianne Williamson',
    tradition: 'modern_consciousness',
    themes: ['love-based living', 'forgiveness', 'miracles', 'spiritual activism'],
    coreTeaching: 'Love is what we are born with. Fear is what we learn. Return to love.',
    quotes: [
      'Our deepest fear is not that we are inadequate. Our deepest fear is that we are powerful beyond measure.',
      'Love is what we were born with. Fear is what we learned here.',
      'As we let our light shine, we unconsciously give others permission to do the same.',
    ],
    meditationStyles: ['loving_kindness', 'affirmations', 'gratitude', 'shadow_work'],
  },

  // ========== ANCIENT WISDOM MASTERS ==========
  {
    name: 'Buddha',
    tradition: 'ancient_wisdom',
    themes: ['liberation from suffering', 'compassion', 'mindfulness', 'impermanence', 'middle way'],
    coreTeaching: 'The root of suffering is attachment. Peace comes from within.',
    quotes: [
      'Peace comes from within. Do not seek it without.',
      'What you think, you become. What you feel, you attract. What you imagine, you create.',
      'In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.',
      'You yourself, as much as anybody in the entire universe, deserve your love and affection.',
    ],
    meditationStyles: ['breathwork', 'loving_kindness', 'body_scan', 'presence', 'walking_meditation'],
  },
  {
    name: 'Lao Tzu',
    tradition: 'ancient_wisdom',
    themes: ['flow', 'humility', 'harmony', 'wu wei', 'naturalness'],
    coreTeaching: 'The Tao that can be told is not the eternal Tao. Flow with life, do not force.',
    quotes: [
      'Nature does not hurry, yet everything is accomplished.',
      'When I let go of what I am, I become what I might be.',
      'The journey of a thousand miles begins with a single step.',
      'Be content with what you have; rejoice in the way things are. When you realize there is nothing lacking, the whole world belongs to you.',
    ],
    meditationStyles: ['presence', 'breathwork', 'walking_meditation', 'surrender'],
  },
  {
    name: 'Rumi',
    tradition: 'ancient_wisdom',
    themes: ['divine love', 'unity', 'inner awakening', 'ecstatic devotion', 'the beloved'],
    coreTeaching: 'What you seek is seeking you. You are not a drop in the ocean; you are the entire ocean in a drop.',
    quotes: [
      'The wound is the place where the Light enters you.',
      'What you seek is seeking you.',
      'You are not a drop in the ocean. You are the entire ocean in a drop.',
      'Out beyond ideas of wrongdoing and rightdoing there is a field. I will meet you there.',
      'Let yourself be silently drawn by the strange pull of what you really love.',
    ],
    meditationStyles: ['loving_kindness', 'guided_visualization', 'presence', 'gratitude'],
  },
  {
    name: 'Marcus Aurelius',
    tradition: 'ancient_wisdom',
    themes: ['inner peace', 'virtue', 'service', 'stoic wisdom', 'equanimity'],
    coreTeaching: 'You have power over your mind, not outside events. Realize this, and you will find strength.',
    quotes: [
      'You have power over your mind - not outside events. Realize this, and you will find strength.',
      'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.',
      'The happiness of your life depends upon the quality of your thoughts.',
      'Waste no more time arguing about what a good man should be. Be one.',
    ],
    meditationStyles: ['presence', 'inquiry', 'gratitude', 'affirmations'],
  },
  {
    name: 'Epictetus',
    tradition: 'ancient_wisdom',
    themes: ['freedom from fear', 'mastery of mind', 'acceptance', 'inner citadel'],
    coreTeaching: 'It is not things that disturb us, but our judgments about things.',
    quotes: [
      'It is not things that disturb us, but our judgments about things.',
      'First say to yourself what you would be; and then do what you have to do.',
      'No man is free who is not master of himself.',
      'Make the best use of what is in your power, and take the rest as it happens.',
    ],
    meditationStyles: ['inquiry', 'presence', 'affirmations', 'surrender'],
  },
  {
    name: 'Paramahansa Yogananda',
    tradition: 'ancient_wisdom',
    themes: ['self-realization', 'divine love', 'inner peace', 'kriya yoga', 'cosmic consciousness'],
    coreTeaching: 'The soul loves to meditate. In meditation lies that joy unspeakable.',
    quotes: [
      'The season of failure is the best time for sowing the seeds of success.',
      'Be as simple as you can be; you will be astonished to see how uncomplicated and happy your life can become.',
      "The power of unfulfilled desires is the root of all man's slavery.",
      'Live quietly in the moment and see the beauty of all before you. The future will take care of itself.',
    ],
    meditationStyles: ['breathwork', 'presence', 'guided_visualization', 'loving_kindness'],
  },
  {
    name: 'Eckhart Tolle',
    tradition: 'ancient_wisdom',
    themes: ['presence', 'ego dissolution', 'inner stillness', 'now', 'pain body'],
    coreTeaching: 'Realize deeply that the present moment is all you have. Make the Now the primary focus of your life.',
    quotes: [
      'Realize deeply that the present moment is all you have.',
      'Life is the dancer and you are the dance.',
      'The primary cause of unhappiness is never the situation but your thoughts about it.',
      'Acknowledging the good that you already have in your life is the foundation for all abundance.',
      'Whatever the present moment contains, accept it as if you had chosen it.',
    ],
    meditationStyles: ['presence', 'breathwork', 'body_scan', 'inquiry'],
  },
  {
    name: 'Socrates',
    tradition: 'ancient_wisdom',
    themes: ['self-knowledge', 'ethical living', 'questioning', 'wisdom'],
    coreTeaching: 'Know thyself. The unexamined life is not worth living.',
    quotes: [
      'The only true wisdom is in knowing you know nothing.',
      'An unexamined life is not worth living.',
      'Be kind, for everyone you meet is fighting a hard battle.',
      'The secret of change is to focus all of your energy not on fighting the old, but on building the new.',
    ],
    meditationStyles: ['inquiry', 'presence', 'shadow_work'],
  },
  {
    name: 'Confucius',
    tradition: 'ancient_wisdom',
    themes: ['moral virtue', 'kindness', 'social harmony', 'self-cultivation'],
    coreTeaching: 'What you do not want done to yourself, do not do to others.',
    quotes: [
      'It does not matter how slowly you go as long as you do not stop.',
      'Our greatest glory is not in never falling, but in rising every time we fall.',
      'The man who moves a mountain begins by carrying away small stones.',
    ],
    meditationStyles: ['gratitude', 'loving_kindness', 'presence'],
  },
  {
    name: 'Plotinus',
    tradition: 'ancient_wisdom',
    themes: ['oneness', 'return to source', 'emanation', 'the one'],
    coreTeaching: 'All things are filled full of signs, and it is a wise man who can learn about one thing from another.',
    quotes: [
      'Withdraw into yourself and look.',
      'Knowledge has three degrees—opinion, science, illumination.',
      'The soul is not in the universe. On the contrary, the universe is in the soul.',
    ],
    meditationStyles: ['presence', 'guided_visualization', 'surrender'],
  },

  // ========== PSYCHOLOGY & HEALING ==========
  {
    name: 'Carl Jung',
    tradition: 'psychology_healing',
    themes: ['shadow healing', 'individuation', 'wholeness', 'archetypes', 'collective unconscious'],
    coreTeaching: 'Until you make the unconscious conscious, it will direct your life and you will call it fate.',
    quotes: [
      'Who looks outside, dreams; who looks inside, awakes.',
      'I am not what happened to me. I am what I choose to become.',
      'The privilege of a lifetime is to become who you truly are.',
      'Everything that irritates us about others can lead us to an understanding of ourselves.',
    ],
    meditationStyles: ['shadow_work', 'guided_visualization', 'inquiry', 'presence'],
  },
  {
    name: 'Abraham Maslow',
    tradition: 'psychology_healing',
    themes: ['self-actualization', 'peak experiences', 'hierarchy of needs', 'human potential'],
    coreTeaching: 'What a man can be, he must be. Self-actualization is the full realization of one\'s potential.',
    quotes: [
      'What is necessary to change a person is to change his awareness of himself.',
      'In any given moment we have two options: to step forward into growth or step back into safety.',
      'One can choose to go back toward safety or forward toward growth.',
    ],
    meditationStyles: ['guided_visualization', 'affirmations', 'gratitude', 'manifestation'],
  },
  {
    name: 'Viktor Frankl',
    tradition: 'psychology_healing',
    themes: ['meaning', 'resilience', 'inner freedom', 'logotherapy', 'suffering'],
    coreTeaching: 'He who has a why to live can bear almost any how.',
    quotes: [
      'When we are no longer able to change a situation, we are challenged to change ourselves.',
      "Everything can be taken from a man but one thing: the last of the human freedoms—to choose one's attitude in any given set of circumstances.",
      'Those who have a "why" to live, can bear with almost any "how".',
      'Between stimulus and response there is a space. In that space is our power to choose our response.',
    ],
    meditationStyles: ['inquiry', 'gratitude', 'affirmations', 'presence'],
  },
  {
    name: 'Gabor Maté',
    tradition: 'psychology_healing',
    themes: ['trauma healing', 'compassion-based growth', 'addiction', 'authenticity'],
    coreTeaching: 'Trauma is not what happens to you; it is what happens inside you as a result of what happens to you.',
    quotes: [
      'The attempt to escape from pain is what creates more pain.',
      'Not why the addiction, but why the pain.',
      'Safety is not the absence of threat, it is the presence of connection.',
      'The greatest damage done by neglect, trauma, or emotional loss is not the immediate pain but the long-term distortions it induces.',
    ],
    meditationStyles: ['shadow_work', 'body_scan', 'loving_kindness', 'breathwork'],
  },
  {
    name: 'David Hawkins',
    tradition: 'psychology_healing',
    themes: ['levels of consciousness', 'surrender', 'letting go', 'calibration'],
    coreTeaching: 'Letting go involves being aware of a feeling, letting it come up, staying with it, and letting it run its course without wanting to make it different.',
    quotes: [
      'Every thought, action, decision, or feeling creates an eddy in the interlocking, interbalancing energy fields of life.',
      "The only way to enhance one's power in the world is by increasing one's integrity, understanding, and capacity for compassion.",
      'It is only the minority of people who seek self-improvement or personal growth.',
    ],
    meditationStyles: ['surrender', 'presence', 'inquiry', 'loving_kindness'],
  },
  {
    name: 'Richard Schwartz',
    tradition: 'psychology_healing',
    themes: ['internal family systems', 'self-compassion', 'parts work', 'inner healing'],
    coreTeaching: 'All parts are welcome. Every part of you has a positive intent, even if its methods are misguided.',
    quotes: [
      'The Self is naturally compassionate, curious, calm, confident, courageous, clear, creative, and connected.',
      'All parts are welcome.',
      'There are no bad parts, only parts stuck in bad roles.',
    ],
    meditationStyles: ['shadow_work', 'loving_kindness', 'guided_visualization', 'inquiry'],
  },

  // ========== MINDFULNESS TEACHERS ==========
  {
    name: 'Thich Nhat Hanh',
    tradition: 'mindfulness',
    themes: ['mindfulness', 'compassion', 'peace', 'interbeing', 'engaged buddhism'],
    coreTeaching: 'Breathing in, I calm my body. Breathing out, I smile. This is the present moment.',
    quotes: [
      'Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.',
      'Walk as if you are kissing the Earth with your feet.',
      'Because you are alive, everything is possible.',
      'Smile, breathe, and go slowly.',
      'The present moment is filled with joy and happiness. If you are attentive, you will see it.',
    ],
    meditationStyles: ['breathwork', 'walking_meditation', 'loving_kindness', 'presence', 'body_scan'],
  },
  {
    name: 'Ram Dass',
    tradition: 'mindfulness',
    themes: ['love', 'service', 'spiritual integration', 'be here now', 'devotion'],
    coreTeaching: 'Be here now. We are all just walking each other home.',
    quotes: [
      'The quieter you become, the more you can hear.',
      "We're all just walking each other home.",
      'The next message you need is always right where you are.',
      'Treat everyone you meet like God in drag.',
      'I would like my life to be a statement of love and compassion.',
    ],
    meditationStyles: ['presence', 'loving_kindness', 'breathwork', 'gratitude'],
  },
  {
    name: 'Byron Katie',
    tradition: 'mindfulness',
    themes: ['inquiry', 'freedom from limiting thoughts', 'the work', 'loving what is'],
    coreTeaching: 'When you argue with reality, you lose—but only 100% of the time.',
    quotes: [
      'A thought is harmless unless we believe it.',
      'Suffering is optional.',
      'The only time we suffer is when we believe a thought that argues with what is.',
      'Life is simple. Everything happens for you, not to you.',
    ],
    meditationStyles: ['inquiry', 'presence', 'surrender', 'affirmations'],
  },
  {
    name: 'Wayne Dyer',
    tradition: 'mindfulness',
    themes: ['intentional living', 'self-love', 'manifestation', 'spiritual awakening'],
    coreTeaching: 'When you change the way you look at things, the things you look at change.',
    quotes: [
      'If you change the way you look at things, the things you look at change.',
      "You cannot be lonely if you like the person you're alone with.",
      'How people treat you is their karma; how you react is yours.',
      "Be miserable. Or motivate yourself. Whatever has to be done, it's always your choice.",
    ],
    meditationStyles: ['affirmations', 'manifestation', 'gratitude', 'guided_visualization'],
  },
  {
    name: 'Louise Hay',
    tradition: 'mindfulness',
    themes: ['self-healing', 'affirmations', 'worthiness', 'self-love', 'mirror work'],
    coreTeaching: "You have been criticizing yourself for years and it hasn't worked. Try approving of yourself and see what happens.",
    quotes: [
      "You have been criticizing yourself for years and it hasn't worked. Try approving of yourself and see what happens.",
      'Every thought we think is creating our future.',
      'I do not fix problems. I fix my thinking. Then problems fix themselves.',
      "Remember, you have been criticizing yourself for years and it hasn't worked. Try approving of yourself and see what happens.",
    ],
    meditationStyles: ['affirmations', 'loving_kindness', 'body_scan', 'gratitude'],
  },

  // ========== SCIENTISTS BRIDGING CONSCIOUSNESS ==========
  {
    name: 'Albert Einstein',
    tradition: 'science_consciousness',
    themes: ['interconnectedness', 'compassion', 'humility', 'wonder', 'imagination'],
    coreTeaching: 'A human being is part of the whole, called by us "Universe." We experience ourselves as something separate—an optical delusion.',
    quotes: [
      'Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.',
      'The most beautiful thing we can experience is the mysterious.',
      'A human being is a part of the whole called by us universe.',
      'Logic will get you from A to Z; imagination will get you everywhere.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'inquiry', 'gratitude'],
  },
  {
    name: 'Nikola Tesla',
    tradition: 'science_consciousness',
    themes: ['energy', 'vibration', 'service to humanity', 'frequency', 'universe secrets'],
    coreTeaching: 'If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.',
    quotes: [
      'If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.',
      'The day science begins to study non-physical phenomena, it will make more progress in one decade than in all the previous centuries of its existence.',
      'My brain is only a receiver, in the Universe there is a core from which we obtain knowledge, strength and inspiration.',
    ],
    meditationStyles: ['breathwork', 'guided_visualization', 'presence', 'manifestation'],
  },
  {
    name: 'Rupert Sheldrake',
    tradition: 'science_consciousness',
    themes: ['morphic fields', 'collective consciousness', 'memory in nature', 'interconnection'],
    coreTeaching: 'Memory is inherent in nature. The laws of nature are more like habits.',
    quotes: [
      'The hypothesis of morphic resonance leads to a fundamentally different picture of evolution.',
      'Science is being held back by old assumptions that have hardened into dogmas.',
      'Nature is not a machine. Organisms are alive.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'loving_kindness'],
  },
  {
    name: 'Ervin Laszlo',
    tradition: 'science_consciousness',
    themes: ['systems theory', 'planetary consciousness', 'akashic field', 'holism'],
    coreTeaching: 'We are connected with each other and with the cosmos at the deepest level of our being.',
    quotes: [
      'The cosmos is a living system that evolves toward ever higher forms of coherence and complexity.',
      'In the emerging vision of science, everything that exists is connected with everything else.',
      'Consciousness is the fundamental reality of the cosmos.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'loving_kindness', 'gratitude'],
  },

  // ========== HYPNOSIS & SUBCONSCIOUS WORK ==========
  {
    name: 'Milton Erickson',
    tradition: 'psychology_healing',
    themes: ['hypnotherapy', 'indirect suggestion', 'unconscious mind', 'therapeutic metaphor', 'trance states'],
    coreTeaching: 'Your unconscious mind is far wiser than your conscious mind. Trust its wisdom.',
    quotes: [
      'The unconscious mind is a vast storehouse of resources and learnings.',
      'Change can occur at the unconscious level without conscious understanding.',
      'Every person has within them the resources they need to make the changes they desire.',
      'Patients are patients because they are out of rapport with their own unconscious.',
    ],
    meditationStyles: ['guided_visualization', 'body_scan', 'sleep_story', 'surrender'],
  },
  {
    name: 'Dave Elman',
    tradition: 'psychology_healing',
    themes: ['rapid induction', 'somnambulism', 'pain management', 'hypnotic depth'],
    coreTeaching: 'Hypnosis is a natural state that can be accessed quickly and used for profound healing.',
    quotes: [
      'Hypnosis is the bypass of the critical factor of the conscious mind.',
      'The deeper the trance, the more effective the suggestion.',
      'All hypnosis is self-hypnosis - the hypnotist is merely a guide.',
    ],
    meditationStyles: ['body_scan', 'guided_visualization', 'presence'],
  },

  // ========== JOURNEY WORK & SHAMANISM ==========
  {
    name: 'Sandra Ingerman',
    tradition: 'ancient_wisdom',
    themes: ['shamanic journey', 'soul retrieval', 'power animals', 'spiritual healing', 'earth wisdom'],
    coreTeaching: 'Shamanic journeying allows us to access the wisdom of the spirit world for healing and guidance.',
    quotes: [
      'When we lose a part of ourselves, it goes to a safe place until we are ready to retrieve it.',
      'Power animals are spiritual allies who guide and protect us.',
      'The invisible world is alive and wants to communicate with us.',
      'Healing happens when we restore the parts of ourselves that were lost.',
    ],
    meditationStyles: ['guided_visualization', 'shadow_work', 'presence'],
  },
  {
    name: 'Michael Harner',
    tradition: 'ancient_wisdom',
    themes: ['core shamanism', 'non-ordinary reality', 'shamanic drumming', 'power retrieval'],
    coreTeaching: 'The shamanic journey is a universal human experience for accessing wisdom and healing.',
    quotes: [
      'Shamanism is not a belief system but a method.',
      'The spirits want to help - we just need to learn how to connect with them.',
      'In shamanic work, we don\'t believe - we experience directly.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'inquiry'],
  },
  {
    name: 'Brian Weiss',
    tradition: 'psychology_healing',
    themes: ['past life regression', 'between-lives', 'soul healing', 'reincarnation', 'karmic patterns'],
    coreTeaching: 'Healing current life issues often requires understanding and resolving patterns from past lives.',
    quotes: [
      'Love is the ultimate reality. It is the only. The all.',
      'Understanding breeds love. Fear breeds hatred.',
      'Our loved ones never truly leave us - they continue in another form.',
      'The purpose of life is to learn and to love.',
    ],
    meditationStyles: ['guided_visualization', 'shadow_work', 'loving_kindness'],
  },
  {
    name: 'Dolores Cannon',
    tradition: 'modern_consciousness',
    themes: ['past life regression', 'QHHT', 'higher self', 'cosmic consciousness', 'Earth changes'],
    coreTeaching: 'The subconscious mind knows everything and can access any information from any time.',
    quotes: [
      'There are no limits except those we place upon ourselves.',
      'The subconscious has access to all knowledge.',
      'We are all volunteers who came here to help Earth through this transition.',
      'Your true self is eternal and limitless.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'inquiry'],
  },
  {
    name: 'Robert Monroe',
    tradition: 'modern_consciousness',
    themes: ['out-of-body experience', 'astral projection', 'consciousness exploration', 'focus levels'],
    coreTeaching: 'We are more than our physical bodies. Consciousness can travel beyond physical boundaries.',
    quotes: [
      'You are more than your physical body.',
      'The greatest illusion is that we are only physical beings.',
      'Fear is the greatest barrier to out-of-body experiences.',
      'Once you have the experience, you know you are not just your body.',
    ],
    meditationStyles: ['guided_visualization', 'presence', 'breathwork'],
  },

  // ========== AFFIRMATION & MANIFESTATION MASTERS ==========
  {
    name: 'Florence Scovel Shinn',
    tradition: 'modern_consciousness',
    themes: ['spoken word', 'affirmations', 'divine law', 'faith', 'prosperity consciousness'],
    coreTeaching: 'Your word is your wand. What you speak, you create.',
    quotes: [
      'Your word is your wand. The words you speak create your own destiny.',
      'Faith knows it has already received and acts accordingly.',
      'Every great work, every big accomplishment, has been brought into manifestation through holding to the vision.',
      'Infinite Spirit, open the way for my great abundance. I am an irresistible magnet for all that belongs to me by Divine Right.',
    ],
    meditationStyles: ['affirmations', 'manifestation', 'gratitude'],
  },
  {
    name: 'Neville Goddard',
    tradition: 'modern_consciousness',
    themes: ['imagination', 'feeling is the secret', 'assumption', 'I AM', 'consciousness creates reality'],
    coreTeaching: 'Assume the feeling of the wish fulfilled and it must come to pass.',
    quotes: [
      'Imagination is the beginning of creation.',
      'Assume the feeling of your wish fulfilled.',
      'An assumption, though false, if persisted in, will harden into fact.',
      'Change your conception of yourself and you will automatically change the world in which you live.',
    ],
    meditationStyles: ['affirmations', 'manifestation', 'guided_visualization'],
  },
  {
    name: 'Joseph Murphy',
    tradition: 'modern_consciousness',
    themes: ['subconscious mind', 'prayer', 'belief', 'mental imagery', 'prosperity'],
    coreTeaching: 'The subconscious mind accepts whatever is impressed upon it and proceeds to manifest it.',
    quotes: [
      'Your subconscious mind does not argue with you. It accepts what your conscious mind decrees.',
      'The feeling of wealth produces wealth.',
      'Just keep your conscious mind busy with expectation of the best.',
      'Whatever you impress on your subconscious mind will be expressed as your reality.',
    ],
    meditationStyles: ['affirmations', 'manifestation', 'sleep_story'],
  },
];

// ============================================================================
// CORE PRINCIPLES
// ============================================================================

export const CORE_PRINCIPLES = [
  {
    id: 'beyond_conditioning',
    principle: 'Human beings are more than their conditioning',
    description: 'You are not your thoughts, habits, or past experiences. Your true nature is infinite potential.',
    relatedTeachers: ['Bruce Lipton', 'Joe Dispenza', 'Eckhart Tolle', 'Byron Katie'],
  },
  {
    id: 'beliefs_shape_reality',
    principle: 'Beliefs shape reality',
    description: 'Your perceptions and beliefs create your experience of life. Change your beliefs, change your world.',
    relatedTeachers: ['Bruce Lipton', 'Bob Proctor', 'Wayne Dyer', 'Louise Hay'],
  },
  {
    id: 'love_gratitude',
    principle: 'Love and gratitude are transformative forces',
    description: 'The vibrations of love and gratitude have the power to heal, transform, and manifest.',
    relatedTeachers: ['Rumi', 'Thich Nhat Hanh', 'Marianne Williamson', 'Ram Dass'],
  },
  {
    id: 'heal_self_heal_world',
    principle: 'Healing the self heals the world',
    description: 'Your inner transformation ripples outward. Personal healing contributes to collective healing.',
    relatedTeachers: ['Carl Jung', 'Gabor Maté', 'Thich Nhat Hanh', 'Lynne McTaggart'],
  },
  {
    id: 'consciousness_evolution',
    principle: 'Consciousness evolution is humanity\'s next step',
    description: 'We are at a pivotal moment in human evolution. The expansion of consciousness is our collective destiny.',
    relatedTeachers: ['David Hawkins', 'Ervin Laszlo', 'John Hagelin', 'Deepak Chopra'],
  },
];

// ============================================================================
// MEDITATION TYPES
// ============================================================================

export interface MeditationTypeInfo {
  id: MeditationType;
  name: string;
  description: string;
  benefits: string[];
  bestFor: string[];
  duration: { min: number; recommended: number; max: number };
  relatedTeachers: string[];
  relatedTraditions: WisdomTradition[];
}

export const MEDITATION_TYPES: MeditationTypeInfo[] = [
  {
    id: 'guided_visualization',
    name: 'Guided Visualization',
    description: 'Journey through immersive mental imagery to access deeper states of consciousness and manifest desired outcomes.',
    benefits: ['Stress relief', 'Goal manifestation', 'Creativity boost', 'Emotional healing'],
    bestFor: ['anxiety', 'manifestation', 'creativity', 'healing', 'relaxation'],
    duration: { min: 5, recommended: 15, max: 45 },
    relatedTeachers: ['Joe Dispenza', 'Deepak Chopra', 'Wayne Dyer', 'Gregg Braden'],
    relatedTraditions: ['modern_consciousness', 'mindfulness'],
  },
  {
    id: 'breathwork',
    name: 'Breathwork',
    description: 'Conscious breathing techniques to regulate the nervous system, release emotions, and expand awareness.',
    benefits: ['Nervous system regulation', 'Emotional release', 'Energy boost', 'Mental clarity'],
    bestFor: ['stress', 'anxiety', 'energy', 'focus', 'emotional release'],
    duration: { min: 3, recommended: 10, max: 30 },
    relatedTeachers: ['Thich Nhat Hanh', 'Buddha', 'Paramahansa Yogananda', 'Joe Dispenza'],
    relatedTraditions: ['ancient_wisdom', 'mindfulness'],
  },
  {
    id: 'body_scan',
    name: 'Body Scan / Progressive Relaxation',
    description: 'Systematic attention through the body to release tension, develop body awareness, and ground into presence.',
    benefits: ['Deep relaxation', 'Body awareness', 'Tension release', 'Better sleep'],
    bestFor: ['insomnia', 'tension', 'stress', 'grounding', 'body awareness'],
    duration: { min: 10, recommended: 20, max: 45 },
    relatedTeachers: ['Thich Nhat Hanh', 'Gabor Maté', 'Louise Hay', 'Eckhart Tolle'],
    relatedTraditions: ['mindfulness', 'psychology_healing'],
  },
  {
    id: 'loving_kindness',
    name: 'Loving-Kindness (Metta)',
    description: 'Cultivate unconditional love and compassion for yourself and all beings.',
    benefits: ['Self-compassion', 'Relationship healing', 'Emotional warmth', 'Reduced anger'],
    bestFor: ['self-criticism', 'relationship issues', 'anger', 'isolation', 'compassion'],
    duration: { min: 5, recommended: 15, max: 30 },
    relatedTeachers: ['Buddha', 'Thich Nhat Hanh', 'Ram Dass', 'Marianne Williamson'],
    relatedTraditions: ['ancient_wisdom', 'mindfulness'],
  },
  {
    id: 'sleep_story',
    name: 'Sleep Story',
    description: 'Gentle narrative journeys designed to quiet the mind and guide you into restful sleep.',
    benefits: ['Better sleep', 'Reduced insomnia', 'Relaxation', 'Dream enhancement'],
    bestFor: ['insomnia', 'racing thoughts', 'nighttime anxiety', 'restlessness'],
    duration: { min: 15, recommended: 25, max: 60 },
    relatedTeachers: ['Eckhart Tolle', 'Thich Nhat Hanh', 'Lao Tzu'],
    relatedTraditions: ['mindfulness', 'ancient_wisdom'],
  },
  {
    id: 'affirmations',
    name: 'Affirmations',
    description: 'Positive statements to reprogram limiting beliefs and align with your highest potential.',
    benefits: ['Confidence boost', 'Belief transformation', 'Self-love', 'Motivation'],
    bestFor: ['low self-esteem', 'negative self-talk', 'goal setting', 'confidence'],
    duration: { min: 3, recommended: 10, max: 20 },
    relatedTeachers: ['Louise Hay', 'Bob Proctor', 'Wayne Dyer', 'Bruce Lipton'],
    relatedTraditions: ['modern_consciousness', 'mindfulness'],
  },
  {
    id: 'walking_meditation',
    name: 'Walking Meditation',
    description: 'Mindful movement practice that integrates awareness with each step.',
    benefits: ['Grounding', 'Present moment awareness', 'Physical-spiritual integration', 'Energy flow'],
    bestFor: ['restlessness', 'grounding', 'movement lovers', 'nature connection'],
    duration: { min: 10, recommended: 20, max: 60 },
    relatedTeachers: ['Thich Nhat Hanh', 'Buddha', 'Lao Tzu'],
    relatedTraditions: ['mindfulness', 'ancient_wisdom'],
  },
  {
    id: 'shadow_work',
    name: 'Shadow Work / Inner Child Healing',
    description: 'Explore and integrate hidden aspects of yourself for wholeness and self-acceptance.',
    benefits: ['Emotional healing', 'Self-integration', 'Pattern breaking', 'Authentic expression'],
    bestFor: ['trauma', 'recurring patterns', 'self-sabotage', 'emotional blocks'],
    duration: { min: 15, recommended: 25, max: 45 },
    relatedTeachers: ['Carl Jung', 'Richard Schwartz', 'Gabor Maté', 'Marianne Williamson'],
    relatedTraditions: ['psychology_healing'],
  },
  {
    id: 'gratitude',
    name: 'Gratitude Practice',
    description: 'Cultivate appreciation for life\'s blessings to shift your vibration and attract abundance.',
    benefits: ['Mood elevation', 'Abundance mindset', 'Relationship improvement', 'Life satisfaction'],
    bestFor: ['negativity', 'scarcity mindset', 'depression', 'dissatisfaction'],
    duration: { min: 5, recommended: 10, max: 20 },
    relatedTeachers: ['Eckhart Tolle', 'Wayne Dyer', 'Gregg Braden', 'Ram Dass'],
    relatedTraditions: ['mindfulness', 'modern_consciousness'],
  },
  {
    id: 'manifestation',
    name: 'Manifestation / Intention Setting',
    description: 'Align your thoughts, emotions, and energy with your desired reality.',
    benefits: ['Goal clarity', 'Energetic alignment', 'Inspired action', 'Reality creation'],
    bestFor: ['goal setting', 'life transitions', 'creating change', 'vision clarity'],
    duration: { min: 10, recommended: 20, max: 30 },
    relatedTeachers: ['Joe Dispenza', 'Bob Proctor', 'Lynne McTaggart', 'Gregg Braden'],
    relatedTraditions: ['modern_consciousness'],
  },
  {
    id: 'presence',
    name: 'Pure Presence / Being',
    description: 'Rest in the simple awareness of this moment, beyond thought and doing.',
    benefits: ['Inner peace', 'Ego dissolution', 'Spiritual awakening', 'Mental stillness'],
    bestFor: ['overthinking', 'spiritual seeking', 'peace', 'awakening'],
    duration: { min: 5, recommended: 20, max: 60 },
    relatedTeachers: ['Eckhart Tolle', 'Lao Tzu', 'Buddha', 'Ram Dass'],
    relatedTraditions: ['ancient_wisdom', 'mindfulness'],
  },
  {
    id: 'inquiry',
    name: 'Self-Inquiry',
    description: 'Question your thoughts and beliefs to discover your true nature beyond the mind.',
    benefits: ['Mental freedom', 'Self-knowledge', 'Belief liberation', 'Clarity'],
    bestFor: ['limiting beliefs', 'self-discovery', 'mental patterns', 'truth seeking'],
    duration: { min: 10, recommended: 20, max: 45 },
    relatedTeachers: ['Byron Katie', 'Socrates', 'Carl Jung', 'Eckhart Tolle'],
    relatedTraditions: ['mindfulness', 'psychology_healing'],
  },
  {
    id: 'surrender',
    name: 'Surrender / Letting Go',
    description: 'Release control and trust in the flow of life.',
    benefits: ['Peace', 'Trust', 'Emotional release', 'Spiritual opening'],
    bestFor: ['control issues', 'anxiety', 'resistance', 'grief'],
    duration: { min: 10, recommended: 20, max: 30 },
    relatedTeachers: ['David Hawkins', 'Lao Tzu', 'Eckhart Tolle', 'Epictetus'],
    relatedTraditions: ['ancient_wisdom', 'psychology_healing'],
  },
];

// ============================================================================
// MOOD/EMOTION MAPPING
// ============================================================================

export interface EmotionalState {
  id: string;
  emotions: string[];
  suggestedMeditations: MeditationType[];
  suggestedTeachers: string[];
  supportiveMessage: string;
}

export const EMOTIONAL_STATES: EmotionalState[] = [
  {
    id: 'anxious',
    emotions: ['anxious', 'worried', 'nervous', 'panicked', 'fearful', 'scared', 'uneasy'],
    suggestedMeditations: ['breathwork', 'body_scan', 'presence', 'guided_visualization'],
    suggestedTeachers: ['Thich Nhat Hanh', 'Eckhart Tolle', 'Epictetus'],
    supportiveMessage: 'Anxiety often lives in thoughts about the future. Let\'s bring you back to this moment, where you are safe.',
  },
  {
    id: 'sad',
    emotions: ['sad', 'depressed', 'down', 'melancholy', 'grieving', 'heartbroken', 'hopeless'],
    suggestedMeditations: ['loving_kindness', 'gratitude', 'surrender', 'shadow_work'],
    suggestedTeachers: ['Rumi', 'Viktor Frankl', 'Ram Dass', 'Gabor Maté'],
    supportiveMessage: 'Your feelings are valid. Sometimes the heart needs to feel its depths before it can rise again.',
  },
  {
    id: 'angry',
    emotions: ['angry', 'frustrated', 'irritated', 'resentful', 'bitter', 'furious'],
    suggestedMeditations: ['breathwork', 'loving_kindness', 'inquiry', 'surrender'],
    suggestedTeachers: ['Thich Nhat Hanh', 'Byron Katie', 'Marcus Aurelius'],
    supportiveMessage: 'Anger often points to unmet needs or boundaries. Let\'s explore this energy with compassion.',
  },
  {
    id: 'stressed',
    emotions: ['stressed', 'overwhelmed', 'burnt out', 'exhausted', 'pressured', 'tense'],
    suggestedMeditations: ['body_scan', 'breathwork', 'presence', 'surrender'],
    suggestedTeachers: ['Eckhart Tolle', 'Thich Nhat Hanh', 'Lao Tzu'],
    supportiveMessage: 'You\'ve been carrying a lot. Let\'s put it down, even just for a few minutes.',
  },
  {
    id: 'confused',
    emotions: ['confused', 'lost', 'uncertain', 'indecisive', 'unclear', 'scattered'],
    suggestedMeditations: ['presence', 'inquiry', 'breathwork', 'guided_visualization'],
    suggestedTeachers: ['Lao Tzu', 'Socrates', 'Eckhart Tolle'],
    supportiveMessage: 'Clarity often comes in stillness. Let\'s quiet the mind and see what emerges.',
  },
  {
    id: 'unmotivated',
    emotions: ['unmotivated', 'stuck', 'blocked', 'uninspired', 'apathetic', 'lazy'],
    suggestedMeditations: ['affirmations', 'manifestation', 'gratitude', 'breathwork'],
    suggestedTeachers: ['Bob Proctor', 'Wayne Dyer', 'Abraham Maslow'],
    supportiveMessage: 'Your spark is still there—it may just need a little kindling. Let\'s reconnect with your purpose.',
  },
  {
    id: 'lonely',
    emotions: ['lonely', 'isolated', 'disconnected', 'alone', 'abandoned'],
    suggestedMeditations: ['loving_kindness', 'presence', 'gratitude', 'guided_visualization'],
    suggestedTeachers: ['Ram Dass', 'Rumi', 'Thich Nhat Hanh'],
    supportiveMessage: 'You are never truly alone. You are connected to all of existence. Let\'s feel that connection together.',
  },
  {
    id: 'self_critical',
    emotions: ['self-critical', 'ashamed', 'guilty', 'unworthy', 'not good enough', 'self-hatred'],
    suggestedMeditations: ['loving_kindness', 'affirmations', 'shadow_work'],
    suggestedTeachers: ['Louise Hay', 'Richard Schwartz', 'Marianne Williamson'],
    supportiveMessage: 'You are worthy of love—especially your own. Let\'s practice treating yourself as you would a dear friend.',
  },
  {
    id: 'seeking_peace',
    emotions: ['need peace', 'want calm', 'seeking stillness', 'need quiet', 'want serenity'],
    suggestedMeditations: ['presence', 'breathwork', 'body_scan', 'sleep_story'],
    suggestedTeachers: ['Eckhart Tolle', 'Thich Nhat Hanh', 'Buddha', 'Lao Tzu'],
    supportiveMessage: 'Peace is not something to find—it\'s something to uncover. It\'s already within you.',
  },
  {
    id: 'grateful',
    emotions: ['grateful', 'thankful', 'appreciative', 'blessed', 'content'],
    suggestedMeditations: ['gratitude', 'loving_kindness', 'manifestation'],
    suggestedTeachers: ['Ram Dass', 'Eckhart Tolle', 'Thich Nhat Hanh'],
    supportiveMessage: 'What a beautiful state to be in. Let\'s deepen this feeling and let it radiate outward.',
  },
  {
    id: 'seeking_growth',
    emotions: ['want to grow', 'seeking transformation', 'ready for change', 'want to evolve'],
    suggestedMeditations: ['manifestation', 'affirmations', 'inquiry', 'shadow_work'],
    suggestedTeachers: ['Joe Dispenza', 'Carl Jung', 'Abraham Maslow', 'Bob Proctor'],
    supportiveMessage: 'Your desire for growth is the first step. You\'re already becoming who you\'re meant to be.',
  },
  {
    id: 'cant_sleep',
    emotions: ['can\'t sleep', 'insomnia', 'restless', 'racing thoughts', 'wide awake'],
    suggestedMeditations: ['sleep_story', 'body_scan', 'breathwork', 'presence'],
    suggestedTeachers: ['Thich Nhat Hanh', 'Eckhart Tolle'],
    supportiveMessage: 'Let\'s gently guide your busy mind toward rest. You deserve peaceful sleep.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a teacher by name
 */
export function getTeacher(name: string): WisdomTeacher | undefined {
  return WISDOM_TEACHERS.find(t => t.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get teachers by tradition
 */
export function getTeachersByTradition(tradition: WisdomTradition): WisdomTeacher[] {
  return WISDOM_TEACHERS.filter(t => t.tradition === tradition);
}

/**
 * Get teachers relevant to a meditation type
 */
export function getTeachersForMeditation(type: MeditationType): WisdomTeacher[] {
  return WISDOM_TEACHERS.filter(t => t.meditationStyles.includes(type));
}

/**
 * Get a random quote from a teacher
 */
export function getRandomQuote(teacherName?: string): { quote: string; teacher: string } {
  if (teacherName) {
    const teacher = getTeacher(teacherName);
    if (teacher && teacher.quotes.length > 0) {
      const quote = teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)];
      return { quote, teacher: teacher.name };
    }
  }

  // Random teacher, random quote
  const teacher = WISDOM_TEACHERS[Math.floor(Math.random() * WISDOM_TEACHERS.length)];
  const quote = teacher.quotes[Math.floor(Math.random() * teacher.quotes.length)];
  return { quote, teacher: teacher.name };
}

/**
 * Find emotional state from user input with enhanced semantic matching
 * Uses weighted scoring for more accurate detection
 */
export function detectEmotionalState(input: string): EmotionalState | undefined {
  const lowered = input.toLowerCase();

  // First, try exact/partial keyword matching
  const directMatch = EMOTIONAL_STATES.find(state =>
    state.emotions.some(emotion => lowered.includes(emotion))
  );
  if (directMatch) return directMatch;

  // Enhanced semantic matching with synonyms and context phrases
  const semanticPatterns: Record<string, string[]> = {
    'anxious': [
      'heart racing', 'can\'t calm down', 'mind won\'t stop', 'racing thoughts',
      'butterflies', 'on edge', 'tight chest', 'can\'t breathe', 'panic', 'freaking out',
      'so much going on', 'big day', 'job interview', 'presentation', 'exam',
      'meeting tomorrow', 'deadline', 'pressure'
    ],
    'stressed': [
      'overwhelmed', 'too much', 'drowning', 'can\'t handle', 'at my limit',
      'burned out', 'running on empty', 'exhausted', 'drained', 'swamped',
      'work is killing', 'no break', 'non-stop'
    ],
    'sad': [
      'feeling low', 'heavy heart', 'empty inside', 'lost someone', 'miss them',
      'crying', 'tears', 'heartache', 'broke up', 'alone', 'nobody cares',
      'what\'s the point', 'feeling blue', 'down in the dumps'
    ],
    'cant_sleep': [
      'wide awake', 'tossing and turning', 'mind racing at night', '3am',
      'middle of the night', 'can\'t fall asleep', 'woke up', 'tired but wired',
      'exhausted but can\'t sleep', 'bed time', 'going to sleep', 'ready for bed'
    ],
    'angry': [
      'so mad', 'pissed', 'furious', 'want to scream', 'seeing red',
      'blood boiling', 'can\'t stand', 'hate this', 'unfair'
    ],
    'seeking_peace': [
      'just want peace', 'need calm', 'quiet my mind', 'find stillness',
      'inner peace', 'tranquil', 'serene', 'chill out', 'unwind', 'decompress',
      'relax', 'de-stress', 'wind down'
    ],
    'self_critical': [
      'i\'m so stupid', 'hate myself', 'not good enough', 'failure',
      'can\'t do anything right', 'worthless', 'useless', 'disappointment'
    ],
    'unmotivated': [
      'no energy', 'don\'t feel like', 'can\'t get started', 'procrastinating',
      'stuck in a rut', 'going through the motions', 'lost my drive'
    ],
    'lonely': [
      'no one to talk to', 'feel so alone', 'isolated', 'no friends',
      'disconnected', 'nobody understands'
    ],
    'seeking_growth': [
      'want to improve', 'become better', 'level up', 'transform',
      'new chapter', 'fresh start', 'breakthrough'
    ],
    'grateful': [
      'so blessed', 'thankful for', 'appreciate', 'lucky to have',
      'feeling good about', 'happy today'
    ]
  };

  // Score each emotional state based on pattern matches
  let bestMatch: EmotionalState | undefined;
  let highestScore = 0;

  for (const [stateId, patterns] of Object.entries(semanticPatterns)) {
    const matchCount = patterns.filter(pattern => lowered.includes(pattern)).length;
    if (matchCount > highestScore) {
      highestScore = matchCount;
      bestMatch = EMOTIONAL_STATES.find(s => s.id === stateId);
    }
  }

  return bestMatch;
}

/**
 * Get meditation recommendation based on emotional state
 */
export function getMeditationRecommendation(emotionalStateId: string): {
  meditations: MeditationTypeInfo[];
  teachers: WisdomTeacher[];
  message: string;
} {
  const state = EMOTIONAL_STATES.find(s => s.id === emotionalStateId);
  if (!state) {
    return {
      meditations: [],
      teachers: [],
      message: 'I\'m here to help. What would you like to explore today?',
    };
  }

  const meditations = state.suggestedMeditations
    .map(id => MEDITATION_TYPES.find(m => m.id === id))
    .filter((m): m is MeditationTypeInfo => m !== undefined);

  const teachers = state.suggestedTeachers
    .map(name => getTeacher(name))
    .filter((t): t is WisdomTeacher => t !== undefined);

  return {
    meditations,
    teachers,
    message: state.supportiveMessage,
  };
}

/**
 * Get quotes by theme
 */
export function getQuotesByTheme(theme: string): { quote: string; teacher: string }[] {
  const results: { quote: string; teacher: string }[] = [];
  const themeLower = theme.toLowerCase();

  for (const teacher of WISDOM_TEACHERS) {
    if (teacher.themes.some(t => t.includes(themeLower))) {
      for (const quote of teacher.quotes) {
        results.push({ quote, teacher: teacher.name });
      }
    }
  }

  return results;
}

// ============================================================================
// CONTENT-SPECIFIC RECOMMENDATIONS
// ============================================================================

/**
 * Content type recommendations based on emotional state.
 * Maps emotional states to the best content categories and sub-types.
 */
export interface ContentRecommendation {
  meditation: MeditationType[];
  affirmation: ('power' | 'guided' | 'sleep' | 'mirror_work')[];
  hypnosis: ('light' | 'standard' | 'therapeutic')[];
  journey: ('inner_journey' | 'past_life' | 'spirit_guide' | 'shamanic' | 'astral' | 'akashic' | 'quantum_field')[];
}

export const CONTENT_RECOMMENDATIONS: Record<string, ContentRecommendation> = {
  anxious: {
    meditation: ['breathwork', 'body_scan', 'presence'],
    affirmation: ['power', 'guided'],
    hypnosis: ['light', 'standard'],
    journey: ['inner_journey'],
  },
  stressed: {
    meditation: ['body_scan', 'breathwork', 'presence', 'surrender'],
    affirmation: ['guided', 'sleep'],
    hypnosis: ['light', 'standard'],
    journey: ['inner_journey'],
  },
  sad: {
    meditation: ['loving_kindness', 'gratitude', 'shadow_work'],
    affirmation: ['guided', 'mirror_work'],
    hypnosis: ['standard', 'therapeutic'],
    journey: ['inner_journey', 'spirit_guide'],
  },
  angry: {
    meditation: ['breathwork', 'loving_kindness', 'inquiry'],
    affirmation: ['power', 'guided'],
    hypnosis: ['light', 'standard'],
    journey: ['inner_journey'],
  },
  self_critical: {
    meditation: ['loving_kindness', 'shadow_work'],
    affirmation: ['mirror_work', 'guided'],
    hypnosis: ['standard', 'therapeutic'],
    journey: ['inner_journey', 'spirit_guide'],
  },
  seeking_growth: {
    meditation: ['manifestation', 'inquiry', 'shadow_work'],
    affirmation: ['power', 'guided'],
    hypnosis: ['standard', 'therapeutic'],
    journey: ['past_life', 'spirit_guide', 'quantum_field', 'akashic'],
  },
  cant_sleep: {
    meditation: ['sleep_story', 'body_scan', 'presence'],
    affirmation: ['sleep'],
    hypnosis: ['light'],
    journey: [],
  },
  seeking_peace: {
    meditation: ['presence', 'breathwork', 'body_scan'],
    affirmation: ['guided', 'sleep'],
    hypnosis: ['light'],
    journey: ['inner_journey'],
  },
  lonely: {
    meditation: ['loving_kindness', 'presence', 'gratitude'],
    affirmation: ['guided', 'mirror_work'],
    hypnosis: ['standard'],
    journey: ['spirit_guide', 'inner_journey'],
  },
  unmotivated: {
    meditation: ['affirmations', 'manifestation', 'gratitude'],
    affirmation: ['power'],
    hypnosis: ['standard'],
    journey: ['quantum_field'],
  },
  confused: {
    meditation: ['presence', 'inquiry', 'breathwork'],
    affirmation: ['guided'],
    hypnosis: ['standard'],
    journey: ['akashic', 'spirit_guide'],
  },
  grateful: {
    meditation: ['gratitude', 'loving_kindness', 'manifestation'],
    affirmation: ['power', 'guided'],
    hypnosis: [],
    journey: ['quantum_field'],
  },
};

/**
 * Get content recommendations for an emotional state
 */
export function getContentRecommendation(emotionalStateId: string): ContentRecommendation | null {
  return CONTENT_RECOMMENDATIONS[emotionalStateId] || null;
}

/**
 * Get teachers relevant to a specific content category
 */
export function getTeachersForContentCategory(category: 'hypnosis' | 'journey' | 'affirmation'): WisdomTeacher[] {
  const themeMapping: Record<string, string[]> = {
    hypnosis: ['hypnotherapy', 'hypnotic', 'trance', 'subconscious', 'unconscious mind', 'induction'],
    journey: ['shamanic', 'past life', 'astral', 'out-of-body', 'akashic', 'soul retrieval', 'spirit guide'],
    affirmation: ['affirmation', 'spoken word', 'I AM', 'subconscious mind', 'belief', 'assumption'],
  };

  const relevantThemes = themeMapping[category] || [];

  return WISDOM_TEACHERS.filter(teacher =>
    teacher.themes.some(theme =>
      relevantThemes.some(rt => theme.toLowerCase().includes(rt.toLowerCase()))
    )
  );
}
