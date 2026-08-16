-- CIASSTEC Atendimento — Fase 2: produtos, fornecedores e estoque.
-- Migration aditiva e idempotente. Revise e faça backup antes de executar no Supabase.
create extension if not exists pg_trgm;

alter table public.profiles add column if not exists can_view_cost boolean not null default false;
alter table public.profiles add column if not exists can_change_price boolean not null default false;
alter table public.profiles add column if not exists can_discount boolean not null default false;
alter table public.profiles add column if not exists can_cancel_sale boolean not null default false;
alter table public.profiles add column if not exists can_adjust_stock boolean not null default false;
alter table public.profiles add column if not exists can_manage_products boolean not null default false;
alter table public.profiles add column if not exists can_manage_suppliers boolean not null default false;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists product_categories_name_uq on public.product_categories (lower(name));

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, legal_name text, cnpj text,
  phone text, whatsapp text, email text, contact_name text, address text, notes text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists suppliers_cnpj_uq on public.suppliers(cnpj) where cnpj is not null and btrim(cnpj) <> '';

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), internal_code text not null, barcode text, name text not null,
  description text, category_id uuid references public.product_categories(id) on delete set null,
  brand text, model text, unit text not null default 'UN', primary_supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  average_cost numeric(14,4) not null default 0 check (average_cost >= 0),
  current_stock numeric(14,3) not null default 0 check (current_stock >= 0),
  reserved_stock numeric(14,3) not null default 0 check (reserved_stock >= 0),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  stock_location text, photo_path text, active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add column if not exists reserved_stock numeric(14,3) not null default 0 check(reserved_stock >= 0);
create unique index if not exists products_internal_code_uq on public.products(lower(internal_code));
create unique index if not exists products_barcode_uq on public.products(barcode) where barcode is not null and btrim(barcode) <> '';
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active);
create index if not exists products_primary_supplier_idx on public.products(primary_supplier_id) where primary_supplier_id is not null;
create index if not exists products_created_by_idx on public.products(created_by) where created_by is not null;

create table if not exists public.product_suppliers (
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  supplier_code text, last_purchase_price numeric(14,2) check(last_purchase_price >= 0),
  primary key(product_id, supplier_id)
);
create index if not exists product_suppliers_supplier_idx on public.product_suppliers(supplier_id);

create table if not exists public.stock_entries (
  id uuid primary key default gen_random_uuid(), supplier_id uuid references public.suppliers(id) on delete restrict,
  entry_date date not null default current_date, document_number text, invoice_number text, notes text,
  status text not null default 'draft' check(status in ('draft','confirmed','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete restrict, confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.stock_entry_items (
  id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.stock_entries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check(quantity > 0), unit_purchase_price numeric(14,2) not null check(unit_purchase_price >= 0),
  total numeric(14,2) generated always as (round(quantity * unit_purchase_price, 2)) stored
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check(movement_type in ('ENTRY','SALE','SERVICE_ORDER','ADJUSTMENT','LOSS','DAMAGE','SUPPLIER_RETURN','INTERNAL_USE','OTHER','REVERSAL')),
  quantity numeric(14,3) not null check(quantity <> 0), previous_stock numeric(14,3) not null,
  resulting_stock numeric(14,3) not null check(resulting_stock >= 0), unit_cost numeric(14,4) not null default 0,
  origin text not null, origin_id uuid, supplier_id uuid references public.suppliers(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict, notes text, created_at timestamptz not null default now()
);
create index if not exists stock_movements_product_date_idx on public.stock_movements(product_id, created_at desc);
create index if not exists stock_movements_type_date_idx on public.stock_movements(movement_type, created_at desc);
create index if not exists stock_movements_user_idx on public.stock_movements(user_id);
create index if not exists stock_movements_supplier_idx on public.stock_movements(supplier_id);

drop trigger if exists product_categories_updated_at on public.product_categories;
create trigger product_categories_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

create schema if not exists private;
create or replace function private.can_staff(permission_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and
    (p.role='admin' or case permission_name
      when 'view_cost' then p.can_view_cost when 'change_price' then p.can_change_price
      when 'adjust_stock' then p.can_adjust_stock when 'manage_products' then p.can_manage_products
      when 'manage_suppliers' then p.can_manage_suppliers else false end));
$$;
revoke execute on function private.can_staff(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_staff(text) to authenticated;

create or replace function public.confirm_stock_entry(entry_uuid uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare e public.stock_entries; i record; p public.products; new_stock numeric; new_cost numeric;
begin
  select * into e from public.stock_entries where id=entry_uuid for update;
  if e.id is null or e.status <> 'draft' then raise exception 'Entrada inexistente ou já processada'; end if;
  if not (select private.can_staff('adjust_stock')) then raise exception 'Sem permissão para confirmar entrada'; end if;
  if not exists(select 1 from public.stock_entry_items where entry_id=entry_uuid) then raise exception 'Entrada sem itens'; end if;
  for i in select * from public.stock_entry_items where entry_id=entry_uuid loop
    select * into p from public.products where id=i.product_id for update;
    new_stock := p.current_stock + i.quantity;
    new_cost := case when new_stock=0 then i.unit_purchase_price else ((p.current_stock*p.average_cost)+(i.quantity*i.unit_purchase_price))/new_stock end;
    update public.products set current_stock=new_stock, average_cost=new_cost, purchase_price=i.unit_purchase_price where id=p.id;
    insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,origin_id,supplier_id,user_id,notes)
      values(p.id,'ENTRY',i.quantity,p.current_stock,new_stock,i.unit_purchase_price,'STOCK_ENTRY',e.id,e.supplier_id,(select auth.uid()),e.notes);
  end loop;
  update public.stock_entries set status='confirmed',confirmed_by=(select auth.uid()),confirmed_at=now() where id=entry_uuid;
end; $$;

create or replace function public.adjust_product_stock(product_uuid uuid, delta numeric, reason text, note text default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare p public.products; next_stock numeric; mapped text;
begin
  if delta=0 then raise exception 'Quantidade deve ser diferente de zero'; end if;
  if not (select private.can_staff('adjust_stock')) then raise exception 'Sem permissão para ajustar estoque'; end if;
  mapped := case reason when 'AJUSTE' then 'ADJUSTMENT' when 'PERDA' then 'LOSS' when 'AVARIA' then 'DAMAGE' when 'DEVOLUCAO_FORNECEDOR' then 'SUPPLIER_RETURN' when 'USO_INTERNO' then 'INTERNAL_USE' else 'OTHER' end;
  select * into p from public.products where id=product_uuid for update;
  next_stock:=p.current_stock+delta; if next_stock<p.reserved_stock then raise exception 'Estoque insuficiente ou reservado em OS'; end if;
  update public.products set current_stock=next_stock where id=p.id;
  insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,user_id,notes)
    values(p.id,mapped,delta,p.current_stock,next_stock,p.average_cost,'MANUAL_ADJUSTMENT',(select auth.uid()),note);
end; $$;

alter table public.product_categories enable row level security; alter table public.products enable row level security;
alter table public.suppliers enable row level security; alter table public.product_suppliers enable row level security;
alter table public.stock_entries enable row level security; alter table public.stock_entry_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "staff read categories" on public.product_categories; create policy "staff read categories" on public.product_categories for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "product managers write categories" on public.product_categories; create policy "product managers write categories" on public.product_categories for all to authenticated using ((select private.can_staff('manage_products'))) with check ((select private.can_staff('manage_products')));
drop policy if exists "staff read products" on public.products; create policy "staff read products" on public.products for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "product managers write products" on public.products; create policy "product managers write products" on public.products for all to authenticated using ((select private.can_staff('manage_products'))) with check ((select private.can_staff('manage_products')));
drop policy if exists "staff read suppliers" on public.suppliers; create policy "staff read suppliers" on public.suppliers for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "supplier managers write suppliers" on public.suppliers; create policy "supplier managers write suppliers" on public.suppliers for all to authenticated using ((select private.can_staff('manage_suppliers'))) with check ((select private.can_staff('manage_suppliers')));
drop policy if exists "staff read product suppliers" on public.product_suppliers; create policy "staff read product suppliers" on public.product_suppliers for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "product managers write product suppliers" on public.product_suppliers; create policy "product managers write product suppliers" on public.product_suppliers for all to authenticated using ((select private.can_staff('manage_products'))) with check ((select private.can_staff('manage_products')));
drop policy if exists "stock staff read entries" on public.stock_entries; create policy "stock staff read entries" on public.stock_entries for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "stock staff write entries" on public.stock_entries; create policy "stock staff write entries" on public.stock_entries for all to authenticated using ((select private.can_staff('adjust_stock'))) with check ((select private.can_staff('adjust_stock')));
drop policy if exists "stock staff read entry items" on public.stock_entry_items; create policy "stock staff read entry items" on public.stock_entry_items for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "stock staff write entry items" on public.stock_entry_items; create policy "stock staff write entry items" on public.stock_entry_items for all to authenticated using ((select private.can_staff('adjust_stock'))) with check ((select private.can_staff('adjust_stock')));
drop policy if exists "staff read movements" on public.stock_movements; create policy "staff read movements" on public.stock_movements for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "stock staff insert movements" on public.stock_movements; create policy "stock staff insert movements" on public.stock_movements for insert to authenticated with check ((select private.can_staff('adjust_stock')) and user_id=(select auth.uid()));

grant select on public.product_categories,public.products,public.suppliers,public.product_suppliers,public.stock_entries,public.stock_entry_items,public.stock_movements to authenticated;
grant insert,update on public.product_categories,public.products,public.suppliers,public.product_suppliers,public.stock_entries,public.stock_entry_items to authenticated;
grant insert on public.stock_movements to authenticated;
grant execute on function public.confirm_stock_entry(uuid),public.adjust_product_stock(uuid,numeric,text,text) to authenticated;
revoke all on public.product_categories,public.products,public.suppliers,public.product_suppliers,public.stock_entries,public.stock_entry_items,public.stock_movements from anon;
revoke execute on function public.is_active_staff(),public.is_admin() from public,anon;
grant execute on function public.is_active_staff(),public.is_admin() to authenticated;

insert into public.product_categories(name) select name from unnest(array[
 'Computadores','Notebooks','Impressoras','Monitores','Roteadores','Redes','Periféricos','Teclados','Mouses','Headsets','Cabos','Adaptadores','Fontes','Memórias','SSD','HD','Gabinetes','Placas-mãe','Placas de vídeo','Processadores','Coolers','Baterias','Carregadores','Tintas','Toners','Peças para impressoras','Ferramentas','Acessórios','Outros'
]) name on conflict do nothing;
