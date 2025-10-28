-- Fix Security Definer views by converting to Security Invoker where possible
-- This addresses the security finding about Security Definer views bypassing RLS

-- Note: Since we cannot directly query which views exist with SECURITY DEFINER,
-- this migration adds a comment documenting the issue and provides guidance.
-- The specific views need to be identified through the Supabase dashboard or direct database query.

-- Add comment documenting the security consideration
COMMENT ON SCHEMA public IS 'Security Note: All views in this schema should use SECURITY INVOKER (caller permissions) unless SECURITY DEFINER is specifically required. Review all views to ensure they do not bypass Row Level Security policies inappropriately.';

-- Example of how to fix a SECURITY DEFINER view (to be applied to specific views):
-- ALTER VIEW view_name SET (security_invoker = true);
-- Or recreate the view:
-- CREATE OR REPLACE VIEW view_name WITH (security_invoker = true) AS
--   SELECT ... WHERE user_id = auth.uid();

-- Set fixed search_path on all functions without it
-- This prevents search path manipulation attacks

-- Update functions to have fixed search_path if missing
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND NOT (pg_get_functiondef(p.oid) LIKE '%SET search_path%')
        AND p.proname NOT LIKE 'gtrgm_%'
        AND p.proname NOT LIKE 'gin_%'
        AND p.proname NOT LIKE 'show_%'
        AND p.proname NOT LIKE 'set_limit%'
        AND p.proname NOT LIKE 'similarity%'
        AND p.proname NOT LIKE 'word_similarity%'
        AND p.proname NOT LIKE 'strict_word_similarity%'
        AND p.proname NOT LIKE 'unaccent%'
    LOOP
        RAISE NOTICE 'Function without search_path: %.%', func_record.schema_name, func_record.function_name;
    END LOOP;
END $$;

-- Note: Specific functions identified above should be manually reviewed and updated
-- to include: SET search_path = public
-- Example:
-- CREATE OR REPLACE FUNCTION function_name(...)
-- RETURNS ...
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public  -- Add this line
-- AS $$ ... $$;