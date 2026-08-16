import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL(`../supabase/${name}`,import.meta.url),"utf8");
const inventory=read("store_inventory.sql"),sales=read("store_sales.sql"),orders=read("store_service_orders.sql");
test("migrations de loja são aditivas e não apagam dados ou tabelas",()=>{
 for(const sql of [inventory,sales,orders])assert.doesNotMatch(sql,/\b(drop table|truncate|delete from|drop column)\b/i);
});
test("dependências seguem estoque, vendas e ordens de serviço",()=>{
 assert.match(sales,/references public\.products/);assert.match(orders,/references public\.products/);assert.match(orders,/references public\.services/);assert.match(orders,/references public\.service_orders/);assert.match(orders,/references public\.quote_items/);
});
test("policies, grants e locks críticos estão declarados",()=>{
 for(const sql of [inventory,sales,orders]){assert.match(sql,/enable row level security/);assert.match(sql,/to authenticated/)}
 assert.match(sales,/order by p\.id for update/);assert.match(orders,/from public\.products where id=item_row\.product_id for update/);
});
