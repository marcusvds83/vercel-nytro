"use client";

import Link from "next/link";
import { useState, useRef } from "react";

export default function Home() {
  const [logoUrl, setLogoUrl] = useState<string>("/api/logo?ts=" + Date.now());
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg({ type: "err", text: "Selecione um arquivo" });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ type: "err", text: data.error || "Falha no upload" });
      } else {
        setMsg({ type: "ok", text: "Logo atualizada com sucesso!" });
        setLogoUrl("/api/logo?ts=" + Date.now());
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Erro de rede" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0F766E 0%, #10B981 100%)",
        color: "white",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
        <div
          style={{
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
          }}
        >
          N
        </div>
        <h1 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>
          Nytro Bot — Vercel
        </h1>
        <p style={{ opacity: 0.9, marginTop: 8, fontSize: 16 }}>
          Bot IA da Nytro para WhatsApp, integrado ao Odoo SaaS.
        </p>

        {/* Card de status (original) */}
        <div
          style={{
            marginTop: 32,
            padding: 20,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 12,
            textAlign: "left",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            ✅ <strong>Status:</strong> Online
          </div>
          <div style={{ marginBottom: 8 }}>
            🔗 <strong>Webhook WhatsApp:</strong>{" "}
            <code
              style={{
                background: "rgba(0,0,0,0.2)",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
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

        {/* === UPLOADER DE LOGO === */}
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 12,
            textAlign: "left",
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0, marginBottom: 16, fontWeight: 600 }}>
            🖼️ Logo do bot de atendimento
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 12,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 8,
              marginBottom: 16,
              color: "#0F766E",
            }}
          >
            <img
              src={logoUrl}
              alt="Logo atual"
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                objectFit: "contain",
                background: "white",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600 }}>Logo atual do chat</div>
              <div style={{ color: "#666", fontSize: 11 }}>
                Se nenhum upload foi feito, usa fallback do Odoo.
              </div>
            </div>
          </div>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              style={{
                fontSize: 12,
                padding: 8,
                background: "rgba(255,255,255,0.95)",
                color: "#0F766E",
                border: "none",
                borderRadius: 6,
              }}
            />
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              Aceita PNG, JPG, WEBP ou SVG. Máx 2 MB. Substitui imediatamente.
            </div>
            {msg && (
              <div
                style={{
                  fontSize: 12,
                  padding: 8,
                  borderRadius: 6,
                  background: msg.type === "ok" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
                  color: msg.type === "ok" ? "#d1fae5" : "#fecaca",
                }}
              >
                {msg.type === "ok" ? "✅ " : "⚠️ "}
                {msg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                background: "white",
                color: "#0F766E",
                cursor: uploading ? "wait" : "pointer",
              }}
            >
              {uploading ? "Enviando…" : "📤 Enviar nova logo"}
            </button>
          </form>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
          Este serviço é "serverless" — ele dorme quando ocioso e acorda em
          ~500ms quando chega mensagem WhatsApp. Custo: R$ 0/mês.
        </p>
      </div>
    </main>
  );
}
