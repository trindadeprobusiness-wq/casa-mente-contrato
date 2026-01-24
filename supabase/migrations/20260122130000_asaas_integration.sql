-- Migration: Asaas Integration Schema
-- Description: Adds columns to store Asaas metadata and payment tracking.

-- 1. Alter FATURAS_ALUGUEL (Recebimentos)
ALTER TABLE public.faturas_aluguel
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) UNIQUE, -- Asaas Payment ID (pay_...)
ADD COLUMN IF NOT EXISTS asaas_status VARCHAR(50), -- RECEIVED, PENDING, OVERDUE...
ADD COLUMN IF NOT EXISTS data_credito DATE, -- Data que o dinheiro caiu na conta asaas
ADD COLUMN IF NOT EXISTS recibo_url TEXT, -- Link do comprovante/recibo
ADD COLUMN IF NOT EXISTS boleto_url_asaas TEXT, -- Link direto do boleto no Asaas
ADD COLUMN IF NOT EXISTS pix_qrcode_text TEXT, -- Copia e cola pix
ADD COLUMN IF NOT EXISTS raw_payload JSONB; -- Payload completo do último evento para auditoria

CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON public.faturas_aluguel(external_id);

-- 2. Alter REPASSES_PROPRIETARIO
ALTER TABLE public.repasses_proprietario
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255), -- Asaas Transfer ID (transfer_...) if automated
ADD COLUMN IF NOT EXISTS bank_account_id VARCHAR(255); -- ID da conta bancária de destino no Asaas

CREATE INDEX IF NOT EXISTS idx_repasses_external_id ON public.repasses_proprietario(external_id);

-- 3. Audit Log Table (Opcional, mas recomendado para webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'ASAAS',
    event_type VARCHAR(100),
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) -- SUCCESS, ERROR
);
