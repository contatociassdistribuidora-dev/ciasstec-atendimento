import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(new URL("../supabase/store_service_orders.sql",import.meta.url),"utf8");

test("reserva, uso e devolução preservam estoque disponível",()=>{
 let physical=10,reserved=0;
 reserved+=2; assert.deepEqual({physical,reserved,available:physical-reserved},{physical:10,reserved:2,available:8});
 physical-=1;reserved-=1;assert.deepEqual({physical,reserved,available:physical-reserved},{physical:9,reserved:1,available:8});
 reserved-=1;assert.deepEqual({physical,reserved,available:physical-reserved},{physical:9,reserved:0,available:9});
});

test("RPCs usam locks e impedem reserva além do disponível",()=>{
 assert.match(sql,/reserve_service_order_item[\s\S]*for update[\s\S]*current_stock-reserved<item_row\.quantity/);
  assert.match(sql,/use_service_order_item[\s\S]*current_stock=current_stock-item_row\.quantity/);
  assert.match(sql,/reserved_stock\+\(case when item_row\.stock_status='RESERVED'/);
 assert.match(sql,/movement_type,quantity[\s\S]*'SERVICE_ORDER',-item_row\.quantity/);
});

test("conversão de orçamento é idempotente e não reserva automaticamente",()=>{
 assert.match(sql,/unique index[^;]+service_order_items_quote_source_uq/);
 assert.match(sql,/on conflict\(service_order_id,source_quote_item_id\)[\s\S]*do nothing/);
 assert.match(sql,/case when qi\.product_id is not null then 'PENDING' else null end/);
});

test("cancelamento libera reserva sem devolver item já usado",()=>{
 assert.match(sql,/new\.status='cancelled'[\s\S]*stock_status='RESERVED'[\s\S]*stock_status='RETURNED'/);
 assert.doesNotMatch(sql,/new\.status='cancelled'[\s\S]*current_stock=current_stock\+/);
});

test("estrutura, RLS e grants são explícitos",()=>{
  assert.match(sql,/num_nonnulls\(product_id,service_id\)=1/);
  assert.match(sql,/service_order_items_discount_not_above_total/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/grant select,insert,update,delete on public\.service_order_items to authenticated/);
 assert.match(sql,/revoke execute on function private\.[^;]+from public,anon/s);
});
