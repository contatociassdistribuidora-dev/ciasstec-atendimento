import test from "node:test";
import assert from "node:assert/strict";
import { anonymousId, isIgnoredMessage, normalizePhone } from "../src/helpers.js";

test("normaliza telefone", () => assert.equal(normalizePhone("+55 (81) 99999-0000"), "5581999990000"));
test("rejeita telefone invalido", () => assert.throws(() => normalizePhone("123")));
test("ignora mensagens proprias, status e broadcast", () => {
  assert.equal(isIgnoredMessage({ fromMe: true }), true);
  assert.equal(isIgnoredMessage({ isStatus: true }), true);
  assert.equal(isIgnoredMessage({ from: "status@broadcast" }), true);
});
test("anonimiza identificadores", () => assert.equal(anonymousId("1234567890"), "1234...7890"));
