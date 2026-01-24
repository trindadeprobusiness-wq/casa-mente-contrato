-- Migration: Rental Administration Module Schema
-- Description: Adds columns to contratos and creates faturas_aluguel and repasses_proprietario tables.

-- =====================================================
-- 1. ALTER TABLE: contratos
-- =====================================================
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS taxa_administracao_percentual DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS dia_vencimento_aluguel INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS dia_repasse_proprietario INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS multa_atraso_percentual DECIMAL(5,2) DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS juros_mora_diario_percentual DECIMAL(5,4) DEFAULT 0.033,
ADD COLUMN IF NOT EXISTS dados_bancarios_repasse JSONB, -- Ex: { "pix": "..." }
ADD COLUMN IF NOT EXISTS vistoria_entrada_url TEXT,
ADD COLUMN IF NOT EXISTS garantia_tipo TEXT; -- CAUCAO, FIADOR, SEGURO_FIANCA

-- =====================================================
-- 2. CREATE TABLE: faturas_aluguel
-- =====================================================
CREATE TABLE IF NOT EXISTS public.faturas_aluguel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE, -- Inquilino
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
    mes_referencia CHAR(7) NOT NULL, -- Ex: "01/2026"
    data_vencimento DATE NOT NULL,
    valor_aluguel DECIMAL(15,2) NOT NULL,
    valor_condominio DECIMAL(15,2) DEFAULT 0,
    valor_iptu DECIMAL(15,2) DEFAULT 0,
    valor_extras DECIMAL(15,2) DEFAULT 0, -- Taxas extras, água, luz
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (valor_aluguel + valor_condominio + valor_iptu + valor_extras - valor_desconto) STORED,
    status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, PAGO, ATRASADO, CANCELADO
    data_pagamento DATE,
    valor_pago DECIMAL(15,2),
    comprovante_url TEXT,
    boleto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for faturas_aluguel
CREATE INDEX IF NOT EXISTS idx_faturas_contrato ON public.faturas_aluguel(contrato_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON public.faturas_aluguel(status);
CREATE INDEX IF NOT EXISTS idx_faturas_cliente ON public.faturas_aluguel(cliente_id);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON public.faturas_aluguel(data_vencimento);

-- RLS for faturas_aluguel
ALTER TABLE public.faturas_aluguel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretor gerencia faturas"
  ON public.faturas_aluguel FOR ALL
  USING (corretor_id = public.get_corretor_id());

-- Updated_at trigger for faturas_aluguel
CREATE TRIGGER update_faturas_aluguel_updated_at
  BEFORE UPDATE ON public.faturas_aluguel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. CREATE TABLE: repasses_proprietario
-- =====================================================
CREATE TABLE IF NOT EXISTS public.repasses_proprietario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_origem_id UUID REFERENCES public.faturas_aluguel(id) ON DELETE SET NULL,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE, -- Added for RLS
    proprietario_nome TEXT NOT NULL, -- Desnormalizado para facilitar
    data_prevista DATE NOT NULL,
    valor_bruto_recebido DECIMAL(15,2) NOT NULL, -- Valor pago pelo inquilino (base cálculo)
    valor_taxa_adm DECIMAL(15,2) NOT NULL,
    valor_liquido_repasse DECIMAL(15,2) NOT NULL, -- Valor final a transferir
    status TEXT NOT NULL DEFAULT 'AGENDADO', -- AGENDADO, ENVIADO, CONFIRMADO, ERRO
    data_transferencia DATE,
    comprovante_transferencia_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for repasses_proprietario
CREATE INDEX IF NOT EXISTS idx_repasses_status ON public.repasses_proprietario(status);
CREATE INDEX IF NOT EXISTS idx_repasses_data ON public.repasses_proprietario(data_prevista);
CREATE INDEX IF NOT EXISTS idx_repasses_contrato ON public.repasses_proprietario(contrato_id);

-- RLS for repasses_proprietario
ALTER TABLE public.repasses_proprietario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretor gerencia repasses"
  ON public.repasses_proprietario FOR ALL
  USING (corretor_id = public.get_corretor_id());

-- Updated_at trigger for repasses_proprietario
CREATE TRIGGER update_repasses_proprietario_updated_at
  BEFORE UPDATE ON public.repasses_proprietario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
