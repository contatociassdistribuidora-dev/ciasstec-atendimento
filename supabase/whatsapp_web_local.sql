-- Migracao minima para distinguir o canal local sem alterar a integracao Meta.
do $$ begin
  create type public.conversation_channel as enum ('whatsapp_meta', 'whatsapp_web_local', 'email', 'system');
exception when duplicate_object then null; end $$;

alter table public.conversations add column if not exists channel public.conversation_channel not null default 'whatsapp_meta';
alter table public.messages add column if not exists direction text not null default 'inbound' check (direction in ('inbound','outbound'));

-- O requisito usa received; adiciona o valor sem recriar o enum existente.
alter type public.message_status add value if not exists 'received';
create index if not exists conversations_channel_idx on public.conversations(channel, last_message_at desc);
