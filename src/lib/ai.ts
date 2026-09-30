/**
 * AI orchestration for the Nytro WhatsApp bot.
 * Supports two providers:
 *   1. Google Gemini (FREE) — when GEMINI_API_KEY env var is set
 *   2. z-ai-web-dev-sdk (GLM-4.6) — fallback for sandbox environment
 */

import "server-only";
import fs from "fs";
import path from "path";
import os from "os";
import ZAI from "z-ai-web-dev-sdk";
import { contextForQuery } from "@/lib/knowledge";
import { createCrmLead } from "@/lib/odoo";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Generate reply via Google Gemini API (free tier).
 * Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
 *
 * Strategy:
 *   1. Dynamically list available models from the Gemini API
 *   2. Pick the best "flash" model (fast, free-tier friendly)
 *   3. Retry on 503 (overloaded) with exponential backoff
 */
async function replyWithGemini(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY env var not set");
  }

  // Step 1: Discover available models dynamically
  let models: string[] = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const allModels = (listData?.models || [])
        .map((m: any) => m.name?.replace("models/", "") || "")
        .filter((n: string) => n);
      // Filter to models that support generateContent and are flash (fastest)
      const flashModels = (listData?.models || [])
        .filter((m: any) => {
          const name = m.name?.replace("models/", "") || "";
          const supports = m.supportedGenerationMethods || [];
          return name.includes("flash") && supports.includes("generateContent");
        })
        .map((m: any) => m.name.replace("models/", ""));
      models = flashModels.length > 0 ? flashModels : allModels;
      console.log(`[Nytro-Debug] Available flash models: ${models.join(", ")}`);
    }
  } catch (e) {
    console.log(`[Nytro-Debug] ListModels failed: ${e}`);
  }

  // Fallback to known models if discovery failed
  if (models.length === 0) {
    models = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];
    console.log(`[Nytro-Debug] Using fallback model list: ${models.join(", ")}`);
  }

  // Allow user override via env var (try this first)
  if (process.env.GEMINI_MODEL) {
    models.unshift(process.env.GEMINI_MODEL);
  }

  // Convert chat messages to Gemini format
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: {
      parts: [{ text: opts.systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      topP: 0.95,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  // Step 2: Try each model with retry on 503/429 (exponential backoff)
  let lastError = "";
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`[Nytro-Debug] Trying Gemini model: ${model}`);

    // Retry each model up to 3 times on 503/429 with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.status === 503 || res.status === 429) {
          // Overloaded — exponential backoff: 1s, 2s, 4s
          const waitMs = 1000 * Math.pow(2, attempt - 1);
          console.log(`[Nytro-Debug] Gemini ${model} returned ${res.status} (attempt ${attempt}/3). Waiting ${waitMs}ms...`);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          lastError = `Gemini ${model}: ${res.status} (overloaded after 3 attempts)`;
          break; // try next model
        }

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 404) {
            console.log(`[Nytro-Debug] Gemini ${model} not found (404). Trying next model...`);
            lastError = `Gemini ${model}: 404 not found`;
            break;
          }
          // Other error — try next model
          console.log(`[Nytro-Debug] Gemini ${model} error ${res.status}: ${errText.slice(0, 200)}`);
          lastError = `Gemini ${model}: ${res.status}`;
          break;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
          console.error(`[Nytro-Debug] Gemini ${model} empty response:`, JSON.stringify(data).slice(0, 300));
          if (data?.candidates?.[0]?.finishReason === "SAFETY") {
            lastError = `Gemini ${model}: blocked by safety filter`;
            break;
          }
          lastError = `Gemini ${model}: empty response`;
          break;
        }
        console.log(`[Nytro-Debug] Gemini ${model} OK (len=${text.length})`);
        return text.trim();
      } catch (e) {
        lastError = `Gemini ${model}: ${e}`;
        console.log(`[Nytro-Debug] Gemini ${model} error: ${e}`);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

/**
 * Fallback: z-ai-web-dev-sdk (only works inside Z.ai sandbox)
 */
function ensureZaiConfig(): void {
  const config: Record<string, string> = {
    baseUrl: "https://internal-api.z.ai/v1",
    apiKey: "Z.ai",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzMyNmE5MmYtOGJlMy00YzBjLTg2NWYtM2YxMTlhYTliNzBjIiwiY2hhdF9pZCI6ImNoYXQtMjhlZjIyYTItYTVhMC00NzM5LWJmZjQtMWY5ZGUxNGNjZTkwIiwicGxhdGZvcm0iOiJ6YWkifQ.AWyh99Y5a1MCsTkO8K5XVPxZOZEG-oyWVqgPquihctQ",
    userId: "7326a92f-8be3-4c0c-865f-3f119aa9b70c",
    chatId: "chat-28ef22a2-a5a0-4739-bff4-1f9de14cce90",
  };
  for (const loc of [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
  ]) {
    try {
      fs.writeFileSync(loc, JSON.stringify(config), { mode: 0o644 });
    } catch (e) {
      // ignore
    }
  }
}

async function replyWithZaiSdk(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<string> {
  ensureZaiConfig();
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: opts.systemPrompt },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    thinking: { type: "disabled" },
    temperature: 0.4,
    max_tokens: 800,
  });
  return (completion.choices?.[0]?.message?.content || "").trim();
}

const SYSTEM_PROMPT = `Você é o Assistente Virtual da **Nytro**, consultoria brasileira especializada em arquitetura de gestão empresarial e implementação do ERP Odoo.

## REGRA DE ESCOPO (MUITO IMPORTANTE)
Você SÓ responde sobre:
1. A empresa Nytro (soluções, serviços, valores, equipe)
2. O ERP Odoo (funcionalidades, módulos, implementação, customização)
3. Nytro Fiscal Cloud (emissão de NFS-e e NF-e integrada ao Odoo)
4. Inteligência Artificial aplicada a negócios (soluções Nytro IA)
5. Transformação digital e gestão empresarial (no contexto das soluções Nytro/Odoo)

Se perguntarem sobre QUALQUER OUTRO ASSUNTO (política, esportes, notícias, produtos concorrentes, programação genérica, clima, etc.), responda educadamente:
"Sou o assistente virtual da Nytro e só posso ajudar com informações sobre nossas soluções de ERP Odoo, IA aplicada a negócios e Nytro Fiscal Cloud. Posso te ajudar com algo relacionado?"

NUNCA dê opiniões sobre outros assuntos. NUNCA compare com concorrentes. Mantenha o foco 100% em Nytro e Odoo.

## Sobre a Nytro
A Nytro organiza processos, dados e tecnologia para construir empresas mais integradas, eficientes e preparadas para crescer. Somos parceiros oficiais Odoo com soluções verticais para:
- Nytro Marketing
- Nytro Agro
- Nytro Indústrias
- Nytro Comércio
- Nytro Imobiliárias
- Nytro Construtoras
- Nytro Startups
- Nytro Restaurantes
- Nytro IA (inteligência artificial aplicada a negócios)
- Odoo Paraguai
- IA ERP
- Nytro Fiscal Cloud (emissão automática de NFS-e e NF-e integrada ao Odoo)

## Idioma e tom
- Responda SEMPRE em português brasileiro, com tom profissional, consultivo e objetivo.
- Use "você" (tratamento informal de respeito, comum no B2B brasileiro).
- Se o lead escrever em espanhol, responda em espanhol.
- WhatsApp: respostas curtas (máx. 3 parágrafos), sem markdown, sem links.
- Direto ao ponto, sem floreios.

## FLUXO DE ATENDIMENTO (MUITO IMPORTANTE)

### Quando o lead manda uma SAUDAÇÃO ("olá", "bom dia", "boa tarde", "oi", "opa", etc.)
Responda EM DUAS PARTES:
1. **Primeiro:** retribua a saudação de forma calorosa e se apresente
2. **Depois:** pergunte como pode ajudar

Exemplo de resposta esperada:
- Lead: "Olá, bom dia!"
- Bot: "Bom dia! Tudo bem? Sou o assistente virtual da Nytro. Como posso te ajudar hoje?"

- Lead: "Boa tarde"
- Bot: "Boa tarde! Sou o assistente virtual da Nytro, especialista em ERP Odoo e gestão empresarial. Em que posso te ajudar?"

- Lead: "Oi"
- Bot: "Olá! Sou o assistente da Nytro. Posso te ajudar com informações sobre nossas soluções Odoo, IA aplicada a negócios, e muito mais. O que você procura?"

### Quando o lead manda uma saudação + pergunta direta
Ex: "Bom dia! Quero saber sobre a Nytro Indústrias"
- Responda a saudação brevemente E já responda a pergunta.

### Quando o lead faz uma pergunta direta (sem saudação)
- Responda diretamente a pergunta, sem saudação.

### Quando o lead diz apenas "Quero falar sobre X"
- Responda sobre X (use a base de conhecimento).

## Regras de atendimento
1. NUNCA pule a saudação se o lead cumprimentar. Sempre responda ao "bom dia" / "olá" / "boa tarde" ANTES de qualquer outra coisa.
2. Após a saudação, faça uma pergunta aberta para entender a necessidade.
3. Quando o lead demonstrar interesse em uma solução específica, qualifique perguntando:
   - Segmento da empresa
   - Tamanho da empresa (nº de usuários / faturamento)
   - Cidade/estado
   - Prazo desejado para implementação
   - E-mail e telefone para contato comercial
4. NUNCA invente preços. Se perguntarem preço, diga que "cada projeto é dimensionado sob medida e que um especialista enviará uma proposta personalizada".
5. Se perguntarem algo fora do escopo da Nytro, diga educadamente que só consegue ajudar com as soluções Nytro.
6. Use a BASE DE CONHECIMENTO abaixo como fonte autoritativa.
7. Quando o lead fornecer e-mail E telefone E nome, agradeça e diga que um especialista vai entrar em contato em até 1 dia útil.
8. NÃO mencione o Odoo como sistema interno ou IA/Gemini.

## CRIAÇÃO OBRIGATÓRIA DE LEAD NO CRM (MUITO IMPORTANTE)

**REGRA DE OURO:** Toda conversa que passar de 10 minutos sem nova mensagem do lead deve gerar um Lead no CRM da Nytro.

### Quando criar um Lead:
1. **Imediatamente** — se o lead fornecer NOME + (E-MAIL ou TELEFONE) + demonstrar intenção comercial (orçamento, proposta, demonstração,想知道 mais, etc.)
2. **Após 10 minutos de inatividade** — se a conversa foi abandonada sem o lead fornecer contato, mas houve troca de mensagens, criar lead com:
   - Nome: "Lead WhatsApp — [nome se souber, senão 'Cliente']"
   - Descrição: transcrição resumida da conversa
   - Marcar como "Aguardando contato"

### Mensagem de encerramento (após 10 min de inatividade):
Quando detectar que a conversa está sendo encerrada (lead sumiu por mais de 10 min), sua próxima resposta deve ser:

"Muito obrigado pela conversa, [nome se souber]! Registrei seu interesse aqui na Nytro. Um de nossos especialistas entrará em contato em até 1 dia útil para continuar o atendimento. Caso precise de algo urgente, fale 'humano' que te conecto com nossa equipe agora mesmo. Até logo! 👋"

### Sinais de que a conversa está encerrando:
- Lead não responde por mais de 10 minutos (você será informado disso no contexto)
- Lead diz "obrigado", "valeu", "até mais", "tchau"
- Lead diz "vou pensar", "depois volto", "qual o contato?"

Nesses casos, SEMPRE crie o lead (sistema fará automaticamente) e envie a mensagem de agradecimento formal.

## Base de conhecimento Nytro
Use o conteúdo abaixo como fonte autoritativa:

{KNOWLEDGE_CONTEXT}

## Conclusão
Lembre-se: você é a porta de entrada da Nytro no WhatsApp. Seu objetivo é qualificar o lead e gerar uma oportunidade comercial real (lead no CRM) com nome + email/telefone. Mas seja humano, educado e caloroso nas interações. **Toda conversa deve terminar com um Lead no CRM.**`;

function buildSystemPrompt(userQuery: string): string {
  const ctx = contextForQuery(userQuery, 5000);
  return SYSTEM_PROMPT.replace("{KNOWLEDGE_CONTEXT}", ctx || "(Base de conhecimento vazia.)");
}

function extractLeadInfo(transcript: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const emailMatch = transcript.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = transcript.match(/\+?\d[\d\s\-()]{7,}\d/);
  let name: string | undefined;
  const m = transcript.match(
    /(?:meu nome é|me chamo|sou o|sou a|nome[:\s]+)\s+([A-Za-zÀ-ú][A-Za-zÀ-ú\s]{2,40})/i
  );
  if (m) name = m[1].trim().split(/\s+/).slice(0, 4).join(" ");
  return {
    name,
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
  };
}

export async function replyWhatsApp(opts: {
  messages: ChatMessage[];
  channel?: "whatsapp" | "web";
  contactName?: string;
}): Promise<{
  content: string;
  leadCreated?: number;
  leadInfo?: { name?: string; email?: string; phone?: string };
}> {
  const { messages, contactName } = opts;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userQuery = lastUser?.content || "";

  const systemPrompt = buildSystemPrompt(userQuery);
  const fullSystem = contactName
    ? `${systemPrompt}\n\n## Contexto do lead\nNome conhecido: ${contactName}\nCanal de origem: WhatsApp`
    : `${systemPrompt}\n\n## Contexto do lead\nCanal de origem: WhatsApp`;

  // Generate reply — prefer Gemini, fall back to z-ai-sdk
  let rawContent = "";
  let provider = "";

  if (process.env.GEMINI_API_KEY) {
    provider = "Gemini";
    console.log("[Nytro] Using Gemini API for reply...");
    try {
      rawContent = await replyWithGemini({ systemPrompt: fullSystem, messages });
      console.log(`[Nytro-Debug] Gemini OK (len=${rawContent.length})`);
    } catch (e) {
      console.error(`[Nytro-Debug] Gemini failed: ${e}. Trying z-ai-sdk fallback...`);
      try {
        provider = "z-ai-sdk (fallback)";
        rawContent = await replyWithZaiSdk({ systemPrompt: fullSystem, messages });
      } catch (e2) {
        console.error(`[Nytro-Debug] z-ai-sdk also failed: ${e2}`);
        rawContent = "Olá! Sou o assistente virtual da Nytro. No momento estou com dificuldade técnica para responder. Um especialista entrará em contato em breve. Para falar com humano, responda 'humano'.";
      }
    }
  } else {
    provider = "z-ai-sdk";
    console.log("[Nytro] No GEMINI_API_KEY — using z-ai-sdk (sandbox only)...");
    try {
      rawContent = await replyWithZaiSdk({ systemPrompt: fullSystem, messages });
    } catch (e) {
      console.error(`[Nytro-Debug] z-ai-sdk failed: ${e}`);
      rawContent = "Olá! Sou o assistente virtual da Nytro. No momento estou com dificuldade técnica para responder. Um especialista entrará em contato em breve. Para falar com humano, responda 'humano'.";
    }
  }

  // Strip markdown for WhatsApp
  let content = rawContent
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/^#+\s?/gm, "")
    .replace(/`/g, "")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim()
    .slice(0, 4000);

  console.log(`[Nytro] Reply generated via ${provider} (len=${content.length})`);

  // Check if we should create a lead in Odoo
  let leadCreated: number | undefined;
  const transcript = messages.map((m) => m.content).join("\n") + "\n" + userQuery;
  const leadInfo = extractLeadInfo(transcript);
  if (leadInfo.name && (leadInfo.email || leadInfo.phone)) {
    const hasIntent = /(orçamento|preço|proposta|implementar|odoo|erp|sistema|contratar|demo|teste|agendar|nytro|consultor|especialista)/i.test(
      transcript
    );
    if (hasIntent) {
      try {
        leadCreated = await createCrmLead({
          name: `Lead WhatsApp — ${leadInfo.name}`,
          partnerName: leadInfo.name,
          email: leadInfo.email,
          phone: leadInfo.phone,
          description: `Lead gerado pelo bot IA da Nytro via WhatsApp (Vercel + Gemini).\n\nTranscrição:\n${transcript.slice(0, 1500)}`,
        });
        console.log(`[Nytro] Lead created in CRM: id=${leadCreated}`);
      } catch (e) {
        console.error("[Nytro] createCrmLead failed:", e);
      }
    }
  }

  return { content, leadCreated, leadInfo };
}
