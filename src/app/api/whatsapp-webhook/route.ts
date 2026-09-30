/**
 * WhatsApp Cloud API webhook handler — Vercel serverless function.
 *
 * Endpoints:
 *   GET  /api/whatsapp-webhook  — verification (hub.challenge)
 *   POST /api/whatsapp-webhook  — receive inbound messages from Meta
 *
 * Flow:
 *   1. Meta sends webhook → we receive it here
 *   2. We call Odoo JSON-RPC to find the whatsapp.message that Odoo already created
 *   3. We check if any operator is online (res.users.im_status)
 *      - If yes: skip (let human handle)
 *      - If no: call GLM via z-ai-web-dev-sdk, generate reply
 *   4. We send the reply back via Odoo's whatsapp.composer (JSON-RPC)
 *   5. We create a Lead in CRM if we detect lead signals
 *
 * Meta config:
 *   - Callback URL: https://<your-vercel-project>.vercel.app/api/whatsapp-webhook
 *   - Verify Token: WHATSAPP_VERIFY_TOKEN env var
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRecentWaMessage,
  getAuthorFromWaMessage,
  getConversationHistory,
  getOnlineOperatorCount,
  sendWhatsAppReply,
  notifyPartnerChatter,
  findWaChannelForPartner,
  getOdooEnv,
  searchReadPartner,
  createPartner,
} from "@/lib/odoo";
import { replyWhatsApp, type ChatMessage } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type WaPayload = {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
      field: string;
    }>;
  }>;
};

/* ---------- GET (verification) ---------- */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "nytro-bot-verify";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/* ---------- POST (inbound messages) ---------- */

export async function POST(req: NextRequest) {
  let payload: WaPayload;
  let rawBody: string;
  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody) as WaPayload;
  } catch (e) {
    console.error("[Nytro-Webhook] Invalid JSON:", e);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Debug: log incoming payload (truncated)
  console.log(`[Nytro-Webhook] Received POST, payload length: ${rawBody.length}`);
  console.log(`[Nytro-Webhook] Payload preview: ${rawBody.slice(0, 500)}`);

  // FORWARD the webhook to Odoo (fire-and-forget, non-blocking)
  try {
    const odooWebhookUrl = "https://www.nytro.com.br/whatsapp/webhook";
    console.log(`[Nytro-Webhook] Forwarding to Odoo (fire-and-forget)`);
    fetch(odooWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody,
    }).catch(() => {});
  } catch (e) {
    // ignore
  }

  // Always 200 OK quickly so Meta doesn't retry
  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value.messages || [];
        const contacts = change.value.contacts || [];
        console.log(`[Nytro-Webhook] Processing: ${messages.length} messages, ${contacts.length} contacts`);
        for (const msg of messages) {
          console.log(`[Nytro-Webhook] Message: type=${msg.type} from=${msg.from} id=${msg.id}`);
          if (msg.type !== "text" || !msg.text?.body) {
            console.log(`[Nytro-Webhook] Skipping non-text message (type=${msg.type})`);
            continue;
          }
          const phone = msg.from;
          const contactName = contacts.find((c) => c.wa_id === phone)?.profile?.name;
          const text = msg.text.body;
          console.log(`[Nytro-Webhook] Dispatching to handler: phone=${phone} name=${contactName} text="${text.slice(0, 80)}"`);

          await handleInbound({ phone, contactName, text });
        }
      }
    }
  } catch (err) {
    console.error("[Nytro-Webhook] Error processing:", err);
    console.error("[Nytro-Webhook] Error stack:", (err as Error)?.stack);
  }

  return NextResponse.json({ ok: true });
}

/* ---------- Main handler ---------- */

async function handleInbound(input: {
  phone: string;
  contactName?: string;
  text: string;
}) {
  const { phone, contactName, text } = input;
  console.log(`[Nytro] Inbound WA from ${phone} (${contactName || "?"}): ${text.slice(0, 80)}`);

  // 1) Get the whatsapp.message that Odoo already created
  // Retry up to 3 times with 2s interval = 6s total max wait
  let waMsg = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[Nytro-Debug] Attempt ${attempt}/3: searching WA msg in Odoo...`);
    await sleep(2000);
    waMsg = await getRecentWaMessage(phone);
    if (waMsg) {
      console.log(`[Nytro] Found whatsapp.message id=${waMsg.id} on attempt ${attempt}`);
      break;
    }
    console.log(`[Nytro-Debug] Attempt ${attempt}: not found yet, retrying...`);
  }
  if (!waMsg) {
    console.log("[Nytro] No matching whatsapp.message found after 3 retries — using fallback");
    await handleInboundFallback({ phone, contactName, text });
    return;
  }

  // 2) Get the author partner ID and discuss.channel
  const authorInfo = await getAuthorFromWaMessage(waMsg.id);
  if (!authorInfo || !authorInfo.authorId) {
    console.log("[Nytro] Could not find author partner");
    return;
  }
  console.log(`[Nytro] Author: id=${authorInfo.authorId} name=${authorInfo.authorName}`);

  // 3) Check operator online status
  const operatorIdsStr = process.env.NYTRO_OPERATOR_USER_IDS || "2,6";
  const operatorIds = operatorIdsStr
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x));

  const opStatus = await getOnlineOperatorCount(operatorIds);
  console.log(`[Nytro] Operators online: ${opStatus.online}/${opStatus.total}`);

  // 4) Check for handoff request
  const handoffWordsStr = process.env.NYTRO_HANDOFF_WORDS || "humano,atendente,operador,falar com pessoa";
  const handoffWords = handoffWordsStr.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  const wantsHuman = handoffWords.some((w) => text.toLowerCase().includes(w));

  if (wantsHuman) {
    console.log("[Nytro] Handoff requested — notifying operators");
    await notifyPartnerChatter(
      authorInfo.authorId,
      `<p><b>🔔 Handoff solicitado via WhatsApp</b></p>
       <p><b>Cliente:</b> ${authorInfo.authorName || "-"}</p>
       <p><b>Telefone:</b> ${phone}</p>
       <p><b>Mensagem:</b> ${text.slice(0, 500)}</p>
       <p>Um operador humano precisa assumir esta conversa.</p>`
    );
    return;
  }

  // 5) If operator online, skip (let human handle)
  if (opStatus.online > 0) {
    console.log(`[Nytro] ${opStatus.online} operator(s) online — skipping bot reply`);
    return;
  }

  // 6) Build conversation history
  let channelId = authorInfo.channelId;
  if (!channelId) {
    channelId = await findWaChannelForPartner(authorInfo.authorId);
  }

  let history: ChatMessage[] = [];
  if (channelId) {
    // Get operator partner IDs (to label their messages as "Operador" not "Bot")
    const operatorPartnerIds: number[] = [];
    try {
      const opUsers = await getOnlineOperatorCount(operatorIds);
      for (const op of opUsers.details) {
        // Need to fetch partner_id from res.users — skip for simplicity
      }
    } catch {}

    const historyRows = await getConversationHistory(
      channelId,
      authorInfo.authorId,
      operatorPartnerIds,
      0, // system partner ID — we don't have it precisely, label unknown as Bot
      12
    );
    history = historyRows.map((r) => ({
      role: (r.role === "Cliente" ? "user" : "assistant") as "user" | "assistant",
      content: r.content,
    }));
  }
  // Always include the new message at the end
  history.push({ role: "user", content: text });

  // 7) Generate reply via GLM
  console.log("[Nytro] Calling GLM for reply...");
  const botReply = await replyWhatsApp({
    messages: history,
    channel: "whatsapp",
    contactName: contactName || authorInfo.authorName,
  });
  console.log(`[Nytro] Reply generated (len=${botReply.content.length})${botReply.leadCreated ? ` — lead created id=${botReply.leadCreated}` : ""}`);

  // 8) Send reply via Odoo
  const waAccountField = waMsg.wa_account_id as number | [number, string] | undefined;
  const waAccountId: number = Array.isArray(waAccountField)
    ? waAccountField[0]
    : (waAccountField as number);
  const result = await sendWhatsAppReply({
    partnerId: authorInfo.authorId,
    body: botReply.content,
    waAccountId,
    partnerName: contactName || authorInfo.authorName,
    partnerPhone: phone,
  });
  if (result.ok) {
    console.log(`[Nytro] Reply sent successfully (msgId=${result.messageId})`);
  } else {
    console.error(`[Nytro] Failed to send reply: ${result.error}`);
  }
}

/**
 * Fallback handler: when Odoo hasn't processed the Meta webhook yet
 * (whatsapp.message not created in time), we still respond to the user.
 * We find/create the partner in Odoo by phone, then send the reply.
 */
async function handleInboundFallback(input: {
  phone: string;
  contactName?: string;
  text: string;
}) {
  const { phone, contactName, text } = input;
  console.log(`[Nytro-Fallback] Starting fallback handler for ${phone}`);

  const digits = String(phone || "").replace(/\D/g, "");
  const last8 = digits.slice(-8);
  let partnerId: number | null = null;

  // 1) Find partner by phone (Odoo 19 uses 'phone' or 'phone_mobile_search')
  try {
    const partners = await searchReadPartner<any>(
      "res.partner",
      ["|",
        ["phone", "ilike", last8],
        ["phone_mobile_search", "ilike", last8],
      ],
      ["id", "name", "phone"],
      1,
      "id desc"
    );
    if (partners && partners.length > 0) {
      partnerId = partners[0].id;
      console.log(`[Nytro-Fallback] Found partner id=${partnerId} by phone`);
    }
  } catch (e) {
    console.log(`[Nytro-Fallback] Partner search failed: ${e}`);
  }

  // 2) If no partner found, create one (Odoo 19 uses 'phone' field, not 'mobile')
  if (!partnerId) {
    try {
      partnerId = await createPartner({
        name: contactName || `WhatsApp ${phone}`,
        phone: phone,
      });
      console.log(`[Nytro-Fallback] Created new partner id=${partnerId}`);
    } catch (e) {
      console.log(`[Nytro-Fallback] Partner create failed: ${e}`);
    }
  }

  if (!partnerId) {
    console.log("[Nytro-Fallback] Could not find or create partner — aborting");
    return;
  }

  // 3) Get WA account ID (account 1 — Nytro)
  const waAccountId = 1;

  // 4) Check operator online
  const operatorIdsStr = process.env.NYTRO_OPERATOR_USER_IDS || "2,6";
  const operatorIds = operatorIdsStr
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x));
  const opStatus = await getOnlineOperatorCount(operatorIds);

  // 5) Check handoff
  const handoffWordsStr = process.env.NYTRO_HANDOFF_WORDS || "humano,atendente,operador,falar com pessoa";
  const handoffWords = handoffWordsStr.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  const wantsHuman = handoffWords.some((w) => text.toLowerCase().includes(w));

  if (wantsHuman) {
    console.log("[Nytro-Fallback] Handoff requested");
    await notifyPartnerChatter(
      partnerId,
      `<p><b>🔔 Handoff solicitado via WhatsApp</b></p><p><b>Cliente:</b> ${contactName || "-"}</p><p><b>Telefone:</b> ${phone}</p><p><b>Mensagem:</b> ${text.slice(0, 500)}</p>`
    );
    return;
  }

  if (opStatus.online > 0) {
    console.log(`[Nytro-Fallback] ${opStatus.online} operator(s) online — skipping`);
    return;
  }

  // 6) Build history (just the user message — no Odoo history available)
  const history: ChatMessage[] = [
    { role: "user", content: text },
  ];

  // 7) Generate reply via Gemini
  console.log("[Nytro-Fallback] Calling AI for reply...");
  const botReply = await replyWhatsApp({
    messages: history,
    channel: "whatsapp",
    contactName: contactName || `WhatsApp ${phone}`,
  });
  console.log(`[Nytro-Fallback] Reply generated (len=${botReply.content.length})`);

  // 8) Send reply
  const result = await sendWhatsAppReply({
    partnerId,
    body: botReply.content,
    waAccountId,
    partnerName: contactName || `WhatsApp ${phone}`,
    partnerPhone: phone,
  });
  if (result.ok) {
    console.log(`[Nytro-Fallback] Reply sent successfully (msgId=${result.messageId})`);
  } else {
    console.error(`[Nytro-Fallback] Failed to send reply: ${result.error}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
