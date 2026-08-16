-- Proteção complementar de custos. Executar somente DEPOIS de user_permissions.sql.
-- Não altera dados e não depende de identificadores enviados pelo navegador para autorizar.

-- Projeção operacional: nenhum custo, margem ou identificador de fornecedor é exposto.
create or replace view public.products_operational with (security_invoker=true) as
select p.id,p.internal_code,p.barcode,p.name,p.description,p.category_id,c.name as category_name,
       p.brand,p.model,p.unit,p.sale_price,p.current_stock,p.reserved_stock,
       (p.current_stock-p.reserved_stock)::numeric(14,3) as available_stock,
       p.minimum_stock,p.stock_location,p.photo_path,p.active,p.created_at,p.updated_at
from public.products p left join public.product_categories c on c.id=p.category_id;

-- CREATE OR REPLACE não permite remover colunas de uma view existente.
-- Recriamos somente a view (não há dados armazenados nela) para eliminar average_cost.
drop view if exists public.product_stock_availability;
create view public.product_stock_availability with (security_invoker=true) as
select p.id as product_id,p.name,p.internal_code,p.barcode,p.category_id,p.sale_price,p.active,
       p.current_stock as total_stock,p.reserved_stock,
       (p.current_stock-p.reserved_stock)::numeric(14,3) as available_stock
from public.products p;

create or replace view public.stock_movements_operational with (security_invoker=true) as
select m.id,m.product_id,m.movement_type,m.quantity,m.previous_stock,m.resulting_stock,m.origin,m.origin_id,
       m.supplier_id,m.user_id,m.notes,m.created_at,
       jsonb_build_object('name',p.name,'internal_code',p.internal_code) as products,
       case when pr.id is null then null else jsonb_build_object('full_name',pr.full_name) end as profiles,
       case when s.id is null then null else jsonb_build_object('name',s.name) end as suppliers
from public.stock_movements m join public.products p on p.id=m.product_id
left join public.profiles pr on pr.id=m.user_id left join public.suppliers s on s.id=m.supplier_id;

create or replace view public.service_order_items_operational with (security_invoker=true) as
select id,service_order_id,item_type,product_id,service_id,source_quote_item_id,description,
       quantity,unit_price,discount,subtotal,stock_status,created_at,updated_at
from public.service_order_items;

create or replace view public.sales_operational with (security_invoker=true) as
select id,sale_number,customer_id,seller_id,status,subtotal,discount,total,payment_status,
       created_at,updated_at,cancelled_at,cancelled_by,cancellation_reason
from public.sales;

create or replace view public.sale_items_operational with (security_invoker=true) as
select id,sale_id,product_id,service_id,description,quantity,unit_price,discount,subtotal,item_type,created_at
from public.sale_items;

-- SELECT de tabela não pode coexistir com revogação por coluna: primeiro removemos o grant amplo.
revoke select on table public.products from authenticated;
grant select(id,internal_code,barcode,name,description,category_id,brand,model,unit,sale_price,current_stock,
 reserved_stock,minimum_stock,stock_location,photo_path,active,created_at,updated_at) on public.products to authenticated;

revoke select on table public.stock_movements from authenticated;
grant select(id,product_id,movement_type,quantity,previous_stock,resulting_stock,origin,origin_id,supplier_id,user_id,notes,created_at)
 on public.stock_movements to authenticated;

revoke select on table public.service_order_items from authenticated;
grant select(id,service_order_id,item_type,product_id,service_id,source_quote_item_id,description,quantity,unit_price,
 discount,subtotal,stock_status,created_at,updated_at) on public.service_order_items to authenticated;

revoke select on table public.sales from authenticated;
grant select(id,sale_number,customer_id,seller_id,status,subtotal,discount,total,payment_status,created_at,updated_at,
 cancelled_at,cancelled_by,cancellation_reason) on public.sales to authenticated;

revoke select on table public.sale_items from authenticated;
grant select(id,sale_id,product_id,service_id,description,quantity,unit_price,discount,subtotal,item_type,created_at)
 on public.sale_items to authenticated;

revoke select on table public.product_suppliers from authenticated;
grant select(product_id,supplier_id,supplier_code) on public.product_suppliers to authenticated;
revoke select on table public.stock_entry_items from authenticated;
grant select(id,entry_id,product_id,quantity) on public.stock_entry_items to authenticated;

revoke all on public.products_operational,public.stock_movements_operational,public.service_order_items_operational,
 public.sales_operational,public.sale_items_operational from public,anon;
grant select on public.products_operational,public.stock_movements_operational,public.service_order_items_operational,
 public.sales_operational,public.sale_items_operational to authenticated;
revoke all on public.product_stock_availability from public,anon;
grant select on public.product_stock_availability to authenticated;

-- RPC financeira. A identidade vem exclusivamente de auth.uid() dentro de private.has_permission.
create or replace function private.get_product_costs(requested_ids uuid[] default null)
returns table(product_id uuid,purchase_price numeric,average_cost numeric,primary_supplier_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'produtos.view_cost')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  return query select p.id,p.purchase_price,p.average_cost,p.primary_supplier_id from public.products p
    where requested_ids is null or p.id=any(requested_ids);
end;$$;

create or replace function public.get_product_costs(requested_ids uuid[] default null)
returns table(product_id uuid,purchase_price numeric,average_cost numeric,primary_supplier_id uuid)
language sql stable security invoker set search_path='' as $$select * from private.get_product_costs(requested_ids)$$;

create or replace function private.get_service_order_item_costs(requested_order uuid)
returns table(item_id uuid,unit_cost numeric)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'produtos.view_cost')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  return query select i.id,i.unit_cost from public.service_order_items i where i.service_order_id=requested_order;
end;$$;

create or replace function public.get_service_order_item_costs(requested_order uuid)
returns table(item_id uuid,unit_cost numeric)
language sql stable security invoker set search_path='' as $$select * from private.get_service_order_item_costs(requested_order)$$;

create or replace function private.get_sales_financials(from_date timestamptz default null)
returns table(sale_id uuid,cost_total numeric,gross_profit numeric)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'produtos.view_cost')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  return query select s.id,s.cost_total,s.gross_profit from public.sales s where from_date is null or s.created_at>=from_date;
end;$$;

create or replace function public.get_sales_financials(from_date timestamptz default null)
returns table(sale_id uuid,cost_total numeric,gross_profit numeric)
language sql stable security invoker set search_path='' as $$select * from private.get_sales_financials(from_date)$$;

revoke execute on function private.get_product_costs(uuid[]),private.get_service_order_item_costs(uuid),private.get_sales_financials(timestamptz) from public,anon;
revoke execute on function public.get_product_costs(uuid[]),public.get_service_order_item_costs(uuid),public.get_sales_financials(timestamptz) from public,anon;
grant execute on function private.get_product_costs(uuid[]),private.get_service_order_item_costs(uuid),private.get_sales_financials(timestamptz) to authenticated;
grant execute on function public.get_product_costs(uuid[]),public.get_service_order_item_costs(uuid),public.get_sales_financials(timestamptz) to authenticated;

-- O RPC legado retornava cost_total/gross_profit. Bloqueamos sua superfície pública e oferecemos retorno operacional.
revoke execute on function public.finalize_sale(uuid,jsonb,numeric,text,text) from authenticated;
revoke execute on function private.finalize_sale(uuid,jsonb,numeric,text,text) from authenticated;

-- Mantém compatibilidade com o cliente atual, mas zera a projeção financeira para quem não pode vê-la.
create or replace function private.finalize_sale_safe(customer_uuid uuid,items jsonb,sale_discount numeric,method text,payment_reference text default null)
returns table(id uuid,sale_number text,total numeric,cost_total numeric,gross_profit numeric)
language sql security definer set search_path='' as $$
  select result.id,result.sale_number,result.total,
    case when private.has_permission((select auth.uid()),'produtos.view_cost') then result.cost_total else null end,
    case when private.has_permission((select auth.uid()),'produtos.view_cost') then result.gross_profit else null end
  from private.finalize_sale(customer_uuid,items,sale_discount,method,payment_reference) result
  where (select auth.uid()) is not null and private.has_permission((select auth.uid()),'vendas.create');
$$;
create or replace function public.finalize_sale(customer_uuid uuid,items jsonb,sale_discount numeric,method text,payment_reference text default null)
returns table(id uuid,sale_number text,total numeric,cost_total numeric,gross_profit numeric)
language sql security invoker set search_path='' as $$select * from private.finalize_sale_safe(customer_uuid,items,sale_discount,method,payment_reference)$$;
revoke execute on function private.finalize_sale_safe(uuid,jsonb,numeric,text,text) from public,anon;
grant execute on function private.finalize_sale_safe(uuid,jsonb,numeric,text,text) to authenticated;
revoke execute on function public.finalize_sale(uuid,jsonb,numeric,text,text) from public,anon;
grant execute on function public.finalize_sale(uuid,jsonb,numeric,text,text) to authenticated;

create or replace function private.finalize_sale_operational(customer_uuid uuid,items jsonb,sale_discount numeric,method text,payment_reference text default null)
returns table(id uuid,sale_number text,total numeric)
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'vendas.create')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  return query select result.id,result.sale_number,result.total
    from private.finalize_sale(customer_uuid,items,sale_discount,method,payment_reference) result;
end;$$;

create or replace function public.finalize_sale_operational(customer_uuid uuid,items jsonb,sale_discount numeric,method text,payment_reference text default null)
returns table(id uuid,sale_number text,total numeric)
language sql security invoker set search_path='' as $$select * from private.finalize_sale_operational(customer_uuid,items,sale_discount,method,payment_reference)$$;
revoke execute on function private.finalize_sale_operational(uuid,jsonb,numeric,text,text),public.finalize_sale_operational(uuid,jsonb,numeric,text,text) from public,anon;
grant execute on function private.finalize_sale_operational(uuid,jsonb,numeric,text,text),public.finalize_sale_operational(uuid,jsonb,numeric,text,text) to authenticated;

-- Operações de estoque precisam ler custos internamente, sem reabrir essas colunas na Data API.
create or replace function private.adjust_product_stock(product_uuid uuid,delta numeric,reason text,note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare p public.products; next_stock numeric; mapped text;
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'estoque.adjust_stock')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  if delta=0 then raise exception 'Quantidade deve ser diferente de zero'; end if;
  mapped := case reason when 'AJUSTE' then 'ADJUSTMENT' when 'PERDA' then 'LOSS' when 'AVARIA' then 'DAMAGE' when 'DEVOLUCAO_FORNECEDOR' then 'SUPPLIER_RETURN' when 'USO_INTERNO' then 'INTERNAL_USE' else 'OTHER' end;
  select * into p from public.products where id=product_uuid for update;
  if p.id is null then raise exception 'Produto não encontrado'; end if;
  next_stock:=p.current_stock+delta;
  if next_stock<p.reserved_stock then raise exception 'Estoque insuficiente ou reservado em OS'; end if;
  update public.products set current_stock=next_stock where id=p.id;
  insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,user_id,notes)
  values(p.id,mapped,delta,p.current_stock,next_stock,p.average_cost,'MANUAL_ADJUSTMENT',(select auth.uid()),note);
end;$$;
create or replace function public.adjust_product_stock(product_uuid uuid,delta numeric,reason text,note text default null)
returns void language sql security invoker set search_path='' as $$select private.adjust_product_stock(product_uuid,delta,reason,note)$$;

create or replace function private.confirm_stock_entry(entry_uuid uuid)
returns void language plpgsql security definer set search_path='' as $$
declare e public.stock_entries; i record; p public.products; new_stock numeric; new_cost numeric;
begin
  if (select auth.uid()) is null or not (select private.has_permission((select auth.uid()),'estoque.entry')) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  select * into e from public.stock_entries where id=entry_uuid for update;
  if e.id is null or e.status <> 'draft' then raise exception 'Entrada inexistente ou já processada'; end if;
  if not exists(select 1 from public.stock_entry_items where entry_id=entry_uuid) then raise exception 'Entrada sem itens'; end if;
  for i in select * from public.stock_entry_items where entry_id=entry_uuid loop
    select * into p from public.products where id=i.product_id for update;
    new_stock := p.current_stock + i.quantity;
    new_cost := case when new_stock=0 then i.unit_purchase_price else ((p.current_stock*p.average_cost)+(i.quantity*i.unit_purchase_price))/new_stock end;
    update public.products set current_stock=new_stock,average_cost=new_cost,purchase_price=i.unit_purchase_price where id=p.id;
    insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,origin_id,supplier_id,user_id,notes)
    values(p.id,'ENTRY',i.quantity,p.current_stock,new_stock,i.unit_purchase_price,'STOCK_ENTRY',e.id,e.supplier_id,(select auth.uid()),e.notes);
  end loop;
  update public.stock_entries set status='confirmed',confirmed_by=(select auth.uid()),confirmed_at=now() where id=entry_uuid;
end;$$;
create or replace function public.confirm_stock_entry(entry_uuid uuid)
returns void language sql security invoker set search_path='' as $$select private.confirm_stock_entry(entry_uuid)$$;

revoke execute on function private.adjust_product_stock(uuid,numeric,text,text),private.confirm_stock_entry(uuid) from public,anon;
grant execute on function private.adjust_product_stock(uuid,numeric,text,text),private.confirm_stock_entry(uuid) to authenticated;
revoke execute on function public.adjust_product_stock(uuid,numeric,text,text),public.confirm_stock_entry(uuid) from public,anon;
grant execute on function public.adjust_product_stock(uuid,numeric,text,text),public.confirm_stock_entry(uuid) to authenticated;
