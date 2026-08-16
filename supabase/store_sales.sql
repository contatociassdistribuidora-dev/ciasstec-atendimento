-- CIASSTEC Atendimento — Fase 3: PDV e vendas.
-- Complementar a store_inventory.sql. Aditiva; revisar backup antes de executar.

alter table public.profiles add column if not exists can_sell boolean not null default false;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), name text not null, category text,
  description text, default_price numeric(14,2) not null default 0 check(default_price >= 0),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists services_name_uq on public.services(lower(name));
drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();

create sequence if not exists public.sale_number_seq start 1;
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique default ('VD-' || lpad(nextval('public.sale_number_seq')::text,6,'0')),
  customer_id uuid references public.customers(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'processing' check(status in ('processing','completed','cancelled')),
  subtotal numeric(14,2) not null default 0 check(subtotal >= 0),
  discount numeric(14,2) not null default 0 check(discount >= 0),
  total numeric(14,2) not null default 0 check(total >= 0),
  cost_total numeric(14,2) not null default 0 check(cost_total >= 0),
  gross_profit numeric(14,2) not null default 0,
  payment_status text not null default 'pending' check(payment_status in ('pending','paid','refunded')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  cancelled_at timestamptz, cancelled_by uuid references public.profiles(id) on delete restrict,
  cancellation_reason text
);
drop trigger if exists sales_updated_at on public.sales;
create trigger sales_updated_at before update on public.sales for each row execute function public.set_updated_at();
create index if not exists sales_created_at_idx on public.sales(created_at desc);
create index if not exists sales_customer_idx on public.sales(customer_id);
create index if not exists sales_seller_idx on public.sales(seller_id);
create index if not exists sales_status_idx on public.sales(status);
create index if not exists sales_cancelled_by_idx on public.sales(cancelled_by) where cancelled_by is not null;

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  service_id uuid references public.services(id) on delete restrict,
  description text not null, quantity numeric(14,3) not null check(quantity > 0),
  unit_price numeric(14,2) not null check(unit_price >= 0), unit_cost numeric(14,4) not null default 0 check(unit_cost >= 0),
  discount numeric(14,2) not null default 0 check(discount >= 0),
  subtotal numeric(14,2) not null check(subtotal >= 0),
  item_type text not null check(item_type in ('product','service')),
  created_at timestamptz not null default now(),
  constraint sale_items_single_reference check(num_nonnulls(product_id,service_id)=1),
  constraint sale_items_type_reference check((item_type='product' and product_id is not null) or (item_type='service' and service_id is not null))
);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_idx on public.sale_items(product_id) where product_id is not null;
create index if not exists sale_items_service_idx on public.sale_items(service_id) where service_id is not null;

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete restrict,
  payment_method text not null check(payment_method in ('cash','pix','debit_card','credit_card','transfer','other')),
  amount numeric(14,2) not null check(amount > 0), reference text, created_at timestamptz not null default now()
);
create index if not exists sale_payments_sale_idx on public.sale_payments(sale_id);

create or replace function private.can_sell() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and (p.role='admin' or p.can_sell));
$$;
create or replace function private.can_discount() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and (p.role='admin' or p.can_discount));
$$;
create or replace function private.can_cancel_sale() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and (p.role='admin' or p.can_cancel_sale));
$$;

create or replace function private.finalize_sale(
  customer_uuid uuid, items jsonb, sale_discount numeric, method text, payment_reference text default null
) returns table(id uuid,sale_number text,total numeric,cost_total numeric,gross_profit numeric)
language plpgsql security definer set search_path='' as $$
declare sale_id uuid; row_item jsonb; product_row public.products; service_row public.services;
 qty numeric; price numeric; item_discount numeric; line_total numeric; subtotal_sum numeric:=0; cost_sum numeric:=0;
begin
 if (select auth.uid()) is null or not (select private.can_sell()) then raise exception 'Sem permissão para vender'; end if;
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items)=0 then raise exception 'Venda sem itens'; end if;
 if sale_discount<0 then raise exception 'Desconto inválido'; end if;
 if sale_discount>0 and not (select private.can_discount()) then raise exception 'Sem permissão para desconto'; end if;
 if method not in ('cash','pix','debit_card','credit_card','transfer','other') then raise exception 'Forma de pagamento inválida'; end if;
 if customer_uuid is not null and not exists(select 1 from public.customers c where c.id=customer_uuid) then raise exception 'Cliente inválido'; end if;

 -- Locks em ordem estável impedem corrida de estoque e reduzem risco de deadlock.
 perform 1 from public.products p where p.id in (
   select (x->>'product_id')::uuid from jsonb_array_elements(items) x where x->>'item_type'='product'
 ) order by p.id for update;

 insert into public.sales(customer_id,seller_id,status,discount) values(customer_uuid,(select auth.uid()),'processing',sale_discount) returning sales.id into sale_id;
 for row_item in select value from jsonb_array_elements(items) loop
   qty:=(row_item->>'quantity')::numeric; price:=(row_item->>'unit_price')::numeric; item_discount:=coalesce((row_item->>'discount')::numeric,0);
   if qty<=0 or price<0 or item_discount<0 or item_discount>round(qty*price,2) then raise exception 'Item ou desconto inválido'; end if;
   if item_discount>0 and not (select private.can_discount()) then raise exception 'Sem permissão para desconto'; end if;
   line_total:=round(qty*price-item_discount,2); subtotal_sum:=subtotal_sum+line_total;
   if row_item->>'item_type'='product' then
     select * into product_row from public.products p where p.id=(row_item->>'product_id')::uuid;
     if product_row.id is null or not product_row.active then raise exception 'Produto inválido'; end if;
     if price<>product_row.sale_price and not (select private.can_staff('change_price')) then raise exception 'Sem permissão para alterar preço'; end if;
     if product_row.current_stock-product_row.reserved_stock<qty then raise exception 'Estoque disponível insuficiente para %',product_row.name; end if;
     insert into public.sale_items(sale_id,product_id,description,quantity,unit_price,unit_cost,discount,subtotal,item_type)
       values(sale_id,product_row.id,product_row.name,qty,price,product_row.average_cost,item_discount,line_total,'product');
     update public.products set current_stock=current_stock-qty where products.id=product_row.id;
     insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,origin_id,user_id,notes)
       values(product_row.id,'SALE',-qty,product_row.current_stock,product_row.current_stock-qty,product_row.average_cost,'SALE',sale_id,(select auth.uid()),'Baixa automática de venda');
     cost_sum:=cost_sum+round(qty*product_row.average_cost,2);
   elsif row_item->>'item_type'='service' then
     select * into service_row from public.services v where v.id=(row_item->>'service_id')::uuid;
     if service_row.id is null or not service_row.active then raise exception 'Serviço inválido'; end if;
     if price<>service_row.default_price and not (select private.can_staff('change_price')) then raise exception 'Sem permissão para alterar preço'; end if;
     insert into public.sale_items(sale_id,service_id,description,quantity,unit_price,unit_cost,discount,subtotal,item_type)
       values(sale_id,service_row.id,service_row.name,qty,price,0,item_discount,line_total,'service');
   else raise exception 'Tipo de item inválido'; end if;
 end loop;
 if sale_discount>=subtotal_sum then raise exception 'Desconto da venda deve manter o total positivo'; end if;
 update public.sales set subtotal=subtotal_sum,discount=sale_discount,total=subtotal_sum-sale_discount,cost_total=cost_sum,
   gross_profit=(subtotal_sum-sale_discount)-cost_sum,status='completed',payment_status='paid' where sales.id=sale_id;
 insert into public.sale_payments(sale_id,payment_method,amount,reference) values(sale_id,method,subtotal_sum-sale_discount,nullif(btrim(payment_reference),''));
 return query select s.id,s.sale_number,s.total,s.cost_total,s.gross_profit from public.sales s where s.id=sale_id;
end; $$;

create or replace function public.finalize_sale(customer_uuid uuid,items jsonb,sale_discount numeric,method text,payment_reference text default null)
returns table(id uuid,sale_number text,total numeric,cost_total numeric,gross_profit numeric)
language sql security invoker set search_path='' as $$ select * from private.finalize_sale(customer_uuid,items,sale_discount,method,payment_reference); $$;

create or replace function private.cancel_sale(sale_uuid uuid,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare sale_row public.sales; item_row record; product_row public.products;
begin
 if (select auth.uid()) is null or not (select private.can_cancel_sale()) then raise exception 'Sem permissão para cancelar venda'; end if;
 if btrim(coalesce(reason,''))='' then raise exception 'Motivo obrigatório'; end if;
 select * into sale_row from public.sales where id=sale_uuid for update;
 if sale_row.id is null then raise exception 'Venda não encontrada'; end if;
 if sale_row.status='cancelled' then raise exception 'Venda já cancelada'; end if;
 if sale_row.status<>'completed' then raise exception 'Somente venda concluída pode ser cancelada'; end if;
 perform 1 from public.products p where p.id in (select product_id from public.sale_items where sale_id=sale_uuid and product_id is not null) order by p.id for update;
 for item_row in select * from public.sale_items where sale_id=sale_uuid and product_id is not null loop
   select * into product_row from public.products where id=item_row.product_id;
   update public.products set current_stock=current_stock+item_row.quantity where id=product_row.id;
   insert into public.stock_movements(product_id,movement_type,quantity,previous_stock,resulting_stock,unit_cost,origin,origin_id,user_id,notes)
     values(product_row.id,'REVERSAL',item_row.quantity,product_row.current_stock,product_row.current_stock+item_row.quantity,item_row.unit_cost,'SALE_CANCELLATION',sale_uuid,(select auth.uid()),reason);
 end loop;
 update public.sales set status='cancelled',payment_status='refunded',cancelled_at=now(),cancelled_by=(select auth.uid()),cancellation_reason=reason where id=sale_uuid;
end; $$;

create or replace function public.cancel_sale(sale_uuid uuid,reason text) returns void
language sql security invoker set search_path='' as $$ select private.cancel_sale(sale_uuid,reason); $$;

revoke execute on function private.can_sell(),private.can_discount(),private.can_cancel_sale(),private.finalize_sale(uuid,jsonb,numeric,text,text),private.cancel_sale(uuid,text) from public,anon;
grant execute on function private.can_sell(),private.can_discount(),private.can_cancel_sale(),private.finalize_sale(uuid,jsonb,numeric,text,text),private.cancel_sale(uuid,text) to authenticated;
revoke execute on function public.finalize_sale(uuid,jsonb,numeric,text,text),public.cancel_sale(uuid,text) from public,anon;
grant execute on function public.finalize_sale(uuid,jsonb,numeric,text,text),public.cancel_sale(uuid,text) to authenticated;

alter table public.services enable row level security; alter table public.sales enable row level security;
alter table public.sale_items enable row level security; alter table public.sale_payments enable row level security;
drop policy if exists "staff read services" on public.services; create policy "staff read services" on public.services for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "product managers write services" on public.services; create policy "product managers write services" on public.services for all to authenticated using ((select private.can_staff('manage_products'))) with check ((select private.can_staff('manage_products')));
drop policy if exists "staff read sales" on public.sales; create policy "staff read sales" on public.sales for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "staff read sale items" on public.sale_items; create policy "staff read sale items" on public.sale_items for select to authenticated using ((select public.is_active_staff()));
drop policy if exists "staff read sale payments" on public.sale_payments; create policy "staff read sale payments" on public.sale_payments for select to authenticated using ((select public.is_active_staff()));

grant select on public.services,public.sales,public.sale_items,public.sale_payments to authenticated;
grant insert,update on public.services to authenticated;
revoke all on public.services,public.sales,public.sale_items,public.sale_payments from anon;

insert into public.services(name,category,default_price) values
 ('Formatação','Sistema operacional',180),('Instalação Windows','Sistema operacional',180),
 ('Limpeza preventiva','Manutenção',150),('Troca de SSD','Upgrade',100),
 ('Instalação de memória','Upgrade',80),('Manutenção de impressora','Impressoras',150),
 ('Configuração de rede','Redes',150),('Diagnóstico','Diagnóstico',100)
on conflict do nothing;
