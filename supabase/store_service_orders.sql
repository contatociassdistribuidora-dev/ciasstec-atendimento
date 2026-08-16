-- CIASSTEC Atendimento — Fase 4: itens de OS, reservas e orçamento integrado.
-- Dependências: full_setup.sql, store_inventory.sql e store_sales.sql, nesta ordem.
-- Migration aditiva. Não executada remotamente.

alter table public.quote_items add column if not exists product_id uuid references public.products(id) on delete restrict;
alter table public.quote_items add column if not exists service_id uuid references public.services(id) on delete restrict;
alter table public.quote_items add column if not exists discount numeric(14,2) not null default 0 check(discount >= 0);
alter table public.quote_items add column if not exists subtotal numeric(14,2) generated always as (round(quantity * unit_value - discount,2)) stored;
alter table public.products add column if not exists reserved_stock numeric(14,3) not null default 0 check(reserved_stock >= 0);
create index if not exists quote_items_product_idx on public.quote_items(product_id) where product_id is not null;
create index if not exists quote_items_service_idx on public.quote_items(service_id) where service_id is not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='quote_items_catalog_reference') then
  alter table public.quote_items add constraint quote_items_catalog_reference check(num_nonnulls(product_id,service_id)<=1);
 end if;
end $$;

create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete restrict,
  item_type text not null check(item_type in ('product','service')),
  product_id uuid references public.products(id) on delete restrict,
  service_id uuid references public.services(id) on delete restrict,
  source_quote_item_id uuid references public.quote_items(id) on delete restrict,
  description text not null,
  quantity numeric(14,3) not null check(quantity > 0),
  unit_price numeric(14,2) not null check(unit_price >= 0),
  unit_cost numeric(14,4) not null default 0 check(unit_cost >= 0),
  discount numeric(14,2) not null default 0 check(discount >= 0),
  subtotal numeric(14,2) generated always as (round(quantity * unit_price - discount,2)) stored,
  stock_status text check(stock_status in ('PENDING','RESERVED','USED','RETURNED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint service_order_items_single_reference check(num_nonnulls(product_id,service_id)=1),
  constraint service_order_items_type_reference check(
    (item_type='product' and product_id is not null and service_id is null and stock_status is not null) or
    (item_type='service' and service_id is not null and product_id is null and stock_status is null)
  ),
  constraint service_order_items_discount_not_above_total check(discount <= round(quantity * unit_price,2))
);
create index if not exists service_order_items_order_idx on public.service_order_items(service_order_id);
create index if not exists service_order_items_product_idx on public.service_order_items(product_id) where product_id is not null;
create index if not exists service_order_items_service_idx on public.service_order_items(service_id) where service_id is not null;
create index if not exists service_order_items_source_quote_idx on public.service_order_items(source_quote_item_id) where source_quote_item_id is not null;
create index if not exists service_order_items_stock_status_idx on public.service_order_items(stock_status) where stock_status is not null;
create unique index if not exists service_order_items_quote_source_uq on public.service_order_items(service_order_id,source_quote_item_id) where source_quote_item_id is not null;
drop trigger if exists service_order_items_updated_at on public.service_order_items;
create trigger service_order_items_updated_at before update on public.service_order_items for each row execute function public.set_updated_at();

create or replace view public.product_stock_availability with (security_invoker=true) as
select p.id as product_id,p.name,p.internal_code,p.barcode,p.category_id,p.sale_price,p.average_cost,p.active,
 p.current_stock as total_stock,p.reserved_stock,(p.current_stock-p.reserved_stock)::numeric(14,3) as available_stock
from public.products p;

create or replace function private.can_manage_service_orders() returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (select public.is_active_staff());
$$;

create or replace function private.recalculate_service_order(order_uuid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare product_total numeric; service_total numeric;
begin
 select coalesce(sum(subtotal) filter(where item_type='product' and stock_status<>'RETURNED'),0),
        coalesce(sum(subtotal) filter(where item_type='service'),0)
 into product_total,service_total from public.service_order_items where service_order_id=order_uuid;
 update public.service_orders set parts_value=product_total,labor_value=service_total where id=order_uuid;
end; $$;

create or replace function private.reserve_service_order_item(item_uuid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item_row public.service_order_items; product_row public.products; reserved numeric;
begin
 if not (select private.can_manage_service_orders()) then raise exception 'Sem permissão para reservar item'; end if;
 select * into item_row from public.service_order_items where id=item_uuid for update;
 if item_row.id is null or item_row.item_type<>'product' or item_row.stock_status<>'PENDING' then raise exception 'Item não está pendente'; end if;
 select * into product_row from public.products where id=item_row.product_id for update;
 reserved:=product_row.reserved_stock;
 if product_row.current_stock-reserved<item_row.quantity then raise exception 'Estoque disponível insuficiente'; end if;
 update public.products set reserved_stock=reserved_stock+item_row.quantity where id=product_row.id;
 update public.service_order_items set stock_status='RESERVED' where id=item_uuid;
end; $$;

create or replace function private.use_service_order_item(item_uuid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item_row public.service_order_items; product_row public.products;
begin
 if not (select private.can_manage_service_orders()) then raise exception 'Sem permissão para usar item'; end if;
 select * into item_row from public.service_order_items where id=item_uuid for update;
 if item_row.id is null or item_row.item_type<>'product' or item_row.stock_status not in ('PENDING','RESERVED') then raise exception 'Item não pode ser utilizado'; end if;
 select * into product_row from public.products where id=item_row.product_id for update;
 if product_row.current_stock-product_row.reserved_stock+(case when item_row.stock_status='RESERVED' then item_row.quantity else 0 end)<item_row.quantity then raise exception 'Estoque disponível insuficiente'; end if;
 update public.products set current_stock=current_stock-item_row.quantity,
   reserved_stock=reserved_stock-case when item_row.stock_status='RESERVED' then item_row.quantity else 0 end where id=product_row.id;
 update public.service_order_items set stock_status='USED',unit_cost=product_row.average_cost where id=item_uuid;
 insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,origin_id,user_id,notes)
 values(product_row.id,'SERVICE_ORDER',-item_row.quantity,product_row.current_stock,product_row.current_stock-item_row.quantity,
        product_row.average_cost,'SERVICE_ORDER',item_row.service_order_id,(select auth.uid()),'Uso em ordem de serviço');
 perform private.recalculate_service_order(item_row.service_order_id);
end; $$;

create or replace function private.return_service_order_item(item_uuid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item_row public.service_order_items;
begin
 if not (select private.can_manage_service_orders()) then raise exception 'Sem permissão para devolver item'; end if;
 select * into item_row from public.service_order_items where id=item_uuid for update;
 if item_row.id is null or item_row.item_type<>'product' or item_row.stock_status not in ('PENDING','RESERVED') then raise exception 'Somente item pendente ou reservado pode ser devolvido'; end if;
 perform 1 from public.products where id=item_row.product_id for update;
 if item_row.stock_status='RESERVED' then update public.products set reserved_stock=reserved_stock-item_row.quantity where id=item_row.product_id; end if;
 update public.service_order_items set stock_status='RETURNED' where id=item_uuid;
 perform private.recalculate_service_order(item_row.service_order_id);
end; $$;

create or replace function private.convert_quote_items_to_service_order(quote_uuid uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare quote_row public.quotes; inserted_count integer;
begin
 if not (select private.can_manage_service_orders()) then raise exception 'Sem permissão para converter orçamento'; end if;
 select * into quote_row from public.quotes where id=quote_uuid for update;
 if quote_row.id is null or quote_row.status<>'approved' then raise exception 'Orçamento precisa estar aprovado'; end if;
 insert into public.service_order_items(service_order_id,item_type,product_id,service_id,source_quote_item_id,description,quantity,unit_price,discount,stock_status)
 select quote_row.service_order_id,case when qi.product_id is not null then 'product' else 'service' end,
        qi.product_id,qi.service_id,qi.id,qi.description,qi.quantity,qi.unit_value,qi.discount,
        case when qi.product_id is not null then 'PENDING' else null end
 from public.quote_items qi where qi.quote_id=quote_uuid and num_nonnulls(qi.product_id,qi.service_id)=1
 on conflict(service_order_id,source_quote_item_id) where source_quote_item_id is not null do nothing;
 get diagnostics inserted_count=row_count;
 perform private.recalculate_service_order(quote_row.service_order_id);
 return inserted_count;
end; $$;

create or replace function private.release_cancelled_order_reservations() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='cancelled' and old.status is distinct from new.status then
   perform 1 from public.products p where p.id in
    (select product_id from public.service_order_items where service_order_id=new.id and stock_status='RESERVED') order by p.id for update;
   update public.products p set reserved_stock=p.reserved_stock-r.quantity from
    (select product_id,sum(quantity) quantity from public.service_order_items where service_order_id=new.id and stock_status='RESERVED' group by product_id) r
    where p.id=r.product_id;
   update public.service_order_items set stock_status='RETURNED' where service_order_id=new.id and stock_status='RESERVED';
 end if;
 return new;
end; $$;
drop trigger if exists service_orders_release_reservations on public.service_orders;
create trigger service_orders_release_reservations before update of status on public.service_orders
for each row execute function private.release_cancelled_order_reservations();

create or replace function public.reserve_service_order_item(item_uuid uuid) returns void language sql security invoker set search_path='' as $$select private.reserve_service_order_item(item_uuid);$$;
create or replace function public.use_service_order_item(item_uuid uuid) returns void language sql security invoker set search_path='' as $$select private.use_service_order_item(item_uuid);$$;
create or replace function public.return_service_order_item(item_uuid uuid) returns void language sql security invoker set search_path='' as $$select private.return_service_order_item(item_uuid);$$;
create or replace function public.convert_quote_items_to_service_order(quote_uuid uuid) returns integer language sql security invoker set search_path='' as $$select private.convert_quote_items_to_service_order(quote_uuid);$$;

revoke execute on function private.can_manage_service_orders(),private.recalculate_service_order(uuid),private.reserve_service_order_item(uuid),private.use_service_order_item(uuid),private.return_service_order_item(uuid),private.convert_quote_items_to_service_order(uuid),private.release_cancelled_order_reservations() from public,anon;
grant execute on function private.reserve_service_order_item(uuid),private.use_service_order_item(uuid),private.return_service_order_item(uuid),private.convert_quote_items_to_service_order(uuid) to authenticated;
revoke execute on function public.reserve_service_order_item(uuid),public.use_service_order_item(uuid),public.return_service_order_item(uuid),public.convert_quote_items_to_service_order(uuid) from public,anon;
grant execute on function public.reserve_service_order_item(uuid),public.use_service_order_item(uuid),public.return_service_order_item(uuid),public.convert_quote_items_to_service_order(uuid) to authenticated;

alter table public.service_order_items enable row level security;
drop policy if exists "staff read service order items" on public.service_order_items;
create policy "staff read service order items" on public.service_order_items for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "staff create service order items" on public.service_order_items;
create policy "staff create service order items" on public.service_order_items for insert to authenticated with check ((select public.is_active_staff()) and (stock_status='PENDING' or stock_status is null));
drop policy if exists "staff update pending service order items" on public.service_order_items;
create policy "staff update pending service order items" on public.service_order_items for update to authenticated
 using ((select public.is_active_staff()) and (stock_status='PENDING' or stock_status is null))
 with check ((select public.is_active_staff()) and (stock_status='PENDING' or stock_status is null));
drop policy if exists "admins delete pending service order items" on public.service_order_items;
create policy "admins delete pending service order items" on public.service_order_items for delete to authenticated using ((select public.is_admin()) and (stock_status='PENDING' or stock_status is null));

grant select,insert,update,delete on public.service_order_items to authenticated;
grant select on public.product_stock_availability to authenticated;
revoke all on public.service_order_items,public.product_stock_availability from anon;
