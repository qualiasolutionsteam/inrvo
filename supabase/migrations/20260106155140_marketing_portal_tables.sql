-- Marketing Portal Tables
-- Client collaboration hub for tracking deliverables, content, influencers, and communications

-- ============================================================================
-- Marketing Deliverables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('strategy', 'social', 'influencer', 'analytics')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_review', 'approved', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE,
  agency_notes TEXT,
  client_feedback TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Client Inputs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_client_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type TEXT NOT NULL CHECK (input_type IN ('brand_values', 'audience_notes', 'competitor_insights', 'content_preferences', 'partnership_ideas')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'incorporated')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Content Calendar
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'twitter', 'linkedin', 'youtube', 'multiple')),
  scheduled_date DATE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'post', 'story', 'carousel', 'live')),
  hook TEXT,
  caption TEXT,
  visual_concept TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'created', 'pending_approval', 'approved', 'published')),
  client_approved BOOLEAN DEFAULT FALSE,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Influencers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'twitter', 'linkedin', 'youtube', 'multiple')),
  follower_count INTEGER,
  niche TEXT,
  status TEXT DEFAULT 'researching' CHECK (status IN ('researching', 'contacted', 'negotiating', 'agreed', 'content_live', 'completed', 'declined')),
  contact_info TEXT,
  collaboration_type TEXT,
  budget NUMERIC(10,2),
  notes TEXT,
  content_url TEXT,
  performance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Partnerships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  partnership_type TEXT CHECK (partnership_type IN ('community', 'affiliate', 'cross_promotion', 'integration', 'media', 'event')),
  contact_name TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'outreach', 'discussing', 'agreed', 'active', 'completed', 'declined')),
  value_proposition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period TEXT NOT NULL,
  report_date DATE NOT NULL,
  summary TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  insights TEXT[],
  recommendations TEXT[],
  client_acknowledged BOOLEAN DEFAULT FALSE,
  report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Communications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_type TEXT NOT NULL CHECK (communication_type IN ('meeting', 'question', 'feedback', 'update', 'decision')),
  title TEXT,
  content TEXT NOT NULL,
  from_agency BOOLEAN DEFAULT TRUE,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Marketing Documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('positioning', 'messaging', 'audience', 'competitor_analysis', 'content_strategy', 'brand_guide', 'campaign_brief')),
  title TEXT NOT NULL,
  description TEXT,
  document_url TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'final')),
  client_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_deliverables_category ON public.marketing_deliverables(category);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON public.marketing_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_due_date ON public.marketing_deliverables(due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_scheduled_date ON public.marketing_content_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_calendar_platform ON public.marketing_content_calendar(platform);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON public.marketing_influencers(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON public.marketing_partnerships(status);
CREATE INDEX IF NOT EXISTS idx_communications_resolved ON public.marketing_communications(is_resolved);

-- ============================================================================
-- RLS Policies (read-only for authenticated users)
-- ============================================================================
ALTER TABLE public.marketing_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_client_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all marketing data
CREATE POLICY "Authenticated users can view marketing deliverables" ON public.marketing_deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing client inputs" ON public.marketing_client_inputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing content calendar" ON public.marketing_content_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing influencers" ON public.marketing_influencers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing partnerships" ON public.marketing_partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing reports" ON public.marketing_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing communications" ON public.marketing_communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view marketing documents" ON public.marketing_documents FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create/update certain tables
CREATE POLICY "Authenticated users can manage client inputs" ON public.marketing_client_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage communications" ON public.marketing_communications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow updates on tables where clients can provide feedback
CREATE POLICY "Authenticated users can update deliverables" ON public.marketing_deliverables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update calendar items" ON public.marketing_content_calendar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update reports" ON public.marketing_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update documents" ON public.marketing_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Seed Data for Demo
-- ============================================================================

-- Strategy Deliverables
INSERT INTO public.marketing_deliverables (category, title, description, status, progress, due_date) VALUES
('strategy', 'Brand Positioning Document', 'Define INrVO''s unique market position in the meditation app space', 'completed', 100, '2026-01-15'),
('strategy', 'Target Audience Personas', 'Create detailed personas for primary and secondary audiences', 'completed', 100, '2026-01-20'),
('strategy', 'Competitive Analysis', 'In-depth analysis of Calm, Headspace, and emerging competitors', 'in_progress', 75, '2026-01-25'),
('strategy', 'Q1 Marketing Strategy', 'Comprehensive marketing plan for January-March 2026', 'in_progress', 60, '2026-01-31');

-- Social Media Deliverables
INSERT INTO public.marketing_deliverables (category, title, description, status, progress, due_date) VALUES
('social', 'Content Calendar - January', 'Full month of planned social content across all platforms', 'completed', 100, '2026-01-05'),
('social', 'Instagram Visual Guidelines', 'Brand-aligned visual templates and style guide', 'pending_review', 90, '2026-01-18'),
('social', 'TikTok Launch Strategy', 'Plan for establishing TikTok presence with viral-optimized content', 'in_progress', 45, '2026-02-01'),
('social', 'Community Engagement Plan', 'Strategy for building engaged community across platforms', 'not_started', 0, '2026-02-15');

-- Influencer Deliverables
INSERT INTO public.marketing_deliverables (category, title, description, status, progress, due_date) VALUES
('influencer', 'Influencer Research & Shortlist', 'Identify 50+ potential wellness influencer partners', 'completed', 100, '2026-01-10'),
('influencer', 'Outreach Templates', 'Personalized outreach templates for different influencer tiers', 'completed', 100, '2026-01-12'),
('influencer', 'Partnership Contracts', 'Standard collaboration agreements and rate cards', 'pending_review', 85, '2026-01-22'),
('influencer', 'Campaign Brief Templates', 'Reusable briefs for influencer content campaigns', 'in_progress', 50, '2026-01-28');

-- Analytics Deliverables
INSERT INTO public.marketing_deliverables (category, title, description, status, progress, due_date) VALUES
('analytics', 'KPI Dashboard Setup', 'Configure real-time marketing metrics dashboard', 'completed', 100, '2026-01-08'),
('analytics', 'Weekly Report Template', 'Standardized weekly performance report format', 'completed', 100, '2026-01-10'),
('analytics', 'Attribution Model', 'Multi-touch attribution for marketing channels', 'in_progress', 30, '2026-02-10'),
('analytics', 'Q1 Baseline Metrics', 'Establish baseline metrics for Q1 performance tracking', 'not_started', 0, '2026-01-31');

-- Content Calendar
INSERT INTO public.marketing_content_calendar (platform, scheduled_date, content_type, hook, caption, status, client_approved) VALUES
('instagram', '2026-01-07', 'reel', 'POV: You finally found inner peace', 'Your voice. Your meditation. Your way. INrVO creates personalized meditations using AI and your own voice. Link in bio.', 'approved', true),
('instagram', '2026-01-09', 'carousel', '5 Signs You Need a Mental Reset', 'Feeling overwhelmed? These signs might be telling you something... Swipe to learn more.', 'approved', true),
('tiktok', '2026-01-10', 'reel', 'I cloned my voice for meditation', 'Wait until you hear this... I recorded 30 seconds of my voice and now I have unlimited personalized meditations', 'created', false),
('instagram', '2026-01-12', 'story', 'Behind the scenes', 'A day in the life of building INrVO', 'planned', false),
('linkedin', '2026-01-14', 'post', 'The future of wellness is personalized', 'Why one-size-fits-all meditation apps are failing users, and what we''re doing differently at INrVO.', 'planned', false),
('instagram', '2026-01-15', 'reel', 'Morning routine upgrade', 'Adding AI meditation to my morning routine hits different', 'planned', false);

-- Influencers
INSERT INTO public.marketing_influencers (name, handle, platform, follower_count, niche, status, collaboration_type, budget, notes) VALUES
('Sarah Wellness', '@sarahwellness', 'instagram', 125000, 'Mindfulness & Self-care', 'agreed', 'Sponsored post + story', 2500.00, 'Very aligned with brand values, great engagement rate'),
('Zen Mike', '@zenmike', 'tiktok', 850000, 'Meditation & Mental Health', 'negotiating', 'Video series', 5000.00, 'High reach, discussing terms'),
('Mindful Maya', '@mindfulmaya', 'instagram', 45000, 'Wellness & Spirituality', 'contacted', 'Product review', 800.00, 'Micro-influencer with highly engaged audience'),
('The Calm Corner', '@thecalmcorner', 'youtube', 200000, 'Guided Meditation', 'researching', 'Integration/mention', NULL, 'Potential long-term partnership'),
('Daily Dose of Zen', '@dailydoseofzen', 'instagram', 78000, 'Daily Meditation Tips', 'content_live', 'Sponsored reel', 1500.00, 'Content posted, tracking performance');

-- Partnerships
INSERT INTO public.marketing_partnerships (organization_name, partnership_type, contact_name, contact_email, status, value_proposition, notes) VALUES
('Yoga Journal', 'media', 'Emily Chen', 'emily@yogajournal.com', 'discussing', 'Feature article and social promotion', 'Discussing Q1 feature opportunity'),
('Wellness Wednesday Podcast', 'media', 'Jordan Blake', 'jordan@wwpodcast.com', 'agreed', 'Podcast interview + newsletter mention', 'Recording scheduled for Jan 20'),
('MindBody App', 'integration', NULL, NULL, 'identified', 'API integration for studio owners', 'Potential B2B opportunity'),
('Headspace Alumni Community', 'community', 'Alex Rivera', NULL, 'outreach', 'Community partnership and cross-promotion', 'Initial email sent');

-- Reports
INSERT INTO public.marketing_reports (report_period, report_date, summary, metrics, insights, recommendations, client_acknowledged) VALUES
('Week 1 - January 2026', '2026-01-07', 'Strong launch week with above-benchmark engagement',
 '{"impressions": 45000, "engagement_rate": 4.2, "new_followers": 1250, "website_clicks": 890}',
 ARRAY['Instagram Reels outperforming static posts 3:1', 'Highest engagement on mindfulness tips content', 'Evening posts (7-9pm) showing best performance'],
 ARRAY['Increase Reel frequency to 5x per week', 'Test TikTok content starting Week 2', 'Consider paid boost on top-performing organic content'],
 true);

-- Communications
INSERT INTO public.marketing_communications (communication_type, title, content, from_agency, is_resolved) VALUES
('update', 'Weekly Check-in Summary', 'Great progress this week! Instagram is growing steadily and our first influencer content goes live Monday. Let me know if you have any questions about the Q1 strategy document.', true, true),
('question', 'Budget Allocation', 'Should we allocate more budget to influencer partnerships or paid social this quarter? Current split is 60/40.', true, false),
('feedback', 'Love the new content direction!', 'The recent Reels feel much more authentic and aligned with the brand voice. Keep it up!', false, true),
('decision', 'TikTok Launch Timeline', 'Let''s confirm: Are we good to launch TikTok presence on January 10th as planned?', true, false);

-- Documents
INSERT INTO public.marketing_documents (document_type, title, description, version, status, client_approved) VALUES
('positioning', 'INrVO Brand Positioning', 'Core positioning statement and brand pillars', '2.0', 'approved', true),
('messaging', 'Key Messages Framework', 'Primary and secondary messaging by audience segment', '1.5', 'approved', true),
('audience', 'Target Audience Personas', 'Detailed personas for Sarah Seeker, Mike Mindful, and Emma Executive', '1.0', 'approved', true),
('content_strategy', 'Q1 Content Strategy', 'Comprehensive content plan for January-March 2026', '1.0', 'pending_review', false),
('brand_guide', 'Social Media Style Guide', 'Visual and voice guidelines for social content', '1.0', 'draft', false);
