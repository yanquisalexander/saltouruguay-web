import { INSCRIPTIONS_API_KEY, INSCRIPTIONS_API_URL } from 'astro:env/server';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';

/**
 * Proxy público hacia inscripciones.saltouruguayserver.com.
 *
 * El token interno (`INSCRIPTIONS_API_KEY`) vive solo en el servidor:
 * estas actions corren server-side y el mobile las consume vía
 * `POST /_actions/inscriptions.<name>` sin ver jamás la API key.
 */

const inscriptionEventSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    coverImage: z.string().nullable(),
    eventDate: z.string().nullable(),
    eventLocation: z.string().nullable(),
    status: z.string(),
    maxParticipants: z.number().nullable(),
    // SQLite puede devolver 0/1 según el driver; se normaliza abajo.
    requireDiscord: z.union([z.boolean(), z.number()]).nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    inscriptionCount: z.number().optional(),
    spotsLeft: z.number().nullable().optional(),
});

export type InscriptionEvent = z.infer<typeof inscriptionEventSchema>;

const listEventsInput = z.object({
    /** `open`, `upcoming`, ... o combinados `open,upcoming`. Alias: `active` = open+upcoming+ongoing. */
    status: z.string().max(100).optional(),
    /** Búsqueda parcial en título/descripción. */
    q: z.string().max(100).optional(),
    /** Filtra por `eventDate` (ISO). */
    from: z.string().max(30).optional(),
    /** Filtra por `eventDate` (ISO). */
    to: z.string().max(30).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    sort: z.enum(['eventDate_asc', 'eventDate_desc', 'createdAt_desc']).default('eventDate_asc'),
});

async function callInscriptionsApi(params: Record<string, string>) {
    let url: URL;
    try {
        url = new URL('/api/events/list', INSCRIPTIONS_API_URL);
    } catch {
        console.error('[inscriptions] INSCRIPTIONS_API_URL no configurada o inválida');
        throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Servicio de inscripciones no configurado',
        });
    }
    for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
    }

    let res: Response;
    try {
        res = await fetch(url.toString(), {
            headers: { 'X-API-Key': INSCRIPTIONS_API_KEY },
            signal: AbortSignal.timeout(10_000),
        });
    } catch (error) {
        console.error('[inscriptions] Error de red contra inscripciones API:', error);
        throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No se pudo contactar el servicio de inscripciones',
        });
    }

    if (!res.ok) {
        console.error(`[inscriptions] Inscripciones API HTTP ${res.status}`);
        throw new ActionError({
            code: res.status === 401 || res.status === 403 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
            message: 'Error al obtener las inscripciones',
        });
    }

    let data: unknown;
    try {
        data = await res.json();
    } catch {
        throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Respuesta inválida del servicio de inscripciones',
        });
    }

    const parsed = z
        .object({
            success: z.boolean(),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
            events: z.array(inscriptionEventSchema),
        })
        .safeParse(data);

    if (!parsed.success || !parsed.data.success) {
        console.error('[inscriptions] Payload inesperado:', JSON.stringify(data).slice(0, 300));
        throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Respuesta inválida del servicio de inscripciones',
        });
    }

    return {
        ...parsed.data,
        events: parsed.data.events.map((e) => ({
            ...e,
            requireDiscord: Boolean(e.requireDiscord ?? false),
        })),
    };
}

export const inscriptions = {
    /**
     * `inscriptions.listEvents` — PÚBLICA (sin login).
     * Lista inscripciones/eventos con filtros: ideal para la cartelera móvil
     * (próximas / abiertas). Ej: `{ status: "open", limit: 10 }`.
     */
    listEvents: defineAction({
        input: listEventsInput.optional(),
        handler: async (input) => {
            const { status, q, from, to, limit, offset, sort } = input ?? {
                limit: 20,
                offset: 0,
                sort: 'eventDate_asc' as const,
            };
            return callInscriptionsApi({
                ...(status ? { status } : {}),
                ...(q ? { q } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
                limit: String(limit),
                offset: String(offset),
                sort,
            });
        },
    }),

    /**
     * `inscriptions.getEvent` — PÚBLICA (sin login).
     * Detalle de una inscripción por id. Ej: `{ id: 3 }`.
     */
    getEvent: defineAction({
        input: z.object({ id: z.number().int().positive() }),
        handler: async ({ id }) => {
            const result = await callInscriptionsApi({ id: String(id) });
            const event = result.events[0] ?? null;
            if (!event) {
                throw new ActionError({ code: 'NOT_FOUND', message: 'Inscripción no encontrada' });
            }
            return { event };
        },
    }),
};
