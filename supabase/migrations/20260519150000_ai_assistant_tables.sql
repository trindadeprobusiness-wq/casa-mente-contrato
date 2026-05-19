CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nova conversa',
  model TEXT DEFAULT 'grok-4.20-reasoning',
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corretor gerencia suas conversas IA" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  tool_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corretor vê mensagens de suas conversas" ON public.ai_messages
  FOR ALL TO authenticated
  USING (conversation_id IN (SELECT id FROM public.ai_conversations WHERE corretor_id = public.get_corretor_id()))
  WITH CHECK (conversation_id IN (SELECT id FROM public.ai_conversations WHERE corretor_id = public.get_corretor_id()));

CREATE TABLE public.ai_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_attachments_message ON public.ai_attachments(message_id);
ALTER TABLE public.ai_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corretor vê anexos de suas conversas" ON public.ai_attachments
  FOR ALL TO authenticated
  USING (message_id IN (SELECT m.id FROM public.ai_messages m JOIN public.ai_conversations c ON c.id = m.conversation_id WHERE c.corretor_id = public.get_corretor_id()))
  WITH CHECK (message_id IN (SELECT m.id FROM public.ai_messages m JOIN public.ai_conversations c ON c.id = m.conversation_id WHERE c.corretor_id = public.get_corretor_id()));

CREATE TABLE public.ai_rate_limits (
  corretor_id UUID PRIMARY KEY REFERENCES public.corretores(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corretor gerencia seu rate limit" ON public.ai_rate_limits
  FOR ALL TO authenticated
  USING (corretor_id = public.get_corretor_id())
  WITH CHECK (corretor_id = public.get_corretor_id());

INSERT INTO storage.buckets (id, name, public) VALUES ('ai-attachments', 'ai-attachments', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Corretor faz upload em ai-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ai-attachments');
CREATE POLICY "Corretor lê seus uploads em ai-attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ai-attachments');
