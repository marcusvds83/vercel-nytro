import { NextRequest, NextResponse } from "next/server";
import { authenticateOdooUser } from "@/lib/odoo-auth";
import { signSession, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Login e senha são obrigatórios" }, { status: 400 });
  }

  const result = await authenticateOdooUser(username, password);
  if (!result.ok) {
    const errorMsg: string = (result as { ok: false; error: string }).error;
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 401 });
  }

  const token = signSession({ uid: result.uid, username: result.username });
  const res = NextResponse.json({ ok: true, username: result.username });
  res.headers.set("Set-Cookie", sessionCookie(token));
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}
