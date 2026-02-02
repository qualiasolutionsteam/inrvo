-- Blog Tables
-- Admin-only blog management system for wellness content

-- ============================================================================
-- Blog Posts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'wellness' CHECK (category IN ('wellness', 'meditation', 'mindfulness', 'sleep', 'stress', 'guides', 'news')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  reading_time_minutes INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- ============================================================================
-- Blog Categories Table (for future extensibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#0ea5e9',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, color, display_order) VALUES
  ('Wellness', 'wellness', 'General wellness and self-care tips', '#10b981', 1),
  ('Meditation', 'meditation', 'Meditation techniques and practices', '#8b5cf6', 2),
  ('Mindfulness', 'mindfulness', 'Mindfulness and presence practices', '#06b6d4', 3),
  ('Sleep', 'sleep', 'Better sleep and rest guides', '#6366f1', 4),
  ('Stress Relief', 'stress', 'Managing stress and anxiety', '#f59e0b', 5),
  ('Guides', 'guides', 'How-to guides and tutorials', '#ec4899', 6),
  ('News', 'news', 'Innrvo updates and announcements', '#0ea5e9', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trigger_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Blog posts: Anyone can read published posts
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Blog posts: Admins can do everything
CREATE POLICY "blog_posts_admin_all" ON public.blog_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Blog categories: Anyone can read
CREATE POLICY "blog_categories_public_read" ON public.blog_categories
  FOR SELECT
  USING (true);

-- Blog categories: Admins can modify
CREATE POLICY "blog_categories_admin_all" ON public.blog_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- ============================================================================
-- Helper function to generate slug
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_blog_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);

  final_slug := base_slug;

  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
