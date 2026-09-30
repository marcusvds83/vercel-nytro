import { NextRequest, NextResponse } from "next/server";
import { put, head, del } from "@vercel/blob";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

const LOGO_BLOB_PATH = "nytro-logo/logo-current";

async function requireAuth(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(cookie);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Arquivo não enviado" }, { status: 400 });
    }

    // Tipos aceitos
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Tipo ${file.type} não suportado. Use PNG, JPG, WEBP ou SVG.` },
        { status: 400 }
      );
    }

    // Tamanho máx: 2 MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Arquivo muito grande (máx 2 MB)" },
        { status: 400 }
      );
    }

    // Deletar blob anterior (se existir) — mesmo path
    try {
      const existing = await head(`nytro-logo/${LOGO_BLOB_PATH.split("/")[1]}`);
      if (existing) {
        await del(existing.url);
      }
    } catch {
      // Ignora se não existir
    }

    // Upload do novo
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] === "svg+xml" ? "svg" : file.type.split("/")[1];
    const pathname = `${LOGO_BLOB_PATH}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      uploadedBy: session.username,
      size: file.size,
      contentType: file.type,
    });
  } catch (err: any) {
    console.error("[upload] erro:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro no upload" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}
