-- Configuracoes publicas da empresa. Execute uma vez no SQL Editor do Supabase.
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (btrim(company_name) <> ''),
  email text not null check (btrim(email) <> ''),
  whatsapp text not null check (btrim(whatsapp) <> ''),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_settings_singleton_idx
  on public.company_settings ((true));

drop trigger if exists company_settings_updated_at on public.company_settings;
create trigger company_settings_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();

alter table public.company_settings enable row level security;

drop policy if exists "staff read company settings" on public.company_settings;
drop policy if exists "admins insert company settings" on public.company_settings;
drop policy if exists "admins update company settings" on public.company_settings;

create policy "staff read company settings"
  on public.company_settings for select to authenticated
  using ((select public.is_active_staff()));

create policy "admins insert company settings"
  on public.company_settings for insert to authenticated
  with check ((select public.is_admin()));

create policy "admins update company settings"
  on public.company_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.company_settings to authenticated;

insert into public.company_settings (company_name, email, whatsapp, address)
select 'CIASSTEC', 'ciasstec@ciasstec.com.br', '+55 (81) 98385-7466', null
where not exists (select 1 from public.company_settings);
