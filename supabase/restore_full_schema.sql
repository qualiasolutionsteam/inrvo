-- RESTORE FULL SCHEMA SCRIPT
-- Run this in Supabase SQL Editor to fix missing table errors and timeouts.

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create public.users table (mirrors auth.users)
-- Validates: lib/supabase.ts usage of .from('users')
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER',
  tier TEXT DEFAULT 'FREE',
  onboarding_completed BOOLEAN DEFAULT FALSE, -- Added for onboarding check
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Trigger to create public user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, tier)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'tier', 'FREE')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Voice Profiles Table (Reconstructed from code usage)
-- Validates: lib/supabase.ts .from('voice_profiles')
CREATE TABLE IF NOT EXISTS public.voice_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT DEFAULT 'en-US', 
  provider VARCHAR(50) DEFAULT 'Gemini', -- 'Gemini', 'elevenlabs', 'browser'
  provider_voice_id TEXT, -- For cloned voices
  voice_sample_url TEXT,
  elevenlabs_voice_id TEXT, -- Specific column for 11Labs
  fish_audio_model_id TEXT, -- Legacy
  status TEXT DEFAULT 'READY', -- 'READY', 'PENDING'
  cloning_status TEXT DEFAULT 'NONE',
  accent TEXT, -- For Gemini voices
  gender TEXT,
  age_range TEXT,
  quality TEXT,
  quality_score FLOAT,
  sample_duration FLOAT,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, name)
);

-- RLS for voice_profiles
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voice profiles" ON public.voice_profiles;
CREATE POLICY "Users can view own voice profiles" ON public.voice_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own voice profiles" ON public.voice_profiles;
CREATE POLICY "Users can insert own voice profiles" ON public.voice_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own voice profiles" ON public.voice_profiles;
CREATE POLICY "Users can update own voice profiles" ON public.voice_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own voice profiles" ON public.voice_profiles;
CREATE POLICY "Users can delete own voice profiles" ON public.voice_profiles FOR DELETE USING (auth.uid() = user_id);

-- Indexes for voice_profiles
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_created ON public.voice_profiles(user_id, created_at DESC);

-- 4. Create Agent Conversations Table (Missing from schema, causing timeouts)
-- Validates: conversationStore.ts usage
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id TEXT PRIMARY KEY, -- Handles 'conv_...' IDs
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  session_state JSONB DEFAULT '{}'::jsonb NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS for agent_conversations
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.agent_conversations;
CREATE POLICY "Users can view own conversations" ON public.agent_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.agent_conversations;
CREATE POLICY "Users can insert own conversations" ON public.agent_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.agent_conversations;
CREATE POLICY "Users can update own conversations" ON public.agent_conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.agent_conversations;
CREATE POLICY "Users can delete own conversations" ON public.agent_conversations FOR DELETE USING (auth.uid() = user_id);

-- Indexes for agent_conversations
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_created ON public.agent_conversations(user_id, created_at DESC);

-- 5. Create Audio Generations Table
CREATE TABLE IF NOT EXISTS public.audio_generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE CASCADE,
  model_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT,
  text_hash TEXT,
  audio_url TEXT,
  duration FLOAT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.audio_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audio generations" ON public.audio_generations;
CREATE POLICY "Users can view own audio generations" ON public.audio_generations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audio generations" ON public.audio_generations;
CREATE POLICY "Users can insert own audio generations" ON public.audio_generations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Create Voice Clones Table (Standard)
CREATE TABLE IF NOT EXISTS public.voice_clones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audio_data TEXT, -- Base64
  voice_characteristics JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, name)
);

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voice clones" ON public.voice_clones;
CREATE POLICY "Users can view own voice clones" ON public.voice_clones FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own voice clones" ON public.voice_clones;
CREATE POLICY "Users can insert own voice clones" ON public.voice_clones FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own voice clones" ON public.voice_clones;
CREATE POLICY "Users can update own voice clones" ON public.voice_clones FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own voice clones" ON public.voice_clones;
CREATE POLICY "Users can delete own voice clones" ON public.voice_clones FOR DELETE USING (auth.uid() = user_id);

-- 7. Sync existing users to public.users (Fix for "No user" issues)
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Notifying completion
SELECT 'Schema restoration complete. Tables created: users, voice_profiles, agent_conversations, audio_generations, voice_clones.' as status;
