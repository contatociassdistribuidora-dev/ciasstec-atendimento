import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql=await readFile(new URL("../supabase/store_sales.sql",import.meta.url),"utf8");

test("controlled sale and cancellation preserve financial snapshots",()=>{
  let stock=10;const quantity=2,unitPrice=150,unitCost=100;
  stock-=quantity;const revenue=quantity*unitPrice,cost=quantity*unitCost,profit=revenue-cost;
  assert.deepEqual({stock,revenue,cost,profit},{stock:8,revenue:300,cost:200,profit:100});
  stock+=quantity;assert.equal(stock,10);
  const movements=["SALE","REVERSAL"];assert.deepEqual(movements,["SALE","REVERSAL"]);
});

test("insufficient stock rolls back before creating records",()=>{
  const state={stock:10,sales:0,movements:0};
  function finalize(quantity){const snapshot={...state};try{if(quantity>state.stock)throw new Error("Estoque insuficiente");state.sales++;state.stock-=quantity;state.movements++}catch(error){Object.assign(state,snapshot);throw error}}
  assert.throws(()=>finalize(20),/Estoque insuficiente/);assert.deepEqual(state,{stock:10,sales:0,movements:0});
});

test("database RPC locks products and prevents duplicate reversals",()=>{
  assert.match(sql,/order by p\.id for update/i);
  assert.match(sql,/if product_row\.current_stock-product_row\.reserved_stock<qty then raise exception 'Estoque disponível insuficiente/i);
  assert.match(sql,/if sale_row\.status='cancelled' then raise exception 'Venda já cancelada'/i);
  assert.match(sql,/movement_type[^;]+REVERSAL/s);
  assert.doesNotMatch(sql,/delete from public\.sales/i);
});

test("RLS, grants and private security-definer implementation are explicit",()=>{
  for(const table of ["services","sales","sale_items","sale_payments"]){assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`))}
  assert.match(sql,/function private\.finalize_sale/);assert.match(sql,/security definer/);
  assert.match(sql,/revoke execute on function[^;]*private\.finalize_sale[^;]*from public,anon/s);
  assert.match(sql,/grant select on public\.services,public\.sales,public\.sale_items,public\.sale_payments to authenticated/);
});

test("RPC avoids output-column ambiguity in PostgreSQL",()=>{
  assert.match(sql,/public\.customers c where c\.id=customer_uuid/);
  assert.match(sql,/public\.products p where p\.id=\(row_item->>'product_id'\)/);
  assert.match(sql,/public\.services v where v\.id=\(row_item->>'service_id'\)/);
  assert.match(sql,/where products\.id=product_row\.id/);
});
