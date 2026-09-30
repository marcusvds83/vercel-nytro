/**
 * Odoo Authentication
 * Valida login/senha do usuário no Odoo via JSON-RPC.
 * Reaproveita as env vars ODOO_URL, ODOO_DB já usadas pelo bot.
 */

export type OdooAuthResult =
  | { ok: true; uid: number; username: string }
  | { ok: false; error: string };

export async function authenticateOdooUser(
  username: string,
  password: string
): Promise<OdooAuthResult> {
  const url = (process.env.ODOO_URL || "").replace(/\/$/, "");
  const db = process.env.ODOO_DB || "";

  if (!url || !db) {
    return { ok: false, error: "Variáveis ODOO_URL/ODOO_DB não configuradas" };
  }
  if (!username || !password) {
    return { ok: false, error: "Login e senha são obrigatórios" };
  }

  try {
    const res = await fetch(`${url}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 1e9),
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [db, username, password, {}],
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Odoo HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.error) {
      return { ok: false, error: json.error.data?.message || "Credenciais inválidas" };
    }

    const uid = json.result;
    if (!uid || typeof uid !== "number") {
      return { ok: false, error: "Credenciais inválidas" };
    }

    return { ok: true, uid, username };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Falha ao conectar ao Odoo" };
  }
}
