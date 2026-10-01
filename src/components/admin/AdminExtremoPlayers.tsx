import { useState, useEffect } from "preact/compat";
import { actions } from "astro:actions";
import { toast } from "sonner";

interface Player {
    id: number;
    livesCount: number;
    isConfirmedPlayer: boolean;
    isRepechaje: boolean;
    inscription: {
        minecraft_username: string;
        discordUsername: string;
    };
}

export default function AdminExtremoPlayers() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState("");

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        try {
            const response = await fetch("/api/extremo-players");
            const data = await response.json();
            const sorted = [...(data.players || [])].sort((a, b) => {
                if (a.isConfirmedPlayer !== b.isConfirmedPlayer) {
                    return Number(b.isConfirmedPlayer) - Number(a.isConfirmedPlayer);
                }
                return (b.livesCount ?? 0) - (a.livesCount ?? 0);
            });
            setPlayers(sorted);
        } catch (error) {
            console.error("Error fetching players:", error);
        } finally {
            setLoading(false);
        }
    };

    const updatePlayer = async (playerId: number, field: string, value: any) => {
        const updateData: any = { playerId };
        if (field === 'isConfirmedPlayer') updateData.isConfirmedPlayer = value;
        else if (field === 'isRepechaje') updateData.isRepechaje = value;
        else if (field === 'livesCount') updateData.livesCount = value;
        else if (field === 'minecraft_username') updateData.minecraft_username = value;

        toast.promise(actions.admin.updateExtremoPlayer(updateData), {
            loading: "Actualizando...",
            success: () => { fetchPlayers(); return "Jugador actualizado"; },
            error: "Error al actualizar",
        });
    };

    const seedPlayers = async () => {
        try {
            const res = await fetch("/api/seed-extremo-players", { method: "POST" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            toast.success("Jugadores creados");
            await fetchPlayers();
        } catch {
            toast.error("Error al inicializar jugadores");
        }
    };

    if (loading) {
        return (
            <div class="flex items-center justify-center gap-3 py-14 text-white/40 font-rubik text-sm">
                <div class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                Cargando jugadores...
            </div>
        );
    }

    const confirmedPlayers = players.filter(p => p.isConfirmedPlayer);
    const unconfirmedPlayers = players.filter(p => !p.isConfirmedPlayer);

    const filteredConfirmed = confirmedPlayers.filter(p => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            p.inscription.minecraft_username?.toLowerCase().includes(q) ||
            p.inscription.discordUsername?.toLowerCase().includes(q)
        );
    });

    return (
        <div class="p-5 sm:p-6 space-y-6">
            {/* Header */}
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-2.5">
                    <h2 class="text-lg font-anton text-white uppercase tracking-wide leading-none">Jugadores</h2>
                    <span class="text-[11px] font-mono font-bold text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full tabular-nums">
                        {confirmedPlayers.length} ✓ · {unconfirmedPlayers.length} …
                    </span>
                </div>
                <button
                    onClick={seedPlayers}
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-violet-950/50 border border-violet-300/25 cursor-pointer"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Añadir jugadores
                </button>
            </div>

            {/* Search */}
            {confirmedPlayers.length > 0 && (
                <div class="relative">
                    <input
                        type="text"
                        value={search}
                        onInput={e => setSearch((e.target as HTMLInputElement).value)}
                        placeholder="Buscar por nombre o Discord..."
                        class="w-full md:w-96 px-4 py-2.5 pl-10 rounded-xl border border-white/10 bg-black/40 text-white text-sm font-rubik placeholder:text-white/25 focus:outline-none focus:border-violet-400/50 focus:bg-black/60 transition-colors"
                    />
                    <svg class="w-[18px] h-[18px] text-white/25 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            )}

            {/* Confirmed Players */}
            {filteredConfirmed.length > 0 && (
                <div class="space-y-3">
                    <h3 class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 uppercase tracking-widest font-rubik px-2.5 py-1 rounded-full">
                        <span class="size-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                        Confirmados · {filteredConfirmed.length}
                    </h3>
                    <div class="grid gap-2.5">
                        {filteredConfirmed.map(player => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                editingId={editingId}
                                editingValue={editingValue}
                                setEditingId={setEditingId}
                                setEditingValue={setEditingValue}
                                updatePlayer={updatePlayer}
                                confirmed
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Unconfirmed Players */}
            {unconfirmedPlayers.length > 0 && (
                <div class="space-y-3">
                    <h3 class="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/40 bg-white/5 border border-white/10 uppercase tracking-widest font-rubik px-2.5 py-1 rounded-full">
                        <span class="size-1.5 bg-white/30 rounded-full"></span>
                        Sin confirmar · {unconfirmedPlayers.length}
                    </h3>
                    <div class="grid gap-2.5">
                        {unconfirmedPlayers.map(player => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                editingId={editingId}
                                editingValue={editingValue}
                                setEditingId={setEditingId}
                                setEditingValue={setEditingValue}
                                updatePlayer={updatePlayer}
                                confirmed={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {players.length === 0 && (
                <div class="border border-dashed border-white/15 rounded-3xl p-12 text-center bg-black/20">
                    <span class="mx-auto mb-4 size-14 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
                        <svg class="w-7 h-7 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </span>
                    <p class="text-white/60 font-rubik text-sm mb-1 font-bold">No hay jugadores registrados</p>
                    <p class="text-white/30 font-rubik text-xs mb-5">Crealos a partir de las inscripciones sincronizadas.</p>
                    <button
                        onClick={seedPlayers}
                        class="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-300/25 cursor-pointer"
                    >
                        Crear desde inscripciones
                    </button>
                </div>
            )}
        </div>
    );
}

function PlayerCard({ player, editingId, editingValue, setEditingId, setEditingValue, updatePlayer, confirmed }: {
    player: Player;
    editingId: number | null;
    editingValue: string;
    setEditingId: (id: number | null) => void;
    setEditingValue: (val: string) => void;
    updatePlayer: (id: number, field: string, value: any) => void;
    confirmed: boolean;
}) {
    const isEditing = editingId === player.id;
    const isDead = player.livesCount === 0;

    return (
        <div class={`rounded-2xl border p-4 transition-all ${!confirmed ? 'opacity-55 bg-black/30 border-white/5' : isDead ? 'bg-red-500/[0.04] border-red-500/20 hover:border-red-500/35' : 'bg-white/[0.03] border-white/[0.07] hover:border-white/15'}`}>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Username + Discord */}
                <div class="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editingValue}
                            autoFocus
                            onInput={e => setEditingValue((e.target as HTMLInputElement).value)}
                            onBlur={() => {
                                setEditingId(null);
                                if (editingValue.trim() && editingValue !== player.inscription.minecraft_username) {
                                    updatePlayer(player.id, 'minecraft_username', editingValue.trim());
                                }
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setEditingId(null);
                                    if (editingValue.trim() && editingValue !== player.inscription.minecraft_username) {
                                        updatePlayer(player.id, 'minecraft_username', editingValue.trim());
                                    }
                                } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                }
                            }}
                            class="font-bold text-white font-minecraftia text-sm bg-black/50 px-3 py-2 rounded-xl border border-violet-400/50 focus:outline-none w-full sm:w-64"
                        />
                    ) : (
                        <h4
                            class={`font-bold font-minecraftia text-[15px] cursor-pointer transition-colors truncate ${isDead ? 'text-red-400 line-through' : 'text-white hover:text-violet-300'}`}
                            title="Clic para editar nombre"
                            onClick={() => {
                                setEditingId(player.id);
                                setEditingValue(player.inscription.minecraft_username);
                            }}
                        >
                            {player.inscription.minecraft_username || "Sin nombre"}
                        </h4>
                    )}
                    <p class="text-xs text-white/35 font-rubik truncate mt-0.5">{player.inscription.discordUsername || "Sin Discord"}</p>
                </div>

                {/* Right: Controls */}
                <div class="flex items-center gap-3 sm:gap-4 flex-wrap">
                    {/* Confirmed toggle */}
                    <button
                        type="button"
                        onClick={() => updatePlayer(player.id, 'isConfirmedPlayer', !player.isConfirmedPlayer)}
                        class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
                        aria-pressed={player.isConfirmedPlayer}
                        title="Alternar confirmación"
                    >
                        <div class={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${player.isConfirmedPlayer ? 'bg-emerald-500' : 'bg-white/10'}`}>
                            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${player.isConfirmedPlayer ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                        </div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-white/40 font-rubik">Conf.</span>
                    </button>

                    {/* Repechaje toggle */}
                    <button
                        type="button"
                        onClick={() => updatePlayer(player.id, 'isRepechaje', !player.isRepechaje)}
                        class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
                        aria-pressed={player.isRepechaje}
                        title="Alternar repechaje"
                    >
                        <div class={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${player.isRepechaje ? 'bg-amber-500' : 'bg-white/10'}`}>
                            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${player.isRepechaje ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                        </div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-white/40 font-rubik">Rep.</span>
                    </button>

                    {/* Lives */}
                    <div class="flex items-center gap-1.5 bg-black/40 border border-white/[0.07] rounded-xl px-2 py-1.5">
                        <button
                            onClick={() => updatePlayer(player.id, 'livesCount', Math.max(0, player.livesCount - 1))}
                            aria-label="Quitar vida"
                            class="size-6 flex items-center justify-center rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 transition-colors text-sm font-bold cursor-pointer"
                        >
                            −
                        </button>
                        <div class="flex items-center gap-1 px-1">
                            {Array.from({ length: 3 }, (_, i) => (
                                <img
                                    key={i}
                                    src={i < player.livesCount ? "/images/vida.webp" : "/images/calavera.webp"}
                                    alt={i < player.livesCount ? "Vida" : "Muerto"}
                                    class="w-5 h-5 object-scale-down"
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => updatePlayer(player.id, 'livesCount', Math.min(3, player.livesCount + 1))}
                            aria-label="Agregar vida"
                            class="size-6 flex items-center justify-center rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition-colors text-sm font-bold cursor-pointer"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
