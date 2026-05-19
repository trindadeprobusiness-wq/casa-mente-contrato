-- =====================================================
-- MIGRATION: Adicionar campo finalidade + políticas de leitura pública
-- Objetivo: Diferenciar imóveis de VENDA vs LOCAÇÃO e permitir
-- que a Landing Page leia imóveis públicos (anunciados) sem autenticação.
-- =====================================================

-- 1. Criar enum de finalidade
DO $$ BEGIN
    CREATE TYPE finalidade_imovel AS ENUM ('VENDA', 'LOCACAO', 'AMBOS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar coluna finalidade à tabela imoveis
ALTER TABLE public.imoveis 
ADD COLUMN IF NOT EXISTS finalidade finalidade_imovel NOT NULL DEFAULT 'VENDA';

-- 3. Adicionar coluna banheiros (não existia na tabela original)
ALTER TABLE public.imoveis
ADD COLUMN IF NOT EXISTS banheiros INTEGER DEFAULT 0;

-- 4. Adicionar coluna descricao_curta para preview no site
ALTER TABLE public.imoveis
ADD COLUMN IF NOT EXISTS descricao_curta TEXT;

-- 5. Índices para consultas públicas (Landing Page)
CREATE INDEX IF NOT EXISTS idx_imoveis_anunciado ON public.imoveis(anunciado) WHERE anunciado = true;
CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade ON public.imoveis(finalidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_status_anunciado ON public.imoveis(status_venda, anunciado) WHERE anunciado = true AND status_venda = 'DISPONIVEL';

-- 6. Índice na tabela imovel_fotos para JOINs rápidos
CREATE INDEX IF NOT EXISTS idx_imovel_fotos_imovel_ordem ON public.imovel_fotos(imovel_id, ordem);

-- =====================================================
-- 7. POLÍTICAS RLS — Leitura pública (anon) para imóveis anunciados
-- A Edge Function usa service_role (bypass RLS), mas estas policies
-- permitem que o client-side também funcione como fallback.
-- =====================================================

-- Imóveis: anon pode ler apenas imóveis disponíveis E anunciados
CREATE POLICY "Leitura pública de imóveis anunciados"
    ON public.imoveis
    FOR SELECT
    TO anon
    USING (
        status_venda = 'DISPONIVEL' 
        AND ativo = true 
        AND anunciado = true
    );

-- Fotos: anon pode ler fotos de imóveis anunciados
CREATE POLICY "Leitura pública de fotos de imóveis anunciados"
    ON public.imovel_fotos
    FOR SELECT
    TO anon
    USING (
        imovel_id IN (
            SELECT id FROM public.imoveis 
            WHERE status_venda = 'DISPONIVEL' 
            AND ativo = true 
            AND anunciado = true
        )
    );

-- =====================================================
-- 8. Atualizar tipo_alerta para incluir LEAD_QUENTE
-- (o enum original não tinha esse valor)
-- =====================================================
-- Nota: O Supabase real já pode ter migrado o enum.
-- A lead-capture function já insere LEAD_QUENTE, então
-- vamos adicionar ao enum se não existir.
DO $$ BEGIN
    ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'LEAD_QUENTE';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
