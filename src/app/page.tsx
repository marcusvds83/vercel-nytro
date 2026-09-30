"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

type Session = { ok: boolean; username?: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string>("/api/logo?ts=" + Date.now());
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Verifica sessão ao montar
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((data) => setSession(data))
      .catch(() => setSession({ ok: false }));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError(data.error || "Falha no login");
      } else {
        setSession({ ok: true, username: data.username });
        setLoginForm({ username: "", password: "" });
      }
    } catch (err: any) {
      setLoginError(err?.message || "Erro de rede");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setSession({ ok: false });
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadMsg({ type: "err", text: "Selecione um arquivo" });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setUploadMsg({ type: "err", text: data.error || "Falha no upload" });
      } else {
        setUploadMsg({
          type: "ok",
          text: `Logo atualizada com sucesso! (${data.size} bytes, ${data.contentType})`,
        });
        // Atualiza preview com cache buster
        setLogoUrl("/api/logo?ts=" + Date.now());
        // Limpa input
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (err: any) {
      setUploadMsg({ type: "err", text: err?.message || "Erro de rede" });
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
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
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

        {/* Card de status/info (original) */}
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

          {/* Preview da logo atual */}
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
              <div style={{ fontWeight: 600, color: "#0F766E" }}>
                Logo atual do chat
              </div>
              <div style={{ color: "#666", fontSize: 11 }}>
                Servida via <code>/api/logo</code> — se nenhum upload foi feito,
                usa fallback do Odoo.
              </div>
            </div>
          </div>

          {/* Se não está logado, mostra form de login */}
          {session === null ? (
            <div style={{ fontSize: 13, opacity: 0.7, textAlign: "center", padding: 8 }}>
              Carregando…
            </div>
          ) : !session.ok ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>
                🔐 Faça login com suas credenciais Odoo para trocar a logo:
              </div>
              <input
                type="text"
                placeholder="Usuário Odoo (ex: luis.justus@nytro.com.br)"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                style={inputStyle}
                autoComplete="username"
                required
              />
              <input
                type="password"
                placeholder="Senha Odoo"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                style={inputStyle}
                autoComplete="current-password"
                required
              />
              {loginError && (
                <div style={{ color: "#fecaca", fontSize: 12 }}>⚠️ {loginError}</div>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                style={btnPrimary}
              >
                {loginLoading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          ) : (
            // Logado: mostra form de upload
            <div>
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span>
                  👋 Logado como <strong>{session.username}</strong>
                </span>
                <button onClick={handleLogout} style={btnLink}>
                  Sair
                </button>
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
                  Aceita PNG, JPG, WEBP ou SVG. Máx 2 MB. A imagem substitui
                  imediatamente a logo do chat.
                </div>
                {uploadMsg && (
                  <div
                    style={{
                      fontSize: 12,
                      padding: 8,
                      borderRadius: 6,
                      background:
                        uploadMsg.type === "ok"
                          ? "rgba(16,185,129,0.25)"
                          : "rgba(239,68,68,0.25)",
                      color: uploadMsg.type === "ok" ? "#d1fae5" : "#fecaca",
                    }}
                  >
                    {uploadMsg.type === "ok" ? "✅ " : "⚠️ "}
                    {uploadMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={uploading}
                  style={btnPrimary}
                >
                  {uploading ? "Enviando…" : "📤 Enviar nova logo"}
                </button>
              </form>
            </div>
          )}
        </div>

        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
          Este serviço é "serverless" — ele dorme quando ocioso e acorda em
          ~500ms quando chega mensagem WhatsApp. Custo: R$ 0/mês.
        </p>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  background: "rgba(255,255,255,0.95)",
  color: "#0F766E",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  background: "white",
  color: "#0F766E",
  cursor: "pointer",
};

const btnLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  textDecoration: "underline",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
};
