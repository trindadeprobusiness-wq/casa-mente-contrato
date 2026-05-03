-- WhatsApp automation: histórico de contatos + alertas
-- Complementa o schema atual sem alterar tabelas existentes

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type public.canal_contato as enum ('WHATSAPP','EMAIL','TELEFONE','PRESENCIAL','OUTRO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.direcao_contato as enum ('IN','OUT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_alerta as enum (
    'LEAD_QUENTE',
    'LEAD_SEM_FOLLOWUP',
    'NOVA_MENSAGEM',
    'QR_DESCONECTADO',
    'ERRO_WORKFLOW',
    'OUTRO'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- historico_contatos
-- ============================================================
create table if not exists public.historico_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo public.canal_contato not null default 'WHATSAPP',
  direcao public.direcao_contato not null,
  conteudo text not null,
  metadata jsonb not null default '{}'::jsonb,
  data_contato timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_historico_cliente_data
  on public.historico_contatos (cliente_id, data_contato desc);
create index if not exists idx_historico_tipo
  on public.historico_contatos (tipo);

alter table public.historico_contatos enable row level security;

drop policy if exists "historico_service_all" on public.historico_contatos;
create policy "historico_service_all" on public.historico_contatos
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "historico_corretor_read" on public.historico_contatos;
create policy "historico_corretor_read" on public.historico_contatos
  for select using (
    exists (
      select 1 from public.clientes c
      join public.corretores co on co.id = c.corretor_id
      where c.id = historico_contatos.cliente_id
        and co.user_id = auth.uid()
    )
  );

-- ============================================================
-- alertas
-- ============================================================
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  corretor_id uuid not null references public.corretores(id) on delete cascade,
  tipo public.tipo_alerta not null,
  mensagem text not null,
  metadata jsonb not null default '{}'::jsonb,
  lido boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_alertas_corretor_nao_lidos
  on public.alertas (corretor_id, lido, created_at desc);

alter table public.alertas enable row level security;

drop policy if exists "alertas_service_all" on public.alertas;
create policy "alertas_service_all" on public.alertas
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "alertas_corretor_crud" on public.alertas;
create policy "alertas_corretor_crud" on public.alertas
  for all using (
    exists (select 1 from public.corretores co where co.id = alertas.corretor_id and co.user_id = auth.uid())
  );

-- ============================================================
-- view auxiliar: clientes com último contato WhatsApp + classificacao do tracking_data
-- ============================================================
create or replace view public.v_leads_whatsapp as
select
  c.id,
  c.nome,
  c.telefone,
  c.email,
  c.status_funil,
  c.corretor_id,
  c.ultimo_contato,
  c.proximo_followup,
  (c.tracking_data ->> 'classificacao')         as classificacao,
  (c.tracking_data -> 'qualificacao')           as qualificacao,
  (select count(*) from public.historico_contatos h
    where h.cliente_id = c.id and h.tipo = 'WHATSAPP') as total_msgs_whatsapp,
  (select max(h.data_contato) from public.historico_contatos h
    where h.cliente_id = c.id and h.tipo = 'WHATSAPP') as ultima_msg_whatsapp
from public.clientes c
where c.tracking_data ->> 'origem' = 'whatsapp'
   or exists (select 1 from public.historico_contatos h where h.cliente_id = c.id and h.tipo = 'WHATSAPP');
