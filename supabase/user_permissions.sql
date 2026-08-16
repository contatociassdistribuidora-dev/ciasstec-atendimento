-- Autorização granular CIASSTEC. Migration aditiva: não remove usuários nem profiles.
create schema if not exists private;

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role_name text not null check (role_name in ('admin','vendedor','tecnico')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'), module text not null, action text not null,
  label text not null, created_at timestamptz not null default now(), unique(module,action)
);
create table if not exists public.role_permissions (
  role_name text not null check (role_name in ('admin','vendedor','tecnico')),
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key(role_name,permission_key)
);
create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  allowed boolean not null, updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,permission_key)
);
create table if not exists public.permission_audit_log (
  id bigint generated always as identity primary key, changed_by uuid references public.profiles(id) on delete set null,
  target_user_id uuid not null references public.profiles(id) on delete cascade, change_type text not null,
  old_value jsonb, new_value jsonb, changed_at timestamptz not null default now()
);
create index if not exists user_permissions_user_idx on public.user_permissions(user_id);
create index if not exists permission_audit_target_idx on public.permission_audit_log(target_user_id,changed_at desc);

insert into public.permissions(key,module,action,label) values
('dashboard.view','dashboard','view','Visualizar dashboard'),('atendimentos.view','atendimentos','view','Visualizar atendimentos'),
('clientes.view','clientes','view','Visualizar clientes'),('clientes.create','clientes','create','Cadastrar clientes'),('clientes.edit','clientes','edit','Editar clientes'),('clientes.delete','clientes','delete','Excluir clientes'),
('equipamentos.view','equipamentos','view','Visualizar equipamentos'),('equipamentos.create','equipamentos','create','Cadastrar equipamentos'),('equipamentos.edit','equipamentos','edit','Editar equipamentos'),('equipamentos.delete','equipamentos','delete','Excluir equipamentos'),
('ordens_servico.view','ordens_servico','view','Visualizar OS'),('ordens_servico.create','ordens_servico','create','Criar OS'),('ordens_servico.edit','ordens_servico','edit','Editar OS'),('ordens_servico.reserve_part','ordens_servico','reserve_part','Reservar peça'),('ordens_servico.use_part','ordens_servico','use_part','Utilizar peça'),('ordens_servico.finish','ordens_servico','finish','Finalizar OS'),('ordens_servico.delete','ordens_servico','delete','Excluir OS'),
('orcamentos.view','orcamentos','view','Visualizar orçamentos'),('orcamentos.create','orcamentos','create','Criar orçamentos'),('orcamentos.edit','orcamentos','edit','Editar orçamentos'),('orcamentos.approve','orcamentos','approve','Aprovar orçamentos'),('orcamentos.print','orcamentos','print','Imprimir orçamentos'),
('frente_loja.view','frente_loja','view','Visualizar frente de loja'),('frente_loja.create','frente_loja','create','Operar frente de loja'),
('vendas.view','vendas','view','Visualizar vendas'),('vendas.create','vendas','create','Criar vendas'),('vendas.discount','vendas','discount','Dar desconto'),('vendas.cancel','vendas','cancel','Cancelar vendas'),('vendas.print','vendas','print','Imprimir vendas'),
('produtos.view','produtos','view','Visualizar produtos'),('produtos.create','produtos','create','Cadastrar produtos'),('produtos.edit','produtos','edit','Editar produtos'),('produtos.view_cost','produtos','view_cost','Visualizar custo'),('produtos.change_price','produtos','change_price','Alterar preço'),
('categorias.view','categorias','view','Visualizar categorias'),('categorias.create','categorias','create','Cadastrar categorias'),('categorias.edit','categorias','edit','Editar categorias'),('categorias.delete','categorias','delete','Excluir categorias'),
('estoque.view','estoque','view','Visualizar estoque'),('estoque.entry','estoque','entry','Dar entrada'),('estoque.adjust_stock','estoque','adjust_stock','Ajustar estoque'),('estoque.view_cost','estoque','view_cost','Visualizar custo'),
('movimentacoes.view','movimentacoes','view','Visualizar movimentações'),('fornecedores.view','fornecedores','view','Visualizar fornecedores'),('fornecedores.create','fornecedores','create','Cadastrar fornecedores'),('fornecedores.edit','fornecedores','edit','Editar fornecedores'),('fornecedores.delete','fornecedores','delete','Excluir fornecedores'),
('base_conhecimento.view','base_conhecimento','view','Visualizar base'),('base_conhecimento.create','base_conhecimento','create','Cadastrar artigo'),('base_conhecimento.edit','base_conhecimento','edit','Editar artigo'),('base_conhecimento.delete','base_conhecimento','delete','Excluir artigo'),('base_conhecimento_ia.view','base_conhecimento_ia','view','Visualizar base IA'),
('relatorios.view','relatorios','view','Visualizar relatórios'),('relatorios.export','relatorios','export','Exportar relatórios'),('configuracoes.view','configuracoes','view','Visualizar configurações'),('configuracoes.manage_integrations','configuracoes','manage_integrations','Gerenciar integrações'),
('usuarios.view','usuarios','view','Visualizar usuários'),('usuarios.create','usuarios','create','Cadastrar usuários'),('usuarios.edit','usuarios','edit','Editar usuários'),('usuarios.reset_password','usuarios','reset_password','Resetar senha'),('usuarios.deactivate','usuarios','deactivate','Desativar usuário'),('usuarios.manage_users','usuarios','manage_users','Gerenciar usuários')
on conflict(key) do update set label=excluded.label,module=excluded.module,action=excluded.action;

insert into public.role_permissions(role_name,permission_key) select 'admin',key from public.permissions on conflict do nothing;
insert into public.role_permissions(role_name,permission_key) values
('vendedor','dashboard.view'),('vendedor','clientes.view'),('vendedor','clientes.create'),('vendedor','clientes.edit'),('vendedor','frente_loja.view'),('vendedor','frente_loja.create'),('vendedor','vendas.view'),('vendedor','vendas.create'),('vendedor','vendas.print'),('vendedor','produtos.view'),('vendedor','categorias.view'),('vendedor','estoque.view'),
('tecnico','dashboard.view'),('tecnico','clientes.view'),('tecnico','equipamentos.view'),('tecnico','equipamentos.create'),('tecnico','equipamentos.edit'),('tecnico','ordens_servico.view'),('tecnico','ordens_servico.create'),('tecnico','ordens_servico.edit'),('tecnico','orcamentos.view'),('tecnico','orcamentos.create'),('tecnico','orcamentos.edit'),('tecnico','produtos.view'),('tecnico','estoque.view'),('tecnico','base_conhecimento.view'),('tecnico','base_conhecimento_ia.view'),('tecnico','atendimentos.view') on conflict do nothing;

-- Compatibilidade: atendente vira vendedor; technician vira tecnico; admin permanece admin.
insert into public.user_roles(user_id,role_name)
select id,case role::text when 'admin' then 'admin' when 'technician' then 'tecnico' else 'vendedor' end from public.profiles
on conflict(user_id) do nothing;

create or replace function private.has_permission(check_user uuid, requested text) returns boolean
language sql stable security definer set search_path='' as $$
  select check_user=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=check_user and p.active) and
  (exists(select 1 from public.user_roles ur where ur.user_id=check_user and ur.role_name='admin') or
   coalesce((select up.allowed from public.user_permissions up where up.user_id=check_user and up.permission_key=requested),
     exists(select 1 from public.user_roles ur join public.role_permissions rp using(role_name) where ur.user_id=check_user and rp.permission_key=requested)));
$$;
create or replace function public.has_permission(requested text) returns boolean language sql stable security invoker set search_path='' as $$ select private.has_permission((select auth.uid()),requested); $$;
create or replace function public.get_my_permissions() returns table(role_name text,permission_key text)
language sql stable security invoker set search_path='' as $$
  select ur.role_name,p.key from public.user_roles ur cross join public.permissions p
  where ur.user_id=(select auth.uid()) and (ur.role_name='admin' or coalesce((select up.allowed from public.user_permissions up where up.user_id=ur.user_id and up.permission_key=p.key),exists(select 1 from public.role_permissions rp where rp.role_name=ur.role_name and rp.permission_key=p.key)));
$$;
revoke execute on function private.has_permission(uuid,text) from public,anon; grant usage on schema private to authenticated; grant execute on function private.has_permission(uuid,text),public.has_permission(text),public.get_my_permissions() to authenticated;

create or replace function private.audit_permissions() returns trigger language plpgsql security definer set search_path='' as $$
declare target_id uuid:=coalesce(new.user_id,old.user_id);
begin
  -- Em cascades de exclusão o profile pode já ter sido removido; não recrie auditoria órfã.
  if not exists(select 1 from public.profiles where id=target_id) then return coalesce(new,old); end if;
  insert into public.permission_audit_log(changed_by,target_user_id,change_type,old_value,new_value)
  values((select auth.uid()),target_id,tg_table_name,to_jsonb(old),to_jsonb(new));
  return coalesce(new,old);
end;$$;
revoke execute on function private.audit_permissions() from public,anon,authenticated;
drop trigger if exists audit_user_roles on public.user_roles; create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function private.audit_permissions();
drop trigger if exists audit_user_permissions on public.user_permissions; create trigger audit_user_permissions after insert or update or delete on public.user_permissions for each row execute function private.audit_permissions();

create or replace function private.audit_profile_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.role is distinct from new.role then
    insert into public.permission_audit_log(changed_by,target_user_id,change_type,old_value,new_value)
    values((select auth.uid()),new.id,'profile_role',jsonb_build_object('role',old.role),jsonb_build_object('role',new.role));
  end if;
  if old.active is distinct from new.active then
    insert into public.permission_audit_log(changed_by,target_user_id,change_type,old_value,new_value)
    values((select auth.uid()),new.id,'profile_active',jsonb_build_object('active',old.active),jsonb_build_object('active',new.active));
  end if;
  return new;
end;$$;
revoke execute on function private.audit_profile_access() from public,anon,authenticated;
drop trigger if exists audit_profile_access on public.profiles;
create trigger audit_profile_access after update of role,active on public.profiles for each row execute function private.audit_profile_access();

create index if not exists permission_audit_changed_by_idx on public.permission_audit_log(changed_by);
create index if not exists role_permissions_permission_idx on public.role_permissions(permission_key);
create index if not exists user_permissions_permission_idx on public.user_permissions(permission_key);
create index if not exists user_permissions_updated_by_idx on public.user_permissions(updated_by);

alter table public.user_roles enable row level security; alter table public.permissions enable row level security; alter table public.role_permissions enable row level security; alter table public.user_permissions enable row level security; alter table public.permission_audit_log enable row level security;
create policy "active users read permission catalog" on public.permissions for select to authenticated using ((select public.is_active_staff()));
create policy "users read own role" on public.user_roles for select to authenticated using (user_id=(select auth.uid()) or (select public.has_permission('usuarios.view')));
create policy "users read own overrides" on public.user_permissions for select to authenticated using (user_id=(select auth.uid()) or (select public.has_permission('usuarios.view')));
create policy "user managers write roles" on public.user_roles for all to authenticated using ((select public.has_permission('usuarios.manage_users'))) with check ((select public.has_permission('usuarios.manage_users')));
create policy "user managers write overrides" on public.user_permissions for all to authenticated using ((select public.has_permission('usuarios.manage_users'))) with check ((select public.has_permission('usuarios.manage_users')) and updated_by=(select auth.uid()));
create policy "user managers read presets" on public.role_permissions for select to authenticated using ((select public.is_active_staff()));
create policy "user managers read audit" on public.permission_audit_log for select to authenticated using ((select public.has_permission('usuarios.manage_users')));
grant select on public.permissions,public.role_permissions,public.user_roles,public.user_permissions to authenticated; grant insert,update,delete on public.user_roles,public.user_permissions to authenticated; grant select on public.permission_audit_log to authenticated; revoke all on public.user_roles,public.permissions,public.role_permissions,public.user_permissions,public.permission_audit_log from anon;

-- Reaproveita as RPCs críticas existentes com a autorização central.
create or replace function private.can_sell() returns boolean language sql stable security definer set search_path='' as $$select private.has_permission((select auth.uid()),'vendas.create')$$;
create or replace function private.can_discount() returns boolean language sql stable security definer set search_path='' as $$select private.has_permission((select auth.uid()),'vendas.discount')$$;
create or replace function private.can_cancel_sale() returns boolean language sql stable security definer set search_path='' as $$select private.has_permission((select auth.uid()),'vendas.cancel')$$;
create or replace function private.can_staff(permission_name text) returns boolean language sql stable security definer set search_path='' as $$select private.has_permission((select auth.uid()),case permission_name when 'view_cost' then 'produtos.view_cost' when 'change_price' then 'produtos.change_price' when 'adjust_stock' then 'estoque.adjust_stock' when 'manage_products' then 'produtos.edit' when 'manage_suppliers' then 'fornecedores.edit' else permission_name end)$$;

-- As policies abaixo substituem acesso genérico nos fluxos mais sensíveis.
drop policy if exists "staff read products" on public.products; create policy "permitted users read products" on public.products for select to authenticated using ((select public.has_permission('produtos.view')) or (select public.has_permission('estoque.view')));
drop policy if exists "staff read sales" on public.sales; create policy "permitted users read sales" on public.sales for select to authenticated using ((select public.has_permission('vendas.view')));
drop policy if exists "staff read sale items" on public.sale_items; create policy "permitted users read sale items" on public.sale_items for select to authenticated using ((select public.has_permission('vendas.view')));
drop policy if exists "staff read sale payments" on public.sale_payments; create policy "permitted users read sale payments" on public.sale_payments for select to authenticated using ((select public.has_permission('vendas.view')));
drop policy if exists "staff read movements" on public.stock_movements; create policy "permitted users read movements" on public.stock_movements for select to authenticated using ((select public.has_permission('movimentacoes.view')) or (select public.has_permission('estoque.view')));
