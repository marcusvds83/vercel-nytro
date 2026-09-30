# Nytro Bot Vercel

Bot IA da Nytro para WhatsApp, deploy na Vercel, integrado ao Odoo SaaS 19/20.

## 🎯 O que faz

Quando um cliente manda mensagem no WhatsApp da Nytro (+55 41 9550-6128):

1. Meta envia webhook → Odoo (já configurado) **e** → Vercel (este projeto)
2. Vercel verifica no Odoo se há operador online
   - Se sim: não faz nada (deixa humano atender)
   - Se não: gera resposta com IA (GLM-4.6 grátis)
3. Vercel envia a resposta via Odoo (whatsapp.composer)
4. Se detectar nome+email+telefone+intenção → cria Lead no CRM automaticamente

**Latência total: 2-3 segundos.**

## 🆓 Custo

- **Vercel**: R$ 0/mês (plano grátis, serverless)
- **IA (GLM)**: R$ 0/mês (z-ai-web-dev-sdk, sem API key OpenAI)
- **Odoo**: você já paga

## 📦 Estrutura

```
nytro-bot-vercel/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── whatsapp-webhook/route.ts   ← Webhook Meta (GET + POST)
│   │   │   └── health/route.ts             ← Health check
│   │   ├── layout.tsx
│   │   └── page.tsx                        ← Landing simples
│   └── lib/
│       ├── ai.ts                           ← GLM integration + Lead detection
│       ├── knowledge.ts                    ← RAG sobre conhecimento Nytro
│       ├── odoo.ts                         ← Odoo JSON-RPC client
│       └── nytro-data/knowledge.json       ← 17 páginas do site Nytro (76 KB)
├── package.json
├── tsconfig.json
├── next.config.ts
├── vercel.json
├── .env.example
└── README.md (este arquivo)
```

## 🚀 Deploy em 5 passos

### Passo 1 — Criar repositório GitHub

1. Vá em https://github.com/new
2. Crie um repositório novo, nome: `nytro-bot-vercel`
3. Marque "Public" (ou Private — tanto faz)
4. **NÃO** inicialize com README (você vai subir os arquivos)
5. Clique em "Create repository"

### Passo 2 — Subir o código para o GitHub

Faça download deste projeto como ZIP, descompacte e execute:

```bash
cd nytro-bot-vercel
git init
git add .
git commit -m "feat: nytro bot vercel"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/nytro-bot-vercel.git
git push -u origin main
```

### Passo 3 — Importar na Vercel

1. Vá em https://vercel.com/login
2. Faça login com GitHub (mesma conta do passo 1)
3. Clique em "Add New..." → "Project"
4. Selecione o repositório `nytro-bot-vercel`
5. **NÃO clique em Deploy ainda** — primeiro configure as variáveis de ambiente

### Passo 4 — Configurar variáveis de ambiente na Vercel

Na tela de "Configure Project", expanda "Environment Variables" e adicione estas 7 variáveis (copie do `.env.example`):

| Nome | Valor |
|---|---|
| `ODOO_URL` | `https://luisfernandonytro-nytro.odoo.com` |
| `ODOO_DB` | `luisfernandonytro-nytro-producao-nytro-28615541` |
| `ODOO_USERNAME` | `luis.justus@nytro.com.br` |
| `ODOO_API_KEY` | `4a2999a8531b4e269616ca67088904973d6d603f` |
| `WHATSAPP_VERIFY_TOKEN` | `nytro-bot-verify-2024` (escolha uma string qualquer) |
| `NYTRO_OPERATOR_USER_IDS` | `2,6` |
| `NYTRO_HANDOFF_WORDS` | `humano,atendente,operador,falar com pessoa` |

Agora sim, clique em **Deploy**.

Aguarde ~1 minuto. A Vercel vai te dar uma URL como:
```
https://nytro-bot-vercel-<seu-usuario>.vercel.app
```

### Passo 5 — Testar o deploy

Abra no navegador:
```
https://nytro-bot-vercel-<seu-usuario>.vercel.app/api/health
```

Deve retornar um JSON assim:
```json
{
  "ok": true,
  "service": "nytro-bot-vercel",
  "env": { "odooConfigured": true, ... }
}
```

Se aparecer `ok: true`, o deploy está pronto! 🎉

### Passo 6 — Configurar segundo webhook na Meta

Agora falta só falar para a Meta enviar também para a Vercel:

1. Vá em https://business.facebook.com/
2. Configurações → WhatsApp Business API → Webhooks
3. Você já tem o webhook do Odoo configurado. Adicione **mais um**:
   - **Callback URL**: `https://nytro-bot-vercel-<seu-usuario>.vercel.app/api/whatsapp-webhook`
   - **Verify Token**: `nytro-bot-verify-2024` (igual ao que você setou na Vercel)
   - Clique em "Verify and Save"
4. Em "Field subscriptions", marque `messages`

Pronto! Agora quando alguém mandar WA, a Meta envia para Odoo **e** Vercel em paralelo.

## 🧪 Como testar

1. **Garanta que Admin TI e Comercial Nytro estão deslogados do Odoo** (senão o bot deixa humano atender)
2. Pelo celular, envie mensagem para **+55 41 9550-6128**:
   ```
   Olá! Quero saber sobre as soluções da Nytro para indústria
   ```
3. Em **2-3 segundos** você deve receber resposta do bot com IA
4. A conversa aparece em **Odoo → WhatsApp → Mensagens**
5. Se fornecer nome+email+telefone, um Lead é criado em **CRM → Meus Leads**

## 📊 Monitoramento

- **Logs em tempo real**: Vercel dashboard → seu projeto → "Logs" (ou "Functions" → ver execução)
- **Health check**: `https://<seu-projeto>.vercel.app/api/health`
- **Logs no Odoo**: Configurações → Técnico → Logs → busque por "Nytro"

## 🔧 Variáveis importantes

### `NYTRO_OPERATOR_USER_IDS`
Lista de IDs de usuários do Odoo que são operadores. Quando qualquer um deles está online (`im_status='online'`), o bot **não responde** — deixa o humano atender.

IDs atuais:
- `2` = Admin TI Nytro
- `6` = Comercial Nytro

Para remover alguém da lista, edite na Vercel → Settings → Environment Variables.

### `NYTRO_HANDOFF_WORDS`
Palavras que fazem o bot parar de responder e notificar operadores. Separe por vírgula.

### `WHATSAPP_VERIFY_TOKEN`
String qualquer que VOCÊ escolhe. Tem que ser igual na Vercel e na Meta.

## 🛑 Como desligar

Se um dia quiser parar o bot:

1. Vá no Meta Business Manager → Webhooks → remova a URL da Vercel
2. Pronto. Bot desligado, Odoo volta ao estado anterior.

Ou, se quiser pausar temporariamente:
1. Vercel dashboard → seu projeto → Settings → Functions → desative

## ❓ Troubleshooting

**Bot não responde:**
- Verifique `/api/health` — deve retornar `ok: true`
- Verifique os logs da Vercel (dashboard → Logs)
- Garanta que Admin TI e Comercial estão **deslogados** do Odoo
- Veja se a Meta está enviando webhooks (Vercel → Logs → busque por "POST /api/whatsapp-webhook")

**Bot responde mas mensagem não chega no WhatsApp:**
- Verifique no Odoo → WhatsApp → Mensagens se a mensagem outbound foi criada
- Pode ser problema de fila no Odoo (processa WA outgoing em lotes)

**Lead não é criado no CRM:**
- O bot só cria lead se detectar nome + (email OU telefone) + intenção comercial
- Verifique Vercel → Logs se aparece "lead created"

## 📞 Suporte

Para dúvidas técnicas sobre o código, leia os comentários nos arquivos em `src/lib/`.
