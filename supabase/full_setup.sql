-- CIASSTEC Atendimento — configuração completa do banco Supabase
-- Execute este arquivo no SQL Editor de um projeto novo.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'attendant', 'technician');
create type public.message_origin as enum ('whatsapp', 'email', 'system');
create type public.message_status as enum ('pending', 'sent', 'delivered', 'read', 'failed');
create type public.conversation_status as enum ('open', 'waiting', 'in_progress', 'closed');
create type public.equipment_type as enum ('computer', 'notebook', 'printer', 'monitor', 'router', 'other');
create type public.service_order_status as enum ('received', 'analysis', 'waiting_quote', 'quote_sent', 'quote_approved', 'maintenance', 'waiting_part', 'ready', 'delivered', 'cancelled');
create type public.quote_status as enum ('draft', 'pending', 'approved', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'attendant',
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null,
  whatsapp text, email text, cpf text, address text, notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  subject text, status public.conversation_status not null default 'open', last_message_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null, sender_profile_id uuid references public.profiles(id) on delete set null,
  content text not null, origin public.message_origin not null default 'system', status public.message_status not null default 'pending',
  external_id text, is_inbound boolean not null default true, sent_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  type public.equipment_type not null, manufacturer text, model text, serial_number text, received_accessories text,
  reported_issue text not null, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create sequence public.service_order_number_seq start 1;
create table public.service_orders (
  id uuid primary key default gen_random_uuid(), number text not null unique default ('OS-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.service_order_number_seq')::text, 4, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict, equipment_id uuid not null references public.equipment(id) on delete restrict,
  entry_date date not null default current_date, reported_issue text not null, technical_diagnosis text, service_performed text, parts_used text,
  parts_value numeric(12,2) not null default 0 check(parts_value >= 0), labor_value numeric(12,2) not null default 0 check(labor_value >= 0),
  total_value numeric(12,2) generated always as (parts_value + labor_value) stored,
  technician_id uuid references public.profiles(id) on delete set null, expected_delivery date,
  status public.service_order_status not null default 'received', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(), service_order_id uuid not null references public.service_orders(id) on delete cascade,
  status public.quote_status not null default 'draft', notes text, valid_until date, approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.quotes(id) on delete cascade,
  item_type text not null check(item_type in ('part','service')), description text not null,
  quantity numeric(10,2) not null default 1 check(quantity > 0), unit_value numeric(12,2) not null default 0 check(unit_value >= 0),
  total numeric(12,2) generated always as (quantity * unit_value) stored, created_at timestamptz not null default now()
);

create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(), problem text not null, category text not null, symptoms text not null,
  questions text, possible_diagnosis text, guidance text not null, approximate_price numeric(12,2),
  active boolean not null default true, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers using gin (to_tsvector('portuguese', name));
create index customers_phone_idx on public.customers(phone);
create index conversations_customer_idx on public.conversations(customer_id);
create index conversations_status_last_idx on public.conversations(status, last_message_at desc);
create index messages_conversation_sent_idx on public.messages(conversation_id, sent_at desc);
create unique index messages_external_id_idx on public.messages(external_id) where external_id is not null;
create index equipment_customer_idx on public.equipment(customer_id);
create index equipment_serial_idx on public.equipment(serial_number);
create index service_orders_customer_idx on public.service_orders(customer_id);
create index service_orders_equipment_idx on public.service_orders(equipment_id);
create index service_orders_status_idx on public.service_orders(status);
create index quotes_service_order_idx on public.quotes(service_order_id);
create index quote_items_quote_idx on public.quote_items(quote_id);
create index knowledge_search_idx on public.knowledge_base using gin (to_tsvector('portuguese', problem || ' ' || symptoms || ' ' || guidance));

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();
create trigger service_orders_updated_at before update on public.service_orders for each row execute function public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger knowledge_updated_at before update on public.knowledge_base for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Usuário')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and active = true);
$$;

create or replace function public.is_active_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active = true);
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.equipment enable row level security;
alter table public.service_orders enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.knowledge_base enable row level security;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_active_staff());
-- Somente administradores alteram profiles, impedindo elevação do próprio papel pelo cliente.
create policy "admins update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins insert profiles" on public.profiles for insert to authenticated with check (public.is_admin());
create policy "admins delete profiles" on public.profiles for delete to authenticated using (public.is_admin());

-- Usuários autenticados e ativos operam registros; exclusões ficam restritas a administradores.
create policy "staff read customers" on public.customers for select to authenticated using (public.is_active_staff());
create policy "staff insert customers" on public.customers for insert to authenticated with check (public.is_active_staff());
create policy "staff update customers" on public.customers for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete customers" on public.customers for delete to authenticated using (public.is_admin());

create policy "staff read conversations" on public.conversations for select to authenticated using (public.is_active_staff());
create policy "staff insert conversations" on public.conversations for insert to authenticated with check (public.is_active_staff());
create policy "staff update conversations" on public.conversations for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete conversations" on public.conversations for delete to authenticated using (public.is_admin());
create policy "staff read messages" on public.messages for select to authenticated using (public.is_active_staff());
create policy "staff insert messages" on public.messages for insert to authenticated with check (public.is_active_staff());
create policy "staff update messages" on public.messages for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete messages" on public.messages for delete to authenticated using (public.is_admin());
create policy "staff read equipment" on public.equipment for select to authenticated using (public.is_active_staff());
create policy "staff insert equipment" on public.equipment for insert to authenticated with check (public.is_active_staff());
create policy "staff update equipment" on public.equipment for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete equipment" on public.equipment for delete to authenticated using (public.is_admin());
create policy "staff read service orders" on public.service_orders for select to authenticated using (public.is_active_staff());
create policy "staff insert service orders" on public.service_orders for insert to authenticated with check (public.is_active_staff());
create policy "staff update service orders" on public.service_orders for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete service orders" on public.service_orders for delete to authenticated using (public.is_admin());
create policy "staff read quotes" on public.quotes for select to authenticated using (public.is_active_staff());
create policy "staff insert quotes" on public.quotes for insert to authenticated with check (public.is_active_staff());
create policy "staff update quotes" on public.quotes for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete quotes" on public.quotes for delete to authenticated using (public.is_admin());
create policy "staff read quote items" on public.quote_items for select to authenticated using (public.is_active_staff());
create policy "staff insert quote items" on public.quote_items for insert to authenticated with check (public.is_active_staff());
create policy "staff update quote items" on public.quote_items for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admins delete quote items" on public.quote_items for delete to authenticated using (public.is_admin());
create policy "staff read knowledge" on public.knowledge_base for select to authenticated using (public.is_active_staff());
create policy "admins manage knowledge" on public.knowledge_base for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Configuracoes da empresa: um registro, leitura da equipe e escrita apenas do administrador.
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (btrim(company_name) <> ''),
  email text not null check (btrim(email) <> ''),
  whatsapp text not null check (btrim(whatsapp) <> ''),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists company_settings_singleton_idx on public.company_settings ((true));
drop trigger if exists company_settings_updated_at on public.company_settings;
create trigger company_settings_updated_at before update on public.company_settings
  for each row execute function public.set_updated_at();
alter table public.company_settings enable row level security;
drop policy if exists "staff read company settings" on public.company_settings;
drop policy if exists "admins insert company settings" on public.company_settings;
drop policy if exists "admins update company settings" on public.company_settings;
create policy "staff read company settings" on public.company_settings for select to authenticated using ((select public.is_active_staff()));
create policy "admins insert company settings" on public.company_settings for insert to authenticated with check ((select public.is_admin()));
create policy "admins update company settings" on public.company_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert, update on public.company_settings to authenticated;
insert into public.company_settings (company_name, email, whatsapp, address)
select 'CIASSTEC', 'ciasstec@ciasstec.com.br', '+55 (81) 98385-7466', null
where not exists (select 1 from public.company_settings);

insert into public.knowledge_base (problem, category, symptoms, questions, possible_diagnosis, guidance, approximate_price) values
('Notebook não liga','Notebook','Sem LEDs, tela preta ou liga e desliga','O carregador acende? Houve queda ou contato com líquido?','Fonte, conector, memória ou placa-mãe','Testar outra tomada e encaminhar para diagnóstico técnico.',null),
('Computador lento','Desempenho','Travamentos e inicialização demorada','Quando começou? O disco está cheio?','HD degradado, pouca memória ou excesso de programas','Avaliar saúde do disco, memória e programas de inicialização.',120),
('Windows não inicia','Sistema operacional','Loop de reparo ou tela de erro','Houve atualização ou queda de energia?','Arquivos corrompidos ou falha no disco','Preservar dados e realizar diagnóstico antes da reinstalação.',150),
('Impressora não imprime','Impressora','Fila parada, erro ou folha em branco','Qual mensagem aparece? Conexão USB ou Wi-Fi?','Driver, conexão, cabeçote ou suprimento','Verificar fila, conexão e suprimentos antes de enviar para bancada.',null),
('Problema de Wi-Fi','Redes','Sinal fraco, quedas ou sem conexão','Acontece em todos os dispositivos?','Roteador, interferência ou provedor','Reiniciar equipamentos e testar próximo ao roteador.',null),
('Troca de SSD','Upgrade','Lentidão ou pouco espaço','Qual modelo e capacidade desejada?','Upgrade de armazenamento','Confirmar compatibilidade, backup e necessidade de clonagem.',250),
('Formatação','Sistema operacional','Falhas recorrentes ou sistema comprometido','Há arquivos para backup e licenças?','Reinstalação do sistema','Fazer backup autorizado e instalar sistema e drivers.',180),
('Limpeza preventiva','Manutenção','Aquecimento, ruído ou desligamento','Quando foi a última limpeza?','Acúmulo de poeira e pasta térmica ressecada','Realizar desmontagem, limpeza e troca de pasta térmica.',150);
