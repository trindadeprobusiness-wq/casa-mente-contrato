-- Create enum for financial entry types
CREATE TYPE tipo_lancamento AS ENUM ('RECEITA', 'DESPESA');

-- Create enum for financial categories
CREATE TYPE categoria_financeira AS ENUM (
  -- Despesas
  'ANUNCIO_PORTAL',
  'ANUNCIO_SOCIAL', 
  'ANUNCIO_TRADICIONAL',
  'OPERACIONAL_ESCRITORIO',
  'OPERACIONAL_TRANSPORTE',
  'OPERACIONAL_SISTEMA',
  'IMPOSTO_ISS',
  'IMPOSTO_IR',
  'TAXA_BANCARIA',
  'COMISSAO_PARCEIRO',
  -- Receitas
  'COMISSAO_VENDA',
  'COMISSAO_LOCACAO',
  'TAXA_INTERMEDIACAO',
  'HONORARIO_AVALIACAO',
  'CONSULTORIA',
  -- Geral
  'OUTROS'
);

-- Create table for financial entries
CREATE TABLE public.lancamentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  tipo tipo_lancamento NOT NULL,
  categoria categoria_financeira NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  recorrente BOOLEAN DEFAULT false,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Corretor gerencia seus lancamentos"
ON public.lancamentos_financeiros
FOR ALL
USING (corretor_id = get_corretor_id());

-- Create index for performance
CREATE INDEX idx_lancamentos_corretor_data ON public.lancamentos_financeiros(corretor_id, data);
CREATE INDEX idx_lancamentos_tipo_categoria ON public.lancamentos_financeiros(tipo, categoria);

-- Add trigger for updated_at
CREATE TRIGGER update_lancamentos_financeiros_updated_at
BEFORE UPDATE ON public.lancamentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();