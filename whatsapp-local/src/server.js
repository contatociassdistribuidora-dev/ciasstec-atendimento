import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import pkg from "whatsapp-web.js";
import { z } from "zod";
import { anonymousId, isIgnoredMessage, normalizePhone } from "./helpers.js";
import { createRepository } from "./repository.js";

const { Client, LocalAuth } = pkg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedOrigins = new Set(["https://ciasstec.com.br", "https://www.ciasstec.com.br", "http://localhost:3000", "http://127.0.0.1:3000"]);
const localToken = process.env.WHATSAPP_LOCAL_TOKEN?.trim();
const repository = createRepository(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const app = express();
let state = "starting", connected = false, phone = null, qrDataUrl = null, lastConnectedAt = null;

const log = (event, details = {}) => console.info(`[whatsapp-local] ${event}`, details);
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
client.on("ready", async () => { connected = true; state = "online"; qrDataUrl = null; lastConnectedAt = new Date().toISOString(); phone = client.info?.wid?.user ?? null; log("WhatsApp CIASSTEC conectado.", { phone: phone ? anonymousId(phone) : undefined }); });
client.on("disconnected", reason => { connected = false; state = "disconnected"; phone = null; log("disconnected", { reason: String(reason).slice(0, 80) }); });
client.on("auth_failure", () => { connected = false; state = "qr_required"; phone = null; log("auth_failure"); });
client.on("message", async message => {
  if (isIgnoredMessage(message) || !message.body?.trim()) return;
  const externalId = message.id?._serialized;
  try { if (!repository) throw new Error("Supabase local nao configurado."); await repository.receive({ from: message.from.split("@")[0], body: message.body, externalId }); log("message_received", { id: anonymousId(externalId) }); }
  catch (error) { log("receive_error", { message: error instanceof Error ? error.message : "erro" }); }
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/status", (_req, res) => res.json({ connected, state, ...(phone ? { phone } : {}), lastConnectedAt, sessionAvailable: state !== "qr_required" }));
app.get("/qr", (_req, res) => res.json({ connected, state, qr: qrDataUrl }));
app.post("/send", async (req, res) => {
  const parsed = z.object({ to: z.string().min(10).max(24), message: z.string().trim().min(1).max(4096) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Payload invalido." });
  if (!connected) return res.status(503).json({ error: "WhatsApp Web Local offline." });
  try { const to = normalizePhone(parsed.data.to); const sent = await client.sendMessage(`${to}@c.us`, parsed.data.message); const id = sent.id?._serialized ?? null; log("message_sent", { id: anonymousId(id) }); res.json({ sent: true, messageId: id }); }
  catch { log("send_error"); res.status(502).json({ error: "Nao foi possivel enviar a mensagem." }); }
});
app.post("/logout", async (_req, res) => { try { await client.logout(); connected = false; state = "qr_required"; phone = null; qrDataUrl = null; res.json({ loggedOut: true }); } catch { res.status(500).json({ error: "Nao foi possivel desconectar." }); } });

app.listen(8091, "127.0.0.1", () => { log("started", { address: "http://127.0.0.1:8091" }); client.initialize().catch(() => { state = "error"; log("initialization_error"); }); });
