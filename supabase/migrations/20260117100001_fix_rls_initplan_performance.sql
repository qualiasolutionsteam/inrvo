-- Fix RLS initplan performance warnings
-- Replace auth.uid() with (select auth.uid()) to evaluate once per query instead of per row
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- ============================================================================
-- conversation_memory table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own conversation memory" ON public.conversation_memory;
CREATE POLICY "Users can view own conversation memory"
  ON public.conversation_memory FOR SELECT
  TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation memory" ON public.conversation_memory;
CREATE POLICY "Users can insert own conversation memory"
  ON public.conversation_memory FOR INSERT
  TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversation memory" ON public.conversation_memory;
CREATE POLICY "Users can update own conversation memory"
  ON public.conversation_memory FOR UPDATE
  TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversation memory" ON public.conversation_memory;
CREATE POLICY "Users can delete own conversation memory"
  ON public.conversation_memory FOR DELETE
  TO public
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- user_meditation_embeddings table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own meditation embeddings" ON public.user_meditation_embeddings;
CREATE POLICY "Users can view own meditation embeddings"
  ON public.user_meditation_embeddings FOR SELECT
  TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own meditation embeddings" ON public.user_meditation_embeddings;
CREATE POLICY "Users can insert own meditation embeddings"
  ON public.user_meditation_embeddings FOR INSERT
  TO public
  WITH CHECK ((select auth.uid()) = user_id);
