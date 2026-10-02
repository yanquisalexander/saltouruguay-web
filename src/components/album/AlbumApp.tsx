import { actions } from "astro:actions";
import { useState } from "preact/hooks";
import { toast } from "sonner";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_CHANNELS_ALBUM, PUSHER_EVENTS_ALBUM } from "@/consts/pusher";
import {
    PACK_PRICES,
    PACK_TIER_META,
    TIER_META,
    type Figurita,
    type FiguritaTier,
    type PackTier,
} from "@/consts/Figuritas";
import {
    LucideAlbum,
    LucideGift,
    LucideStore,
    LucideCoins,
    LucideSparkles,
    LucideX,
    LucidePackageOpen,
    LucideRepeat,
} from "lucide-preact";

export interface AlbumEntryProp {
    figurita: Figurita;
    quantity: number;
}

export interface PackProp {
    id: number;
    tier: PackTier;
    source: string;
    createdAt: string | Date;
}

interface AlbumAppProps {
    initialEntries: AlbumEntryProp[];
    initialCollected: number;
    initialTotal: number;
    initialDuplicates: number;
    initialPacks: PackProp[];
    initialBalance: number;
    userId: number;
}

type Tab = "album" | "packs" | "shop";

const TIER_ORDER: FiguritaTier[] = ["comun", "rara", "epica", "legendaria"];
const TIER_EMOJI: Record<FiguritaTier, string> = {
    comun: "🃏",
    rara: "💎",
    epica: "🔥",
    legendaria: "👑",
};

function FiguritaCard({ figurita, quantity }: AlbumEntryProp) {
    const owned = quantity > 0;
    const meta = TIER_META[figurita.tier];
    return (
        <div
            class={`relative rounded-xl border bg-white/5 p-2 text-center transition ${owned ? meta.glow : "border-white/10 opacity-60"}`}
        >
            <div class="relative mx-auto aspect-square w-full overflow-hidden rounded-lg bg-black/40">
                {owned ? (
                    <img
                        src={figurita.imagen}
                        alt={figurita.nombre}
                        loading="lazy"
                        class="h-full w-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div class="flex h-full w-full items-center justify-center text-4xl grayscale">
                        {TIER_EMOJI[figurita.tier]}
                    </div>
                )}
                {/* Fallback emoji behind image in case CDN 404s */}
                {owned && (
                    <div class="-z-0 absolute inset-0 flex items-center justify-center text-4xl">
                        {TIER_EMOJI[figurita.tier]}
                    </div>
                )}
                {quantity > 1 && (
                    <span class="absolute right-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-black">
                        x{quantity}
                    </span>
                )}
            </div>
            <p class="mt-1.5 truncate text-xs font-semibold text-white">
                {owned ? figurita.nombre : "???"}
            </p>
            <p class={`text-[11px] font-bold uppercase ${meta.color}`}>{meta.label}</p>
        </div>
    );
}

export const AlbumApp = ({
    initialEntries,
    initialCollected,
    initialTotal,
    initialDuplicates,
    initialPacks,
    initialBalance,
    userId,
}: AlbumAppProps) => {
    const [tab, setTab] = useState<Tab>("album");
    const [entries, setEntries] = useState(initialEntries);
    const [collected, setCollected] = useState(initialCollected);
    const [duplicates, setDuplicates] = useState(initialDuplicates);
    const [packs, setPacks] = useState(initialPacks);
    const [balance, setBalance] = useState(initialBalance);
    const [filter, setFilter] = useState<FiguritaTier | "todas">("todas");
    const [openingId, setOpeningId] = useState<number | null>(null);
    const [revealed, setRevealed] = useState<AlbumEntryProp[] | null>(null);
    const [buying, setBuying] = useState<PackTier | null>(null);

    const progress = initialTotal === 0 ? 0 : Math.round((collected / initialTotal) * 100);

    const refreshAlbum = async () => {
        const { data } = await actions.album.getAlbum();
        if (data) {
            setEntries(data.entries);
            setCollected(data.collected);
            setDuplicates(data.duplicates);
        }
    };

    const refreshPacks = async () => {
        const { data } = await actions.album.getPacks();
        if (data) setPacks(data as PackProp[]);
    };

    usePusherChannel({
        channelName: PUSHER_CHANNELS_ALBUM.USER(userId),
        events: {
            [PUSHER_EVENTS_ALBUM.PACK_RECEIVED]: (payload: { tier: PackTier }) => {
                toast.success(`¡Nuevo ${PACK_TIER_META[payload.tier]?.label ?? "sobre"} disponible! 🎁`);
                refreshPacks();
            },
        },
    });

    const handleOpen = async (packId: number) => {
        setOpeningId(packId);
        setRevealed(null);
        const { data, error } = await actions.album.openPack({ packId });
        setOpeningId(null);
        if (error || !data) {
            toast.error("No se pudo abrir el sobre");
            return;
        }
        const cards = (data.entries as AlbumEntryProp[]) ?? [];
        setRevealed(cards);
        await Promise.all([refreshAlbum(), refreshPacks()]);
        const hasRare = cards.some((c) => c.figurita.tier === "epica" || c.figurita.tier === "legendaria");
        if (hasRare) toast.success("¡Te tocó una carta especial! ✨");
    };

    const handleBuy = async (tier: PackTier) => {
        setBuying(tier);
        const { data, error } = await actions.album.buyPack({ tier });
        setBuying(null);
        if (error || !data) {
            toast.error("No tienes suficientes coins");
            return;
        }
        toast.success(`Compraste un ${PACK_TIER_META[tier].label} 📦`);
        setBalance((b) => b - PACK_PRICES[tier]);
        await refreshPacks();
        setTab("packs");
    };

    const visibleEntries =
        filter === "todas" ? entries : entries.filter((e) => e.figurita.tier === filter);

    const grouped: Record<FiguritaTier, AlbumEntryProp[]> = {
        comun: [],
        rara: [],
        epica: [],
        legendaria: [],
    };
    for (const e of visibleEntries) grouped[e.figurita.tier].push(e);

    return (
        <div class="mx-auto w-full max-w-5xl px-4 py-6">
            {/* Header */}
            <div class="mb-6 text-center">
                <h1 class="font-anton text-4xl uppercase tracking-wide text-white">
                    Álbum de Figuritas
                </h1>
                <p class="mt-1 text-sm text-white/60">
                    Temporada 1 · {collected}/{initialTotal} conseguidas ({progress}%)
                </p>
                <div class="mx-auto mt-3 h-3 max-w-md overflow-hidden rounded-full bg-white/10">
                    <div
                        class="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-400 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div class="mt-2 flex items-center justify-center gap-4 text-sm text-white/70">
                    <span class="flex items-center gap-1">
                        <LucideRepeat size={14} /> {duplicates} repetidas
                    </span>
                    <span class="flex items-center gap-1">
                        <LucideGift size={14} /> {packs.length} sobres sin abrir
                    </span>
                    <span class="flex items-center gap-1">
                        <LucideCoins size={14} /> {balance} coins
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div class="mb-6 flex justify-center gap-2">
                {(
                    [
                        { id: "album", label: "Álbum", icon: <LucideAlbum size={16} /> },
                        { id: "packs", label: `Sobres (${packs.length})`, icon: <LucideGift size={16} /> },
                        { id: "shop", label: "Tienda", icon: <LucideStore size={16} /> },
                    ] as { id: Tab; label: string; icon: any }[]
                ).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        class={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
                            tab === t.id
                                ? "bg-white text-black"
                                : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "album" && (
                <div>
                    <div class="mb-4 flex flex-wrap justify-center gap-2">
                        {(["todas", ...TIER_ORDER] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                class={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                                    filter === f ? "bg-amber-400 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    {TIER_ORDER.map(
                        (tier) =>
                            grouped[tier].length > 0 && (
                                <div key={tier} class="mb-6">
                                    <h2 class={`mb-2 text-sm font-bold uppercase tracking-widest ${TIER_META[tier].color}`}>
                                        {TIER_META[tier].label} · {grouped[tier].filter((e) => e.quantity > 0).length}/{grouped[tier].length}
                                    </h2>
                                    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                        {grouped[tier].map((e) => (
                                            <FiguritaCard key={e.figurita.id} figurita={e.figurita} quantity={e.quantity} />
                                        ))}
                                    </div>
                                </div>
                            ),
                    )}
                </div>
            )}

            {tab === "packs" && (
                <div>
                    {packs.length === 0 ? (
                        <div class="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
                            <LucidePackageOpen size={32} class="mx-auto mb-2 opacity-50" />
                            <p class="font-semibold">No tienes sobres sin abrir</p>
                            <p class="mt-1 text-sm">
                                Mira el directo para ganar sobres cada 15 minutos, o compra en la tienda.
                            </p>
                        </div>
                    ) : (
                        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {packs.map((p) => (
                                <div key={p.id} class="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                                    <div class="text-5xl">📦</div>
                                    <p class={`mt-2 text-sm font-bold ${PACK_TIER_META[p.tier]?.color ?? "text-white"}`}>
                                        {PACK_TIER_META[p.tier]?.label ?? p.tier}
                                    </p>
                                    <p class="text-[11px] uppercase text-white/40">
                                        {p.source === "purchase" ? "tienda" : "directo"}
                                    </p>
                                    <button
                                        onClick={() => handleOpen(p.id)}
                                        disabled={openingId !== null}
                                        class="mt-3 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
                                    >
                                        {openingId === p.id ? "Abriendo…" : "Abrir"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === "shop" && (
                <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {(Object.keys(PACK_PRICES) as PackTier[]).map((tier) => (
                        <div key={tier} class="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                            <div class="text-5xl">🎁</div>
                            <p class={`mt-2 font-bold ${PACK_TIER_META[tier].color}`}>{PACK_TIER_META[tier].label}</p>
                            <p class="mt-1 flex items-center justify-center gap-1 text-sm text-amber-300">
                                <LucideCoins size={14} /> {PACK_PRICES[tier]}
                            </p>
                            <button
                                onClick={() => handleBuy(tier)}
                                disabled={buying !== null || balance < PACK_PRICES[tier]}
                                class="mt-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-black transition hover:bg-white/80 disabled:opacity-40"
                            >
                                {buying === tier ? "Comprando…" : "Comprar"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de apertura */}
            {revealed && (
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6 text-center">
                        <div class="mb-1 flex items-center justify-center gap-2 text-amber-300">
                            <LucideSparkles size={20} />
                            <h3 class="font-anton text-2xl uppercase text-white">¡Sobre abierto!</h3>
                            <LucideSparkles size={20} />
                        </div>
                        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {revealed.map((c, i) => (
                                <div
                                    key={`${c.figurita.id}-${i}`}
                                    class={`animate-fade-in rounded-xl border bg-white/5 p-2 ${TIER_META[c.figurita.tier].glow}`}
                                    style={{ animationDelay: `${i * 150}ms` }}
                                >
                                    <img
                                        src={c.figurita.imagen}
                                        alt={c.figurita.nombre}
                                        class="mx-auto aspect-square w-full rounded-lg bg-black/40 object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                    <p class="mt-1 truncate text-xs font-semibold text-white">{c.figurita.nombre}</p>
                                    <p class={`text-[11px] font-bold uppercase ${TIER_META[c.figurita.tier].color}`}>
                                        {TIER_META[c.figurita.tier].label}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setRevealed(null)}
                            class="mx-auto mt-5 flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-bold text-black hover:bg-white/80"
                        >
                            <LucideX size={16} /> Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
