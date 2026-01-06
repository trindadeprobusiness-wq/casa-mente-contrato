
-- =============================================
-- BUCKETS DE STORAGE
-- =============================================

-- 1. Bucket para fotos de imóveis (público para exibição)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imoveis-fotos',
  'imoveis-fotos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 2. Bucket para documentos (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- 3. Bucket para avatares (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif']
);

-- =============================================
-- POLÍTICAS RLS PARA STORAGE
-- =============================================

-- Bucket: imoveis-fotos
CREATE POLICY "Corretor pode fazer upload de fotos de imoveis"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imoveis-fotos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.imoveis 
    WHERE corretor_id = public.get_corretor_id()
  )
);

CREATE POLICY "Fotos de imoveis sao publicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'imoveis-fotos');

CREATE POLICY "Corretor pode deletar fotos de seus imoveis"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'imoveis-fotos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.imoveis 
    WHERE corretor_id = public.get_corretor_id()
  )
);

CREATE POLICY "Corretor pode atualizar fotos de seus imoveis"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'imoveis-fotos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.imoveis 
    WHERE corretor_id = public.get_corretor_id()
  )
);

-- Bucket: documentos
CREATE POLICY "Corretor pode fazer upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = public.get_corretor_id()::text
);

CREATE POLICY "Corretor ve seus documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = public.get_corretor_id()::text
);

CREATE POLICY "Corretor pode deletar seus documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = public.get_corretor_id()::text
);

CREATE POLICY "Corretor pode atualizar seus documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = public.get_corretor_id()::text
);

-- Bucket: avatars
CREATE POLICY "Usuario pode fazer upload de avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatares sao publicos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Usuario pode deletar seu avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuario pode atualizar seu avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- TABELA DE FOTOS DE IMÓVEIS
-- =============================================

CREATE TABLE public.imovel_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  arquivo_path TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.imovel_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Corretor gerencia fotos de seus imoveis"
ON public.imovel_fotos FOR ALL
TO authenticated
USING (
  imovel_id IN (
    SELECT id FROM public.imoveis 
    WHERE corretor_id = public.get_corretor_id()
  )
);

CREATE POLICY "Fotos de imoveis sao visiveis publicamente"
ON public.imovel_fotos FOR SELECT
TO public
USING (true);

-- Índice para performance
CREATE INDEX idx_imovel_fotos_imovel ON public.imovel_fotos(imovel_id);
CREATE INDEX idx_imovel_fotos_principal ON public.imovel_fotos(imovel_id, principal) WHERE principal = true;
