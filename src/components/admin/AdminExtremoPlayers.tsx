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
            <div class="flex items-center justify-center py-12 text-gray-400 font-rubik">
                <div class="w-6 h-6 border-2 border-electric-violet-500 border-t-transparent rounded-full animate-spin mr-3"></div>
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
        <div class="space-y-6">
            {/* Header */}
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold font-anton text-white">Gestión de Jugadores</h2>
                    <p class="text-gray-400 text-sm font-rubik mt-1">
                        {confirmedPlayers.length} confirmados · {unconfirmedPlayers.length} sin confirmar
                    </p>
                </div>
                <button
                    onClick={seedPlayers}
                    class="px-4 py-2 bg-electric-violet-500 hover:bg-electric-violet-600 text-white rounded-lg font-bold flex items-center gap-2 transition-colors text-sm"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Añadir Jugadores
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
                        class="w-full md:w-96 px-4 py-3 pl-10 rounded-lg border border-white/10 bg-[#0a0a0a] text-white font-rubik focus:outline-none focus:border-electric-violet-500 transition-colors"
                    />
                    <svg class="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            )}

            {/* Confirmed Players */}
            {filteredConfirmed.length > 0 && (
                <div class="space-y-3">
                    <h3 class="text-sm font-bold text-green-400 uppercase tracking-wider font-rubik flex items-center gap-2">
                        <span class="w-2 h-2 bg-green-400 rounded-full"></span>
                        Confirmados ({filteredConfirmed.length})
                    </h3>
                    <div class="grid gap-3">
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
                    <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider font-rubik flex items-center gap-2">
                        <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
                        Sin Confirmar ({unconfirmedPlayers.length})
                    </h3>
                    <div class="grid gap-3 opacity-60">
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
                <div class="bg-[#0a0a0a] border border-white/5 rounded-2xl p-12 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p class="text-gray-400 font-rubik mb-4">No hay jugadores registrados</p>
                    <button
                        onClick={seedPlayers}
                        class="px-6 py-3 bg-electric-violet-500 hover:bg-electric-violet-600 text-white rounded-lg font-bold transition-colors"
                    >
                        Crear desde Inscripciones
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
        <div class={`bg-[#0a0a0a] border border-white/5 rounded-xl p-4 hover:bg-white/[0.02] transition-colors ${!confirmed ? 'opacity-60' : ''}`}>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                            class="font-bold text-white font-minecraftia bg-white/5 px-3 py-1.5 rounded-lg border border-electric-violet-500 focus:outline-none w-full sm:w-64"
                        />
                    ) : (
                        <h4
                            class={`font-bold text-white font-minecraftia cursor-pointer hover:text-electric-violet-400 transition-colors ${isDead ? 'text-red-500 line-through' : ''}`}
                            title="Editar nombre"
                            onClick={() => {
                                setEditingId(player.id);
                                setEditingValue(player.inscription.minecraft_username);
                            }}
                        >
                            {player.inscription.minecraft_username || "Sin nombre"}
                        </h4>
                    )}
                    <p class="text-sm text-gray-500 font-rubik truncate">{player.inscription.discordUsername || "Sin Discord"}</p>
                </div>

                {/* Right: Controls */}
                <div class="flex items-center gap-4 flex-wrap">
                    {/* Confirmed toggle */}
                    <button
                        type="button"
                        onClick={() => updatePlayer(player.id, 'isConfirmedPlayer', !player.isConfirmedPlayer)}
                        class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
                    >
                        <div class={`w-10 h-5 rounded-full relative transition-colors ${player.isConfirmedPlayer ? 'bg-green-500' : 'bg-white/10'}`}>
                            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${player.isConfirmedPlayer ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                        </div>
                        <span class="text-xs text-gray-400 font-rubik">Confirmado</span>
                    </button>

                    {/* Repechaje toggle */}
                    <button
                        type="button"
                        onClick={() => updatePlayer(player.id, 'isRepechaje', !player.isRepechaje)}
                        class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
                    >
                        <div class={`w-10 h-5 rounded-full relative transition-colors ${player.isRepechaje ? 'bg-yellow-500' : 'bg-white/10'}`}>
                            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${player.isRepechaje ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                        </div>
                        <span class="text-xs text-gray-400 font-rubik">Repechaje</span>
                    </button>

                    {/* Lives */}
                    <div class="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                        <button
                            onClick={() => updatePlayer(player.id, 'livesCount', Math.max(0, player.livesCount - 1))}
                            class="w-6 h-6 flex items-center justify-center rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors text-sm font-bold"
                        >
                            −
                        </button>
                        <div class="flex items-center gap-1 px-2">
                            {Array.from({ length: 3 }, (_, i) => (
                                <img
                                    key={i}
                                    src={i < player.livesCount ? "/images/vida.webp" : "/images/calavera.webp"}
                                    alt={i < player.livesCount ? "Vida" : "Muerto"}
                                    class="w-5 h-5"
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => updatePlayer(player.id, 'livesCount', Math.min(3, player.livesCount + 1))}
                            class="w-6 h-6 flex items-center justify-center rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors text-sm font-bold"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
