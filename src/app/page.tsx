/**
 * Minimal landing page — just to confirm the deployment is working.
 * The real work happens in /api/whatsapp-webhook.
 */

import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0F766E 0%, #10B981 100%)",
      color: "white",
      padding: "2rem",
    }}>
      <div style={{ maxWidth: 540, textAlign: "center" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "white",
          color: "#0F766E",
          fontWeight: 900,
          fontSize: 32,
          marginBottom: 24,
        }}>N</div>
        <h1 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>
          Nytro Bot — Vercel
        </h1>
        <p style={{ opacity: 0.9, marginTop: 8, fontSize: 16 }}>
          Bot IA da Nytro para WhatsApp, integrado ao Odoo SaaS.
        </p>
        <div style={{
          marginTop: 32,
          padding: 20,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 12,
          textAlign: "left",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          <div style={{ marginBottom: 8 }}>
            ✅ <strong>Status:</strong> Online
          </div>
          <div style={{ marginBottom: 8 }}>
            🔗 <strong>Webhook WhatsApp:</strong>{" "}
            <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
              POST /api/whatsapp-webhook
            </code>
          </div>
          <div style={{ marginBottom: 8 }}>
            🔍 <strong>Health check:</strong>{" "}
            <Link
              href="/api/health"
              style={{ color: "white", textDecoration: "underline" }}
            >
              /api/health
            </Link>
          </div>
          <div>
            🤖 <strong>IA:</strong> GLM-4.6 (via z-ai-web-dev-sdk) — gratuito
          </div>
        </div>
        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
          Este serviço é "serverless" — ele dorme quando ocioso e acorda em
          ~500ms quando chega mensagem WhatsApp. Custo: R$ 0/mês.
        </p>
      </div>
    </main>
  );
}
