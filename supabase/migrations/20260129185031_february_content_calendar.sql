-- February 2026 Content Calendar
-- Posts every 3 days with engaging captions

-- Clear existing January data and add February content
DELETE FROM public.marketing_content_calendar WHERE scheduled_date < '2026-02-01';

-- February 2026 Posts (every 3 days)
INSERT INTO public.marketing_content_calendar (platform, scheduled_date, content_type, hook, caption, visual_concept, status, client_approved) VALUES
-- Feb 1
('instagram', '2026-02-01', 'reel', 'What if your meditation voice was... YOU?', 'Most meditation apps use a stranger''s voice to guide you. But what if the most calming voice was your own? 🎙️ Innrvo uses AI to clone your voice and create personalized meditations that feel like coming home. Try it free - link in bio.', 'Split screen: generic app vs. personal voice wave animation', 'approved', true),

-- Feb 4
('tiktok', '2026-02-04', 'reel', 'I recorded 30 seconds of my voice and this happened...', 'The results honestly gave me chills. My own voice guiding me through a meditation I wrote about MY stress, MY goals, MY life. This is the future of self-care and I''m here for it. 🧘‍♀️✨ #meditation #selfcare #ai #wellness', 'POV style: recording voice then playing back meditation', 'approved', true),

-- Feb 7
('instagram', '2026-02-07', 'carousel', '5 Signs Your Current Meditation Isn''t Working', '😴 You fall asleep every time\n🤯 Your mind wanders constantly\n😤 You feel MORE stressed after\n🙄 The voice feels disconnected\n⏰ You keep skipping sessions\n\nSound familiar? Swipe to see why personalized meditation changes everything →', '5-slide carousel with illustrated icons for each point', 'created', false),

-- Feb 10
('instagram', '2026-02-10', 'reel', 'POV: You finally found THE meditation app', 'The one that gets you. The one that sounds like you. The one that knows exactly what you need to hear. Welcome to Innrvo. 💜 #meditation #mindfulness #wellness #innrvo', 'Aesthetic morning routine montage with app UI overlay', 'planned', false),

-- Feb 13
('tiktok', '2026-02-13', 'reel', 'Valentine''s Day meditation for self-love 💕', 'Wrote myself a self-love meditation and had Innrvo read it back in MY voice. Crying at 6am wasn''t on my bingo card but here we are. 😭💜 Link in bio to create yours.', 'Cozy setup with candles, journaling, then meditating', 'planned', false),

-- Feb 16
('instagram', '2026-02-16', 'story', 'Behind the scenes: How we train your voice', 'Ever wondered how we clone your voice ethically? Swipe up to see the magic (and the science) behind Innrvo''s AI. Spoiler: Your voice data is YOURS and stays that way.', 'BTS style with tech illustrations', 'planned', false),

-- Feb 19
('linkedin', '2026-02-19', 'post', 'Why generic wellness apps are failing employees', 'Companies spend millions on meditation apps that employees never use. Why? Because one-size-fits-all doesn''t work for wellness. At Innrvo, we''re changing that with personalized AI-powered meditations. Imagine every employee having a meditation that speaks to THEIR stress, in THEIR voice. That''s the future of corporate wellness.', 'Professional infographic on meditation app engagement', 'planned', false),

-- Feb 22
('instagram', '2026-02-22', 'reel', 'Sleep meditation in my own voice = game changer', 'I used to hate my voice. Now it puts me to sleep (in the best way). 😴✨ Created a custom sleep meditation with Innrvo and I''ve been falling asleep faster than ever. Your voice is more soothing than you think.', 'Night routine aesthetic with sleep meditation playing', 'planned', false),

-- Feb 25
('tiktok', '2026-02-25', 'reel', 'Anxiety check-in: Let''s make a meditation together', 'Real talk: February is HARD. So I''m creating a live meditation for anxiety and you''re helping me write it. Comment what you need to hear right now. 💜 #anxiety #mentalhealth #meditation', 'Direct to camera, authentic and raw', 'planned', false),

-- Feb 28
('instagram', '2026-02-28', 'carousel', 'Your February Meditation Wins 🏆', 'This month, our community:\n💜 Created 10,000+ personalized meditations\n🎙️ Cloned 2,500+ voices\n😴 Improved sleep by avg 47%\n🧘‍♀️ Meditated 500,000+ minutes\n\nThank YOU for making February incredible. Here''s to March! 🚀', 'Stats carousel with community highlights', 'planned', false);

-- Update stats for February
UPDATE public.marketing_deliverables
SET status = 'completed', progress = 100
WHERE title = 'Content Calendar - January';
