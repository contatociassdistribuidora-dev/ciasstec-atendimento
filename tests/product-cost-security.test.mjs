import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql=fs.readFileSync(new URL("../supabase/product_cost_security.sql",import.meta.url),"utf8");
const pos=fs.readFileSync(new URL("../components/point-of-sale.tsx",import.meta.url),"utf8");
const os=fs.readFileSync(new URL("../components/service-order-items.tsx",import.meta.url),"utf8");
const inventory=fs.readFileSync(new URL("../components/store-inventory-management.tsx",import.meta.url),"utf8");
const dashboard=fs.readFileSync(new URL("../components/dashboard-overview.tsx",import.meta.url),"utf8");

test("VENDEDOR_SEM_CUSTO gets operational products but not cost columns",()=>{
 const fixture={name:"VENDEDOR_SEM_CUSTO",permissions:{"produtos.view":true,"produtos.view_cost":false}};
 assert.equal(fixture.permissions["produtos.view"],true);
 assert.match(sql,/create or replace view public\.products_operational[\s\S]*sale_price[\s\S]*available_stock/);
 const operationalStart=sql.indexOf("create or replace view public.products_operational");
 const operational=sql.slice(operationalStart,sql.indexOf(";",operationalStart)+1);
 assert.doesNotMatch(operational,/purchase_price|average_cost|margin/);
 assert.match(sql,/revoke select on table public\.products from authenticated/);
 assert.match(sql,/grant select\(id,internal_code[\s\S]*sale_price[\s\S]*\) on public\.products to authenticated/);
});

test("direct Data API cost selections are denied by column privileges",()=>{
 for(const field of ["purchase_price","average_cost"]){assert.doesNotMatch(sql.match(/grant select\(id,internal_code[\s\S]*?on public\.products to authenticated/)?.[0]??"",new RegExp(field))}
 for(const table of ["products","stock_movements","service_order_items","sales","sale_items","product_suppliers","stock_entry_items"]){assert.match(sql,new RegExp(`revoke select on table public\\.${table} from authenticated`))}
});

test("cost RPC authorizes only auth.uid and returns ACCESS_DENIED",()=>{
 assert.match(sql,/private\.has_permission\(\(select auth\.uid\(\)\),'produtos\.view_cost'\)/);
 assert.match(sql,/raise exception 'ACCESS_DENIED'/);
 assert.doesNotMatch(sql,/has_permission\(requested_user/);
});

test("PDV and OS product searches use the cost-free projection",()=>{
 assert.match(pos,/from\("products_operational"\)/);assert.doesNotMatch(pos,/products_operational[^\n]*(purchase_price|average_cost)/);
 assert.match(os,/from\("products_operational"\)/);assert.match(os,/service_order_items_operational/);
});

test("legacy stock availability view no longer exposes average_cost",()=>{
 const start=sql.indexOf("create view public.product_stock_availability");
 const end=sql.indexOf("create or replace view public.stock_movements_operational");
 assert.ok(start>=0&&end>start);assert.doesNotMatch(sql.slice(start,end),/average_cost|purchase_price|unit_cost/);
});

test("inventory merges costs only after the guarded RPC",()=>{
 assert.match(inventory,/from\("products_operational"\)/);assert.match(inventory,/has_permission[\s\S]*produtos\.view_cost/);assert.match(inventory,/get_product_costs/);
});

test("operational dashboard has no gross profit query",()=>{
 assert.doesNotMatch(dashboard,/gross_profit|cost_total|unit_cost|average_cost|purchase_price/);
});

test("sale finalization calculates internally without exposing financial values to seller",()=>{
 assert.match(sql,/case when private\.has_permission[\s\S]*then result\.cost_total else null/);
 assert.match(sql,/case when private\.has_permission[\s\S]*then result\.gross_profit else null/);
});
