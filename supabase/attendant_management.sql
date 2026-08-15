-- Campos de gerenciamento de atendentes. Idempotente e sem remoção de dados.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists whatsapp_enabled boolean not null default false;
alter table public.profiles add column if not exists last_login_at timestamptz;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email)) where email is not null;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_active_staff()));

update public.profiles p
set email = u.email,
    last_login_at = u.last_sign_in_at
from auth.users u
where u.id = p.id
  and (p.email is distinct from u.email or p.last_login_at is distinct from u.last_sign_in_at);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Usuário'));
  return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
