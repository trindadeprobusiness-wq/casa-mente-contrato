
-- =====================================================
-- FASE 1: CRIAR ENUMs
-- =====================================================

-- Tipos de interesse do cliente
CREATE TYPE tipo_interesse AS ENUM ('COMPRA', 'LOCACAO', 'AMBOS');

-- Status no funil de vendas
CREATE TYPE status_funil AS ENUM (
  'QUALIFICACAO', 
  'VISITA_PROPOSTA', 
  'DOCUMENTACAO', 
  'FECHADO_GANHO', 
  'FECHADO_PERDIDO'
);

-- Tipos de contato/interação
CREATE TYPE tipo_contato AS ENUM (
  'LIGACAO', 'EMAIL', 'WHATSAPP', 'VISITA', 'PROPOSTA', 'NOTA'
);

-- Tipos de imóvel
CREATE TYPE tipo_imovel AS ENUM (
  'APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO'
);

-- Tipos de contrato
CREATE TYPE tipo_contrato AS ENUM (
  'COMPRA_VENDA', 'LOCACAO_RESIDENCIAL', 'LOCACAO_COMERCIAL',
  'EXCLUSIVIDADE_VENDA', 'EXCLUSIVIDADE_LOCACAO', 'DISTRATO', 'PROCURACAO'
);

-- Prioridade de alertas
CREATE TYPE prioridade_alerta AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- Tipo de alerta
CREATE TYPE tipo_alerta AS ENUM ('FOLLOWUP', 'DOCUMENTO', 'EXCLUSIVIDADE', 'GERAL');

-- =====================================================
-- FASE 2: TABELA DE CORRETORES (Profiles)
-- =====================================================

CREATE TABLE public.corretores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  creci TEXT NOT NULL,
  creci_estado CHAR(2) NOT NULL DEFAULT 'SP',
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT,
  website TEXT,
  razao_social TEXT,
  cnpj_cpf TEXT,
  endereco_completo TEXT,
  foto_url TEXT,
  preferencias JSONB DEFAULT '{
    "notificacoes": {
      "followup_atrasado": true,
      "exclusividade_vencendo": true,
      "documento_vencendo": true,
      "novo_cliente": false
    },
    "antecedencia_exclusividade_dias": 7,
    "antecedencia_documento_dias": 15,
    "tema": "light",
    "sidebar_expandida": true,
    "formato_moeda": "completo",
    "ordenacao_clientes": "ultimo_contato"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- FASE 3: TABELA DE CLIENTES
-- =====================================================

CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  rg TEXT,
  nacionalidade TEXT DEFAULT 'brasileiro(a)',
  estado_civil TEXT,
  profissao TEXT,
  endereco_completo TEXT,
  tipo_interesse tipo_interesse NOT NULL DEFAULT 'COMPRA',
  status_funil status_funil NOT NULL DEFAULT 'QUALIFICACAO',
  ultimo_contato TIMESTAMPTZ DEFAULT NOW(),
  proximo_followup TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 4: TABELA DE IMÓVEIS
-- =====================================================

CREATE TABLE public.imoveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo tipo_imovel NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  area_m2 DECIMAL(10,2),
  dormitorios INTEGER DEFAULT 0,
  garagem INTEGER DEFAULT 0,
  endereco TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT NOT NULL,
  estado CHAR(2) DEFAULT 'SP',
  cep TEXT,
  descricao TEXT,
  exclusividade_ate DATE,
  proprietario_nome TEXT NOT NULL,
  proprietario_cpf TEXT,
  proprietario_telefone TEXT,
  proprietario_email TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 5: TABELA DE VINCULAÇÃO CLIENTE-IMÓVEL
-- =====================================================

CREATE TABLE public.cliente_imovel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  nivel_interesse INTEGER DEFAULT 5,
  visitou BOOLEAN DEFAULT FALSE,
  data_visita TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cliente_id, imovel_id)
);

-- =====================================================
-- FASE 6: TABELA DE HISTÓRICO DE CONTATOS
-- =====================================================

CREATE TABLE public.historico_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  tipo tipo_contato NOT NULL,
  descricao TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imovel_relacionado_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 7: TABELA DE DOCUMENTOS
-- =====================================================

CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  arquivo_url TEXT,
  arquivo_path TEXT,
  validado BOOLEAN DEFAULT FALSE,
  data_validade DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 8: TABELA DE CONTRATOS
-- =====================================================

CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  tipo tipo_contrato NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_inicio DATE NOT NULL,
  prazo_meses INTEGER,
  dia_vencimento INTEGER,
  indice_reajuste TEXT,
  clausulas_adicionais TEXT[],
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RASCUNHO',
  versao INTEGER DEFAULT 1,
  modelo_ia TEXT,
  tempo_geracao_ms INTEGER,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 9: TABELA DE ALERTAS
-- =====================================================

CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  tipo tipo_alerta NOT NULL,
  prioridade prioridade_alerta NOT NULL DEFAULT 'MEDIA',
  lido BOOLEAN DEFAULT FALSE,
  data_alerta TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 10: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_imovel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FASE 11: FUNÇÃO AUXILIAR PARA OBTER CORRETOR_ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_corretor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.corretores WHERE user_id = auth.uid()
$$;

-- =====================================================
-- FASE 12: POLÍTICAS RLS
-- =====================================================

-- CORRETORES
CREATE POLICY "Corretor vê próprio perfil"
  ON public.corretores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Corretor atualiza próprio perfil"
  ON public.corretores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Corretor insere próprio perfil"
  ON public.corretores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CLIENTES
CREATE POLICY "Corretor vê seus clientes"
  ON public.clientes FOR SELECT
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor insere seus clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor atualiza seus clientes"
  ON public.clientes FOR UPDATE
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor deleta seus clientes"
  ON public.clientes FOR DELETE
  USING (corretor_id = public.get_corretor_id());

-- IMÓVEIS
CREATE POLICY "Corretor vê seus imóveis"
  ON public.imoveis FOR SELECT
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor insere seus imóveis"
  ON public.imoveis FOR INSERT
  WITH CHECK (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor atualiza seus imóveis"
  ON public.imoveis FOR UPDATE
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor deleta seus imóveis"
  ON public.imoveis FOR DELETE
  USING (corretor_id = public.get_corretor_id());

-- CLIENTE_IMOVEL
CREATE POLICY "Corretor gerencia vinculações"
  ON public.cliente_imovel FOR ALL
  USING (
    cliente_id IN (SELECT id FROM public.clientes WHERE corretor_id = public.get_corretor_id())
  );

-- HISTORICO_CONTATOS
CREATE POLICY "Corretor vê histórico de seus clientes"
  ON public.historico_contatos FOR SELECT
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor insere histórico"
  ON public.historico_contatos FOR INSERT
  WITH CHECK (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor atualiza histórico"
  ON public.historico_contatos FOR UPDATE
  USING (corretor_id = public.get_corretor_id());

CREATE POLICY "Corretor deleta histórico"
  ON public.historico_contatos FOR DELETE
  USING (corretor_id = public.get_corretor_id());

-- DOCUMENTOS
CREATE POLICY "Corretor gerencia seus documentos"
  ON public.documentos FOR ALL
  USING (corretor_id = public.get_corretor_id());

-- CONTRATOS
CREATE POLICY "Corretor gerencia seus contratos"
  ON public.contratos FOR ALL
  USING (corretor_id = public.get_corretor_id());

-- ALERTAS
CREATE POLICY "Corretor gerencia seus alertas"
  ON public.alertas FOR ALL
  USING (corretor_id = public.get_corretor_id());

-- =====================================================
-- FASE 13: ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_clientes_corretor ON public.clientes(corretor_id);
CREATE INDEX idx_clientes_status ON public.clientes(status_funil);
CREATE INDEX idx_clientes_nome ON public.clientes(nome);
CREATE INDEX idx_clientes_ultimo_contato ON public.clientes(ultimo_contato DESC);

CREATE INDEX idx_imoveis_corretor ON public.imoveis(corretor_id);
CREATE INDEX idx_imoveis_tipo ON public.imoveis(tipo);
CREATE INDEX idx_imoveis_cidade ON public.imoveis(cidade);
CREATE INDEX idx_imoveis_valor ON public.imoveis(valor);

CREATE INDEX idx_cliente_imovel_cliente ON public.cliente_imovel(cliente_id);
CREATE INDEX idx_cliente_imovel_imovel ON public.cliente_imovel(imovel_id);

CREATE INDEX idx_historico_cliente ON public.historico_contatos(cliente_id);
CREATE INDEX idx_historico_data ON public.historico_contatos(data DESC);

CREATE INDEX idx_documentos_cliente ON public.documentos(cliente_id);
CREATE INDEX idx_documentos_imovel ON public.documentos(imovel_id);

CREATE INDEX idx_contratos_status ON public.contratos(status);
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);

CREATE INDEX idx_alertas_corretor ON public.alertas(corretor_id);
CREATE INDEX idx_alertas_lido ON public.alertas(lido);

-- =====================================================
-- FASE 14: TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_corretores_updated_at
  BEFORE UPDATE ON public.corretores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_imoveis_updated_at
  BEFORE UPDATE ON public.imoveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FASE 15: TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.corretores (user_id, nome, email, creci, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'creci', 'PENDENTE'),
    COALESCE(NEW.raw_user_meta_data->>'telefone', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
