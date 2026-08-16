import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import pkg from "whatsapp-web.js";
import { z } from "zod";
import { anonymousId, messageFilters, normalizePhone } from "./helpers.js";
import { createRepository } from "./repository.js";

const { Client, LocalAuth } = pkg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedOrigins = new Set(["https://ciasstec.com.br", "https://www.ciasstec.com.br", "http://localhost:3000", "http://127.0.0.1:3000"]);
const localToken = process.env.WHATSAPP_LOCAL_TOKEN?.trim();
const repository = createRepository(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const app = express();
let state = "starting", connected = false, phone = null, qrDataUrl = null, lastConnectedAt = null;
const diagnosticPath = path.join(root, "logs", "diagnostic.jsonl");
fs.mkdirSync(path.dirname(diagnosticPath), { recursive: true });

const log = (event, details = {}) => console.info(`[whatsapp-local] ${event}`, details);
const diagnostic = (event, details = {}) => {
  const record = { timestamp: new Date().toISOString(), event, ...details };
  fs.appendFileSync(diagnosticPath, `${JSON.stringify(record)}\n`);
  console.info("[whatsapp-local:diagnostic]", record);
};
app.disable("x-powered-by");
app.use((_req, res, next) => { res.setHeader("Access-Control-Allow-Private-Network", "true"); next(); });
app.use(cors({ origin(origin, done) { done(null, !origin || allowedOrigins.has(origin)); }, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "X-CIASSTEC-Local-Token"], maxAge: 600 }));
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); res.setHeader("Private-Network-Access-Name", "CIASSTEC WhatsApp Local"); if (localToken && req.get("X-CIASSTEC-Local-Token") !== localToken) return res.status(401).json({ error: "Token local invalido." }); next(); });

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "ciasstec", dataPath: path.join(root, ".wwebjs_auth") }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  webVersionCache: { type: "local", path: path.join(root, ".wwebjs_cache") },
});
client.on("qr", async qr => { state = "qr_required"; connected = false; qrDataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 }); log("qr_required"); });
client.on("authenticated", () => { state = "connecting"; qrDataUrl = null; log("authenticated"); });
client.on("ready", async () => { connected = true; state = "online"; qrDataUrl = null; lastConnectedAt = new Date().toISOString(); phone = client.info?.wid?.user ?? null; const clientState = await client.getState().catch(() => "ERROR"); diagnostic("ready", { ready: true, state: clientState, clientInfo: Boolean(client.info) }); log("WhatsApp CIASSTEC conectado.", { phone: phone ? anonymousId(phone) : undefined }); });
client.on("disconnected", reason => { connected = false; state = "disconnected"; phone = null; log("disconnected", { reason: String(reason).slice(0, 80) }); });
client.on("auth_failure", () => { connected = false; state = "qr_required"; phone = null; log("auth_failure"); });
function safeMessageMetadata(message) {
  const filters = messageFilters(message), from = String(message?.from ?? "");
  return { fromMasked: anonymousId(from), fromMe: filters.fromMe, type: message?.type ?? "unknown", isGroup: filters.group, isStatus: filters.status, id: anonymousId(externalMessageId(message)), filterFromMe: filters.fromMe, filterStatus: filters.status, filterGroup: filters.group, filterType: filters.type, filterId: filters.id, rawIdPresent: Boolean(from) };
}
function externalMessageId(message) {
  if (message?.id?._serialized) return message.id._serialized;
  if (!message?.id?.id) return null;
  const remote = typeof message.id.remote === "string" ? message.id.remote : message.id.remote?._serialized ?? "remote";
  return crypto.createHash("sha256").update(`${message.id.fromMe}:${remote}:${message.id.id}`).digest("hex");
}
function phoneFromJid(value) {
  const jid = String(value ?? "");
  for (const suffix of ["@c.us", "@s.whatsapp.net"]) if (jid.endsWith(suffix)) return jid.slice(0, -suffix.length);
  return null;
}
async function resolvePhone(message) {
  const raw = String(message?.author || message?.from || "");
  if (!raw) return null;
  const direct = phoneFromJid(raw);
  if (direct) return direct;
  if (raw.endsWith("@lid")) {
    const mapped = await client.getContactLidAndPhone([raw]);
    const pn = mapped?.[0]?.pn;
    diagnostic("lid_resolution", { mappedPnPresent: Boolean(pn), mappedPnServer: pn ? String(pn).split("@").pop() : "none" });
    return phoneFromJid(pn);
  }
  return null;
}
client.on("message_create", message => diagnostic("message_create", safeMessageMetadata(message)));
client.on("message_ack", (message, ack) => diagnostic("message_ack", { id: anonymousId(externalMessageId(message)), ack: Number(ack) }));
client.on("message", async message => {
  const metadata = safeMessageMetadata(message), filters = messageFilters(message);
  diagnostic("message", metadata);
  if (filters.fromMe || filters.status || filters.group || filters.type || filters.id) return;
  try {
    const resolved = await resolvePhone(message);
    diagnostic("phone_resolution", { rawIdPresent: true, phoneResolved: Boolean(resolved) });
    if (!resolved) return;
    if (!repository) throw new Error("SUPABASE_NOT_CONFIGURED");
    const externalId = externalMessageId(message);
    const result = await repository.receive({ from: resolved, body: message.body, externalId, onStep: (step, ok) => diagnostic("persistence_step", { step, ok, id: anonymousId(externalId) }) });
    log(result.duplicate ? "message_duplicate" : "message_received", { id: anonymousId(externalId) });
  } catch (error) { diagnostic("receive_error", { code: error?.code ?? error?.message ?? "UNKNOWN" }); }
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/status", (_req, res) => res.json({ connected, state, ...(phone ? { phone } : {}), lastConnectedAt, sessionAvailable: state !== "qr_required" }));
app.get("/qr", (_req, res) => res.json({ connected, state, qr: qrDataUrl }));
app.post("/send", async (req, res) => {
  const schema = z.object({ conversationId: z.string().uuid(), message: z.string().trim().min(1).max(4096) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const missing = [...new Set(parsed.error.issues.map(issue => String(issue.path[0] ?? "body")))];
    return res.status(400).json({ error: "invalid_payload", missing });
  }
  if (!connected) return res.status(503).json({ error: "WhatsApp Web Local offline." });
  try {
    if (!repository) throw new Error("SUPABASE_NOT_CONFIGURED");
    const context = await repository.sendContext(parsed.data.conversationId);
    const to = normalizePhone(context.to);
    const registeredId = await client.getNumberId(to);
    const destination = registeredId?._serialized;
    if (!destination) return res.status(400).json({ error: "Destinatario nao registrado no WhatsApp." });
    const sent = await client.sendMessage(destination, parsed.data.message);
    const id = externalMessageId(sent) ?? `outbound-${crypto.randomUUID()}`;
    const persisted = await repository.sent({ conversationId: parsed.data.conversationId, body: parsed.data.message, externalId: id });
    log("message_sent", { id: anonymousId(id) });
    res.json({ sent: true, messageId: id, persisted: true, duplicate: persisted.duplicate });
  } catch (error) {
    diagnostic("send_error", { code: error?.name ?? "UNKNOWN" });
    res.status(502).json({ error: "Nao foi possivel enviar a mensagem." });
  }
});
app.post("/logout", async (_req, res) => { try { await client.logout(); connected = false; state = "qr_required"; phone = null; qrDataUrl = null; res.json({ loggedOut: true }); } catch { res.status(500).json({ error: "Nao foi possivel desconectar." }); } });

app.listen(8091, "127.0.0.1", () => { log("started", { address: "http://127.0.0.1:8091" }); client.initialize().catch(() => { state = "error"; log("initialization_error"); }); });
