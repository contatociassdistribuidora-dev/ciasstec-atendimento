import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("../components/point-of-sale.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("loads and renders the stored sale after checkout", () => {
  assert.match(component, /from\("sales"\)\.select\(saleSelection\)\.eq\("id",result\.id\)\.single\(\)/);
  assert.match(component, /completedSale&&<SaleReceipt sale=\{completedSale\}/);
  assert.match(component, /sale_items\(id,description,quantity,unit_price,discount,subtotal,item_type/);
  assert.doesNotMatch(component, /setSuccess\([^)]*\).*window\.print/s);
});

test("receipt exposes commercial snapshots without internal financial data", () => {
  for (const label of ["CIASSTEC", "Assistência Técnica em Informática", "Número da venda", "Data e hora", "Cliente", "Código", "Produto/Serviço", "Quantidade", "Valor unitário", "Desconto", "Subtotal", "TOTAL", "Forma de pagamento"]) {
    assert.ok(component.includes(label), `missing receipt label: ${label}`);
  }
  const receipt = component.slice(component.indexOf("function SaleReceipt"));
  assert.doesNotMatch(receipt, /cost_total|gross_profit|Custo|Lucro bruto/);
  assert.match(receipt, /i\.description\|\|i\.services\?\.name/);
  assert.match(receipt, /currency\.format\(Number\(i\.unit_price\)\|\|0\)/);
});

test("historical sales regenerate the same receipt from stored data", () => {
  assert.match(component, /from\("sales"\)\.select\(saleSelection\)/);
  assert.match(component, /selected&&<SaleReceipt sale=\{selected\}/);
});

test("print CSS keeps the receipt visible without hiding its parent", () => {
  assert.match(css, /#sale-receipt, #sale-receipt \* \{ visibility: visible !important; \}/);
  assert.match(css, /#sale-receipt \{[\s\S]*position: absolute !important;/);
  assert.match(css, /@page \{ size: A4 portrait; margin: 12mm; \}/);
  assert.doesNotMatch(css, /body > \*:not\(:has\(\.sale-receipt\)\)/);
});
