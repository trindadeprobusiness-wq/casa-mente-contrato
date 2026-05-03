
-- 1. Convert get_corretor_id to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_corretor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id FROM public.corretores WHERE user_id = auth.uid()
$$;

-- 2. Restrict all policies to 'authenticated' role only (anon explicitly denied)
-- clientes
DROP POLICY IF EXISTS "Corretor vê seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Corretor insere seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Corretor atualiza seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Corretor deleta seus clientes" ON public.clientes;

CREATE POLICY "Corretor vê seus clientes" ON public.clientes
  FOR SELECT TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor insere seus clientes" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor atualiza seus clientes" ON public.clientes
  FOR UPDATE TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor deleta seus clientes" ON public.clientes
  FOR DELETE TO authenticated USING (corretor_id = public.get_corretor_id());

-- alertas
DROP POLICY IF EXISTS "Corretor gerencia seus alertas" ON public.alertas;
CREATE POLICY "Corretor gerencia seus alertas" ON public.alertas
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

-- contratos
DROP POLICY IF EXISTS "Corretor gerencia seus contratos" ON public.contratos;
CREATE POLICY "Corretor gerencia seus contratos" ON public.contratos
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

-- documentos
DROP POLICY IF EXISTS "Corretor gerencia seus documentos" ON public.documentos;
CREATE POLICY "Corretor gerencia seus documentos" ON public.documentos
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

-- historico_contatos
DROP POLICY IF EXISTS "Corretor vê histórico de seus clientes" ON public.historico_contatos;
DROP POLICY IF EXISTS "Corretor insere histórico" ON public.historico_contatos;
DROP POLICY IF EXISTS "Corretor atualiza histórico" ON public.historico_contatos;
DROP POLICY IF EXISTS "Corretor deleta histórico" ON public.historico_contatos;

CREATE POLICY "Corretor vê histórico de seus clientes" ON public.historico_contatos
  FOR SELECT TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor insere histórico" ON public.historico_contatos
  FOR INSERT TO authenticated WITH CHECK (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor atualiza histórico" ON public.historico_contatos
  FOR UPDATE TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor deleta histórico" ON public.historico_contatos
  FOR DELETE TO authenticated USING (corretor_id = public.get_corretor_id());

-- lancamentos_financeiros
DROP POLICY IF EXISTS "Corretor gerencia seus lancamentos" ON public.lancamentos_financeiros;
CREATE POLICY "Corretor gerencia seus lancamentos" ON public.lancamentos_financeiros
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

-- cliente_imovel
DROP POLICY IF EXISTS "Corretor gerencia vinculações" ON public.cliente_imovel;
CREATE POLICY "Corretor gerencia vinculações" ON public.cliente_imovel
  FOR ALL TO authenticated
  USING (cliente_id IN (SELECT id FROM public.clientes WHERE corretor_id = public.get_corretor_id()))
  WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE corretor_id = public.get_corretor_id()));

-- imoveis (keep ownership-based, restrict to authenticated)
DROP POLICY IF EXISTS "Corretor vê seus imóveis" ON public.imoveis;
DROP POLICY IF EXISTS "Corretor insere seus imóveis" ON public.imoveis;
DROP POLICY IF EXISTS "Corretor atualiza seus imóveis" ON public.imoveis;
DROP POLICY IF EXISTS "Corretor deleta seus imóveis" ON public.imoveis;

CREATE POLICY "Corretor vê seus imóveis" ON public.imoveis
  FOR SELECT TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor insere seus imóveis" ON public.imoveis
  FOR INSERT TO authenticated WITH CHECK (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor atualiza seus imóveis" ON public.imoveis
  FOR UPDATE TO authenticated USING (corretor_id = public.get_corretor_id());
CREATE POLICY "Corretor deleta seus imóveis" ON public.imoveis
  FOR DELETE TO authenticated USING (corretor_id = public.get_corretor_id());

-- videos
DROP POLICY IF EXISTS "Corretor gerencia seus videos" ON public.videos;
CREATE POLICY "Corretor gerencia seus videos" ON public.videos
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

-- corretores
DROP POLICY IF EXISTS "Corretor vê próprio perfil" ON public.corretores;
DROP POLICY IF EXISTS "Corretor insere próprio perfil" ON public.corretores;
DROP POLICY IF EXISTS "Corretor atualiza próprio perfil" ON public.corretores;

CREATE POLICY "Corretor vê próprio perfil" ON public.corretores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Corretor insere próprio perfil" ON public.corretores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Corretor atualiza próprio perfil" ON public.corretores
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
