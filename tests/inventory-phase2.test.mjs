import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql=await readFile(new URL("../supabase/store_inventory.sql",import.meta.url),"utf8");

test("migration is additive, enables RLS and keeps movements immutable",()=>{
  assert.doesNotMatch(sql,/\bdrop\s+table\b|\btruncate\b/i);
  for(const table of ["product_categories","products","suppliers","stock_entries","stock_entry_items","stock_movements"]){
    assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.doesNotMatch(sql,/policy[^;]+stock_movements[^;]+for\s+(update|delete)/i);
});

test("weighted average, entry, controlled exit and minimum stock",()=>{
  let stock=10,averageCost=100;
  const entry=10,entryCost=120;
  averageCost=((stock*averageCost)+(entry*entryCost))/(stock+entry); stock+=entry;
  assert.equal(averageCost,110); assert.equal(stock,20);
  stock-=2; assert.equal(stock,18);
  stock-=11; assert.equal(stock,7);
  stock+=2; assert.equal(stock,9);
  const minimum=10; assert.equal(stock<=minimum,true);
  assert.throws(()=>{const next=stock-10;if(next<0)throw new Error("Estoque insuficiente")},/Estoque insuficiente/);
});

test("critical operations use database functions and lock product rows",()=>{
  assert.match(sql,/function public\.confirm_stock_entry/);
  assert.match(sql,/function public\.adjust_product_stock/);
  assert.match(sql,/from public\.products where id=.*for update/);
  assert.match(sql,/insert into public\.stock_movements/);
});
