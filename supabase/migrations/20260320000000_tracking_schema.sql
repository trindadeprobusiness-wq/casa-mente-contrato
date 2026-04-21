-- Add the tracking fields and webhooks logic

-- 1. Enum para o novo status de venda do Imóvel
-- "status_venda" or just "status" maybe we reuse the existing one?
-- We check if `imoveis.status` already exists!
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_venda') THEN
        CREATE TYPE status_venda AS ENUM ('DISPONIVEL', 'VENDIDO', 'ALUGADO');
    END IF;
END$$;

-- Add tracking_data to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tracking_data JSONB DEFAULT '{}'::jsonb;

-- Add tracking_data and status_venda to imoveis
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS tracking_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS status_venda status_venda DEFAULT 'DISPONIVEL';

-- 2. Tabela de Webhook Logs para o Outbox Pattern
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING')),
    endpoint_url TEXT NOT NULL,
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e criar policies básicas para webhook_logs (allow internal use)
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert webhook logs" ON public.webhook_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select their webhook logs" ON public.webhook_logs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to update webhook logs" ON public.webhook_logs
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
