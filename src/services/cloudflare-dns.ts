import {
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_SRV_NAME,
  CLOUDFLARE_ZONE_ID,
} from "astro:env/server";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

/** TTL corto para que el cambio de server de MC propague rápido. */
export const SRV_SHORT_TTL = 60;

export interface SrvRecord {
  id: string;
  name: string;
  target: string;
  port: number;
  priority: number;
  weight: number;
  ttl: number;
}

interface CfDnsRecord {
  id: string;
  type: string;
  name: string;
  ttl: number;
  data: {
    priority?: number;
    weight?: number;
    port?: number;
    target?: string;
  };
}

function headers() {
  return {
    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function toSrvRecord(r: CfDnsRecord): SrvRecord {
  return {
    id: r.id,
    name: r.name,
    target: r.data.target ?? "",
    port: r.data.port ?? 0,
    priority: r.data.priority ?? 0,
    weight: r.data.weight ?? 0,
    ttl: r.ttl,
  };
}

function cfErrorMessage(errors: unknown, fallback: string): string {
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as { message?: string };
    if (first?.message) return first.message;
  }
  return fallback;
}

export async function getSrvRecord(): Promise<SrvRecord> {
  const url = `${CF_API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=SRV&name=${encodeURIComponent(CLOUDFLARE_SRV_NAME)}`;
  const res = await fetch(url, { headers: headers() });
  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(cfErrorMessage(body?.errors, `Cloudflare error: ${res.status}`));
  }

  const record = (body.result as CfDnsRecord[])[0];
  if (!record) {
    throw new Error(`No existe el registro SRV ${CLOUDFLARE_SRV_NAME}`);
  }
  return toSrvRecord(record);
}

export function validateSrvInput(target: unknown, port: unknown): { target: string; port: number } {
  if (typeof target !== "string" || target.trim().length === 0 || target.length > 253) {
    throw new Error("Target inválido (FQDN requerido)");
  }
  // FQDN básico: letras, números, guiones y puntos
  if (!/^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.?$/i.test(target.trim())) {
    throw new Error("Target inválido (FQDN requerido)");
  }
  const portNum = typeof port === "string" ? Number(port) : port;
  if (!Number.isInteger(portNum) || (portNum as number) < 1 || (portNum as number) > 65535) {
    throw new Error("Puerto inválido (1–65535)");
  }
  return { target: target.trim(), port: portNum as number };
}

export async function updateSrvTargetPort(target: string, port: number): Promise<SrvRecord> {
  const current = await getSrvRecord();

  const res = await fetch(
    `${CF_API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${current.id}`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        type: "SRV",
        name: CLOUDFLARE_SRV_NAME,
        data: {
          priority: current.priority,
          weight: current.weight,
          port,
          target,
        },
        ttl: SRV_SHORT_TTL,
        // Los SRV nunca se proxian en Cloudflare
        proxied: false,
      }),
    }
  );
  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(cfErrorMessage(body?.errors, `Cloudflare error: ${res.status}`));
  }
  return toSrvRecord(body.result as CfDnsRecord);
}
