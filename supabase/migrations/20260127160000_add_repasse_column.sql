-- Migration: Add dia_repasse_proprietario to contratos
-- Description: Adds the missing column for owner payout day.

ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS dia_repasse_proprietario INTEGER;

-- Optional: Update existing records to default to dia_vencimento + 5 (or just leave null/handle in code)
UPDATE public.contratos 
SET dia_repasse_proprietario = dia_vencimento_aluguel + 5 
WHERE dia_repasse_proprietario IS NULL AND dia_vencimento_aluguel IS NOT NULL;
