import { createClient } from "@supabase/supabase-js";
import { normalizePhone } from "./helpers.js";

export function createRepository(url, serviceRoleKey) {
  if (!url || !serviceRoleKey) return null;
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async receive({ from, body, externalId }) {
      const phone = normalizePhone(from);
      let { data: customer, error } = await db.from("customers").select("id,name").or(`whatsapp.eq.${phone},phone.eq.${phone}`).limit(1).maybeSingle();
      if (error) throw error;
      if (!customer) {
        const created = await db.from("customers").insert({ name: `WhatsApp ${phone.slice(-4)}`, phone, whatsapp: phone, notes: "Criado automaticamente pelo WhatsApp Web Local" }).select("id,name").single();
        if (created.error) throw created.error;
        customer = created.data;
      }
      let conversationResult = await db.from("conversations").select("id").eq("customer_id", customer.id).eq("channel", "whatsapp_web_local").neq("status", "closed").order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (conversationResult.error) throw conversationResult.error;
      if (!conversationResult.data) conversationResult = await db.from("conversations").insert({ customer_id: customer.id, subject: "WhatsApp Web Local", channel: "whatsapp_web_local", status: "open", last_message_at: new Date().toISOString() }).select("id").single();
      if (conversationResult.error) throw conversationResult.error;
      const inserted = await db.from("messages").upsert({ conversation_id: conversationResult.data.id, customer_id: customer.id, content: body, origin: "whatsapp", direction: "inbound", status: "received", external_id: externalId, is_inbound: true }, { onConflict: "external_id", ignoreDuplicates: true });
      if (inserted.error) throw inserted.error;
      await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationResult.data.id);
    },
  };
}
