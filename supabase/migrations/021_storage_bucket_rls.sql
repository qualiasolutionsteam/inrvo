-- Migration: Storage Bucket RLS Policies
-- Enforces Row Level Security on meditation-audio and voice-samples storage buckets
-- Previously these were documented but not enforced via migration

-- Ensure storage extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage buckets if they don't exist (will fail silently if already created via Dashboard)
-- Note: storage.buckets insertions may fail if buckets already exist - that's OK
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('meditation-audio', 'meditation-audio', false, 52428800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']),
    ('voice-samples', 'voice-samples', false, 15728640, ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/webm'])
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
  WHEN undefined_table THEN
    -- storage.buckets table doesn't exist, skip
    RAISE NOTICE 'storage.buckets table not found, skipping bucket creation';
END $$;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own meditation audio" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own meditation audio" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own meditation audio" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own voice samples" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own voice samples" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own voice samples" ON storage.objects;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects table not found, skipping policy drops';
END $$;

-- Create RLS policies for meditation-audio bucket
-- Files are stored with user_id as the first folder: {user_id}/{filename}.mp3
DO $$
BEGIN
  -- SELECT policy: Users can only view their own meditation audio
  CREATE POLICY "Users can view their own meditation audio"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'meditation-audio'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- INSERT policy: Users can only upload to their own folder
  CREATE POLICY "Users can upload their own meditation audio"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'meditation-audio'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- DELETE policy: Users can only delete their own meditation audio
  CREATE POLICY "Users can delete their own meditation audio"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'meditation-audio'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- UPDATE policy: Users can update (replace) their own meditation audio
  CREATE POLICY "Users can update their own meditation audio"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'meditation-audio'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'meditation-audio'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects table not found, skipping meditation-audio policies';
  WHEN duplicate_object THEN
    RAISE NOTICE 'meditation-audio policies already exist';
END $$;

-- Create RLS policies for voice-samples bucket
-- Files are stored with user_id as the first folder: {user_id}/{filename}.wav
DO $$
BEGIN
  -- SELECT policy: Users can only view their own voice samples
  CREATE POLICY "Users can view their own voice samples"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'voice-samples'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- INSERT policy: Users can only upload to their own folder
  CREATE POLICY "Users can upload their own voice samples"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'voice-samples'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- DELETE policy: Users can only delete their own voice samples
  CREATE POLICY "Users can delete their own voice samples"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'voice-samples'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- UPDATE policy: Users can update (replace) their own voice samples
  CREATE POLICY "Users can update their own voice samples"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'voice-samples'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'voice-samples'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects table not found, skipping voice-samples policies';
  WHEN duplicate_object THEN
    RAISE NOTICE 'voice-samples policies already exist';
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION "uuid-ossp" IS 'Functions to generate universally unique identifiers (UUIDs)';
