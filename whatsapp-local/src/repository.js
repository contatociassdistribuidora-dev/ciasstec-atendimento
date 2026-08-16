import { createClient } from "@supabase/supabase-js";
import { normalizePhone } from "./helpers.js";

export function createRepository(url, serviceRoleKey) {
  if (!url || !serviceRoleKey) return null;
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async sendContext(conversationId) {
      const conversation = await db.from("conversations").select("id,customer_id,channel").eq("id", conversationId).single();
      if (conversation.error) throw conversation.error;
      if (conversation.data.channel !== "whatsapp_web_local") throw new Error("INVALID_CONVERSATION_CHANNEL");
      const customer = await db.from("customers").select("phone,whatsapp").eq("id", conversation.data.customer_id).single();
      if (customer.error) throw customer.error;
      const to = customer.data.whatsapp || customer.data.phone;
      if (!to) throw new Error("DESTINATION_NOT_FOUND");
      return { to };
    },
    async receive({ from, body, externalId, onStep = () => {} }) {
      const phone = normalizePhone(from);
      onStep("PHONE_NORMALIZED", true);
      let { data: customer, error } = await db.from("customers").select("id,name").or(`whatsapp.eq.${phone},phone.eq.${phone}`).limit(1).maybeSingle();
      if (error) throw error;
      onStep("CUSTOMER_LOOKUP", true);
      if (!customer) {
        const created = await db.from("customers").insert({ name: `WhatsApp ${phone.slice(-4)}`, phone, whatsapp: phone, notes: "Criado automaticamente pelo WhatsApp Web Local" }).select("id,name").single();
        if (created.error) throw created.error;
        customer = created.data;
        onStep("CUSTOMER_INSERT", true);
      }
      let conversationResult = await db.from("conversations").select("id").eq("customer_id", customer.id).eq("channel", "whatsapp_web_local").neq("status", "closed").order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (conversationResult.error) throw conversationResult.error;
      onStep("CONVERSATION_LOOKUP", true);
      if (!conversationResult.data) conversationResult = await db.from("conversations").insert({ customer_id: customer.id, subject: "WhatsApp Web Local", channel: "whatsapp_web_local", status: "open", last_message_at: new Date().toISOString() }).select("id").single();
      if (conversationResult.error) throw conversationResult.error;
      onStep("CONVERSATION_INSERT", true);
      const existing = await db.from("messages").select("id").eq("external_id", externalId).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) { onStep("MESSAGE_DUPLICATE", true); return { duplicate: true }; }
      const inserted = await db.from("messages").insert({ conversation_id: conversationResult.data.id, customer_id: customer.id, content: body, origin: "whatsapp", direction: "inbound", status: "received", external_id: externalId, is_inbound: true });
      if (inserted.error) throw inserted.error;
      onStep("MESSAGE_INSERT", true);
      await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationResult.data.id);
      return { duplicate: false };
    },
    async sent({ conversationId, body, externalId }) {
      const conversation = await db.from("conversations").select("id,customer_id,channel").eq("id", conversationId).single();
      if (conversation.error) throw conversation.error;
      if (conversation.data.channel !== "whatsapp_web_local") throw new Error("INVALID_CONVERSATION_CHANNEL");
      const existing = await db.from("messages").select("id").eq("external_id", externalId).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return { duplicate: true };
      const inserted = await db.from("messages").insert({ conversation_id: conversation.data.id, customer_id: conversation.data.customer_id, content: body, origin: "whatsapp", direction: "outbound", status: "sent", external_id: externalId, is_inbound: false });
      if (inserted.error) throw inserted.error;
      const updated = await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation.data.id);
      if (updated.error) throw updated.error;
      return { duplicate: false };
    },
  };
}
