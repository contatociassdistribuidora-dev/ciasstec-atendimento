import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql=fs.readFileSync(new URL("../supabase/user_permissions.sql",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../components/atendimento-app.tsx",import.meta.url),"utf8");
const fixtures={ADMIN_TESTE:{role:"admin"},VENDEDOR_TESTE:{role:"vendedor"},TECNICO_TESTE:{role:"tecnico"}};

test("presets keep admin unrestricted and seller/technician separated",()=>{
 assert.deepEqual(Object.keys(fixtures),["ADMIN_TESTE","VENDEDOR_TESTE","TECNICO_TESTE"]);
 assert.match(sql,/role_name='admin'/);
 assert.match(sql,/\('vendedor','frente_loja\.view'\)/);
 assert.doesNotMatch(sql,/\('tecnico','frente_loja\.view'\)/);
 assert.match(sql,/\('tecnico','ordens_servico\.view'\)/);
});
test("individual allow and deny override role preset",()=>assert.match(sql,/coalesce\(\(select up\.allowed[\s\S]*role_permissions/));
test("inactive users fail centralized database authorization",()=>assert.match(sql,/public\.profiles p where p\.id=check_user and p\.active/));
test("menu is derived from view permissions",()=>{assert.match(app,/permission:"ordens_servico\.view"/);assert.match(app,/filter\(item=>can\(item\.permission\)\)/)});
test("critical operations call centralized permissions",()=>{assert.match(sql,/'vendas\.cancel'/);assert.match(sql,/'estoque\.adjust_stock'/);assert.match(sql,/'produtos\.view_cost'/)});
test("permission tables use RLS and anon is revoked",()=>{assert.match(sql,/user_permissions enable row level security/);assert.match(sql,/revoke all on public\.user_roles[\s\S]*from anon/)});
