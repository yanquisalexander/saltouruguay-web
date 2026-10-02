import {
  getSrvRecord,
  updateSrvTargetPort,
  validateSrvInput,
} from "@/services/cloudflare-dns";
import { getSession } from "auth-astro/server";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function requireAdmin(request: Request) {
  const session = await getSession(request);
  if (!session?.user.isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }
  return null;
}

export async function GET({ request }: { request: Request }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const record = await getSrvRecord();
    return new Response(JSON.stringify({ success: true, record }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Error fetching SRV record:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error al obtener el registro SRV",
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export async function PUT({ request }: { request: Request }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const { target, port } = validateSrvInput(body.target, body.port);

    const record = await updateSrvTargetPort(target, port);
    return new Response(JSON.stringify({ success: true, record }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Error updating SRV record:", error);
    const message = error instanceof Error ? error.message : "Error al actualizar el registro SRV";
    const status = message.includes("inválido") ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: JSON_HEADERS,
    });
  }
}
