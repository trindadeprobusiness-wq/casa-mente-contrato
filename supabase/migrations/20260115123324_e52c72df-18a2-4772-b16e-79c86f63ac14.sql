-- Create videos type enum
CREATE TYPE public.tipo_video AS ENUM ('TOUR_VIRTUAL', 'APRESENTACAO', 'DEPOIMENTO', 'DRONE', 'INSTITUCIONAL', 'OUTRO');

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_url TEXT NOT NULL,
  video_path TEXT NOT NULL,
  thumbnail_url TEXT,
  duracao_segundos INTEGER,
  tipo tipo_video NOT NULL DEFAULT 'OUTRO',
  visualizacoes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Corretor gerencia seus videos"
ON public.videos
FOR ALL
USING (corretor_id = get_corretor_id());

-- Create trigger for updated_at
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for videos bucket
CREATE POLICY "Corretor faz upload de videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.corretores WHERE user_id = auth.uid())
);

CREATE POLICY "Corretor gerencia seus videos storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.corretores WHERE user_id = auth.uid())
);

CREATE POLICY "Videos publicos para visualizacao"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');