-- =====================================================
-- MIGRATION: Fix Supabase Advisor Security Lints
-- =====================================================

-- FIX 1: RLS Disabled in Public for `public.cliente_imovel`
-- Advisor reported that RLS was disabled. This ensures it's explicitly enabled.
ALTER TABLE public.cliente_imovel ENABLE ROW LEVEL SECURITY;

-- FIX 2: Security Definer View for `public.v_leads_whatsapp`
-- By default, Postgres views run with the privileges of the creator (security definer),
-- which bypasses Row Level Security (RLS) on the underlying tables (`clientes`, `historico_contatos`).
-- Setting `security_invoker = true` makes the view run with the privileges of the querying user,
-- ensuring that RLS policies are properly enforced.
ALTER VIEW public.v_leads_whatsapp SET (security_invoker = true);
 