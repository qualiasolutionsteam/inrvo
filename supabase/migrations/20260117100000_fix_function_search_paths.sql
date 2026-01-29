-- Fix mutable search_path security warnings
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Set search_path to 'public' for all affected functions to prevent search_path hijacking attacks

ALTER FUNCTION public.get_user_context SET search_path = public;
ALTER FUNCTION public.match_conversation_memory SET search_path = public;
ALTER FUNCTION public.match_wisdom SET search_path = public;
ALTER FUNCTION public.match_user_meditations SET search_path = public;
ALTER FUNCTION public.update_templates_updated_at SET search_path = public;
ALTER FUNCTION public.store_conversation_memory SET search_path = public;
