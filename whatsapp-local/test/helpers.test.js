import test from "node:test";
import assert from "node:assert/strict";
import { anonymousId, isIgnoredMessage, messageFilters, normalizePhone } from "../src/helpers.js";

test("normaliza telefone", () => assert.equal(normalizePhone("+55 (81) 99999-0000"), "5581999990000"));
test("rejeita telefone invalido", () => assert.throws(() => normalizePhone("123")));
test("ignora mensagens proprias, status e broadcast", () => {
  assert.equal(isIgnoredMessage({ fromMe: true }), true);
  assert.equal(isIgnoredMessage({ isStatus: true }), true);
  assert.equal(isIgnoredMessage({ from: "status@broadcast" }), true);
});
test("anonimiza identificadores", () => assert.equal(anonymousId("1234567890"), "1234...7890"));
test("identifica filtros tecnicos sem ler conteudo", () => {
  assert.deepEqual(messageFilters({ from:"123@g.us", body:"teste", id:{_serialized:"id"} }), { fromMe:false, status:false, group:true, type:false, id:false });
  assert.equal(messageFilters({ from:"123@lid", body:"teste", id:{id:"abc"} }).id, false);
});
