import { client } from "@/db/client";
import {
    StickerDropWindowsTable,
    StickerPacksTable,
    UserStickerInventoryTable,
} from "@/db/schema";
import {
    FIGURITAS,
    FIGURITA_MAP,
    FIGURITAS_POR_TIER,
    PACK_ODDS,
    PACK_SIZE,
    PACK_TIER_WEIGHTS,
    type Figurita,
    type FiguritaTier,
    type PackSource,
    type PackTier,
} from "@/consts/Figuritas";
import { and, desc, eq, sql } from "drizzle-orm";

const TIER_RANK: Record<FiguritaTier, number> = { comun: 0, rara: 1, epica: 2, legendaria: 3 };
const PACK_TIER_FLOOR: Record<PackTier, FiguritaTier> = {
    comun: "comun",
    raro: "rara",
    epico: "epica",
    legendario: "epica",
};

function weightedPick<T>(entries: { value: T; weight: number }[]): T {
    const total = entries.reduce((acc, e) => acc + e.weight, 0);
    let roll = Math.random() * total;
    for (const e of entries) {
        roll -= e.weight;
        if (roll <= 0) return e.value;
    }
    return entries[entries.length - 1].value;
}

/** Sortea el tier del sobre gratis del directo según PACK_TIER_WEIGHTS. */
export function rollPackTier(): PackTier {
    return weightedPick(
        (Object.keys(PACK_TIER_WEIGHTS) as PackTier[]).map((tier) => ({
            value: tier,
            weight: PACK_TIER_WEIGHTS[tier],
        })),
    );
}

/** Sortea la rareza de una carta dentro de un sobre. */
export function rollFiguritaTier(packTier: PackTier): FiguritaTier {
    const odds = PACK_ODDS[packTier];
    return weightedPick(
        (Object.keys(odds) as FiguritaTier[]).map((tier) => ({ value: tier, weight: odds[tier] })),
    );
}

function randomFiguritaOfTier(tier: FiguritaTier): Figurita {
    const pool = FIGURITAS_POR_TIER[tier];
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Sortea las cartas de un sobre (PACK_SIZE = 4).
 * Los primeros 3 slots son ponderados puros; el último es bonus con piso:
 * el sobre garantiza al menos 1 carta del piso de su tier (o mejor).
 */
export function rollCards(packTier: PackTier, count: number = PACK_SIZE): number[] {
    const cards: number[] = [];
    for (let i = 0; i < count - 1; i++) {
        cards.push(randomFiguritaOfTier(rollFiguritaTier(packTier)).id);
    }
    // Slot bonus con piso
    const floor = PACK_TIER_FLOOR[packTier];
    const bonusTier = rollFiguritaTier(packTier);
    const finalTier = TIER_RANK[bonusTier] >= TIER_RANK[floor] ? bonusTier : floor;
    cards.push(randomFiguritaOfTier(finalTier).id);
    return cards;
}

export function isValidStickerId(id: number): boolean {
    return FIGURITA_MAP.has(id);
}

/** Otorga un sobre sin abrir al usuario. */
export async function grantPack(userId: number, tier: PackTier, source: PackSource) {
    const [pack] = await client
        .insert(StickerPacksTable)
        .values({ userId, tier, source })
        .returning();
    return pack;
}

export type AlbumEntry = {
    figurita: Figurita;
    quantity: number;
    isNew?: boolean;
};

/** Álbum completo del usuario: inventario mapeado al catálogo + progreso. */
export async function getAlbum(userId: number) {
    const rows = await client
        .select()
        .from(UserStickerInventoryTable)
        .where(eq(UserStickerInventoryTable.userId, userId))
        .execute();

    const owned = new Map<number, number>();
    for (const r of rows) owned.set(r.stickerId, r.quantity);

    const entries: AlbumEntry[] = FIGURITAS.map((figurita) => ({
        figurita,
        quantity: owned.get(figurita.id) ?? 0,
    }));

    const collected = entries.filter((e) => e.quantity > 0).length;
    const duplicates = entries.filter((e) => e.quantity > 1).length;
    const total = FIGURITAS.length;

    return {
        entries,
        collected,
        duplicates,
        total,
        progress: total === 0 ? 0 : Math.round((collected / total) * 100),
        complete: collected === total && total > 0,
    };
}

/** Sobres sin abrir del usuario (más recientes primero). */
export async function getUnopenedPacks(userId: number) {
    return await client
        .select()
        .from(StickerPacksTable)
        .where(
            and(eq(StickerPacksTable.userId, userId), eq(StickerPacksTable.opened, false)),
        )
        .orderBy(desc(StickerPacksTable.createdAt))
        .execute();
}

/** Historial reciente de sobres (abiertos y sin abrir). */
export async function getPackHistory(userId: number, limit = 20) {
    return await client
        .select()
        .from(StickerPacksTable)
        .where(eq(StickerPacksTable.userId, userId))
        .orderBy(desc(StickerPacksTable.createdAt))
        .limit(limit)
        .execute();
}

/**
 * Abre un sobre: idempotente. Si ya estaba abierto devuelve sus cartas.
 * Reclama el sobre atómicamente (UPDATE ... WHERE opened=false) para
 * evitar doble apertura concurrente.
 */
export async function openPack(packId: number, userId: number) {
    const existing = await client
        .select()
        .from(StickerPacksTable)
        .where(and(eq(StickerPacksTable.id, packId), eq(StickerPacksTable.userId, userId)))
        .execute()
        .then((r) => r[0]);

    if (!existing) throw new Error("Pack not found");

    if (existing.opened && Array.isArray(existing.cards)) {
        return { pack: existing, cards: existing.cards, entries: toEntries(existing.cards), alreadyOpened: true as const };
    }

    const cards = rollCards(existing.tier as PackTier).filter(isValidStickerId);

    // Reclamo atómico: solo un opener gana la carrera
    const [claimed] = await client
        .update(StickerPacksTable)
        .set({ opened: true, cards, openedAt: sql`current_timestamp` })
        .where(
            and(
                eq(StickerPacksTable.id, packId),
                eq(StickerPacksTable.userId, userId),
                eq(StickerPacksTable.opened, false),
            ),
        )
        .returning();

    // Si perdimos la carrera, otro request lo abrió: leer el resultado final
    const finalPack = claimed ?? (await client
        .select()
        .from(StickerPacksTable)
        .where(eq(StickerPacksTable.id, packId))
        .execute()
        .then((r) => r[0]));
    const finalCards = (finalPack.cards as number[]) ?? cards;

    // Acreditar cartas al álbum (upsert por carta; sobres son de 4, loop simple)
    for (const stickerId of finalCards) {
        const [row] = await client
            .select({ quantity: UserStickerInventoryTable.quantity })
            .from(UserStickerInventoryTable)
            .where(
                and(
                    eq(UserStickerInventoryTable.userId, userId),
                    eq(UserStickerInventoryTable.stickerId, stickerId),
                ),
            )
            .execute();
        if (row) {
            await client
                .update(UserStickerInventoryTable)
                .set({ quantity: row.quantity + 1, updatedAt: sql`current_timestamp` })
                .where(
                    and(
                        eq(UserStickerInventoryTable.userId, userId),
                        eq(UserStickerInventoryTable.stickerId, stickerId),
                    ),
                )
                .execute();
        } else {
            await client
                .insert(UserStickerInventoryTable)
                .values({ userId, stickerId, quantity: 1 })
                .onConflictDoNothing()
                .execute();
        }
    }

    return { pack: finalPack, cards: finalCards, entries: toEntries(finalCards), alreadyOpened: false as const };
}

function toEntries(cards: number[]): AlbumEntry[] {
    return cards.map((id) => ({ figurita: FIGURITA_MAP.get(id)!, quantity: 1 }));
}

/** Clave de ventana de 15 min (UTC) para idempotencia del cron. */
export function currentDropWindowKey(now: Date = new Date()): string {
    const floored = Math.floor(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
    return new Date(floored).toISOString().slice(0, 16); // "2026-10-01T20:00"
}

/**
 * Otorga 1 sobre (tier sorteado) a cada usuario elegible.
 * Idempotente por windowKey: reclama la ventana atómicamente
 * (INSERT ... ON CONFLICT DO NOTHING); si ya existía, no otorga nada.
 * Devuelve { skipped, granted, packs } con los sobres creados.
 */
export async function runStreamDrop(windowKey: string, eligibleUserIds: number[], streamId?: string) {
    const [claimed] = await client
        .insert(StickerDropWindowsTable)
        .values({ windowKey, streamId: streamId ?? null, packsGranted: 0 })
        .onConflictDoNothing()
        .returning();

    if (!claimed) return { skipped: true as const, granted: 0, packs: [] as { userId: number; packId: number; tier: PackTier }[] };

    const uniqueUserIds = [...new Set(eligibleUserIds.filter((id) => Number.isInteger(id) && id > 0))];
    const packs: { userId: number; packId: number; tier: PackTier }[] = [];

    for (const userId of uniqueUserIds) {
        const tier = rollPackTier();
        const pack = await grantPack(userId, tier, "stream_drop");
        packs.push({ userId, packId: pack.id, tier });
    }

    await client
        .update(StickerDropWindowsTable)
        .set({ packsGranted: packs.length })
        .where(eq(StickerDropWindowsTable.windowKey, windowKey))
        .execute();

    return { skipped: false as const, granted: packs.length, packs };
}
