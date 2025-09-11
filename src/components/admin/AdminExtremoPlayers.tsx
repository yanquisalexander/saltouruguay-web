import { useState, useEffect } from "preact/compat";
import { actions } from "astro:actions";
import { toast } from "sonner";

interface Player {
    id: number;
    livesCount: number;
    isConfirmedPlayer: boolean;
    inscription: {
        minecraft_username: string;
        discordUsername: string;
    };
}

export default function AdminExtremoPlayers() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        try {
            const response = await fetch("/api/extremo-players");
            const data = await response.json();
            // Ordenar: primero confirmados (true), luego por vidas descendente
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
        try {
            const updateData: any = { playerId };

            if (field === 'isConfirmedPlayer') {
                updateData.isConfirmedPlayer = value;
            } else if (field === 'livesCount') {
                updateData.livesCount = value;
            }

            toast.promise(
                actions.admin.updateExtremoPlayer(updateData),
                {
                    loading: "Actualizando jugador...",
                    success: () => {
                        fetchPlayers();
                        return "Jugador actualizado";
                    },
                    error: "Error al actualizar jugador",
                }
            );
        } catch (error) {
            console.error("Error updating player:", error);
        }
    };

    const seedPlayers = async () => {
        try {
            const seedPromise = fetch("/api/seed-extremo-players", {
                method: "POST",
            })
                .then((r) => r.json())
                .then((data) => {
                    if (!data.success) throw new Error(data.error || "Error al inicializar");
                    return data;
                });

            await toast.promise(seedPromise, {
                loading: "Inicializando jugadores...",
                success: "Jugadores inicializados",
                error: "Error al inicializar jugadores",
            });

            await fetchPlayers(); // Refresh the list
        } catch (error) {
            console.error("Error seeding players:", error);
        }
    };

    if (loading) return <div className="text-white font-rubik">Cargando...</div>;

    if (players.length === 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-anton text-white">Gestión de Jugadores - SaltoCraft Extremo 3</h2>
                <div className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-lg border border-neutral-800 shadow-lg text-center">
                    <p className="text-gray-300 mb-4 font-rubik">No hay jugadores registrados aún.</p>
                    <button
                        onClick={seedPlayers}
                        className="px-4 py-2 bg-electric-violet-500 text-white rounded font-rubik hover:bg-electric-violet-600 transition-colors"
                    >
                        Inicializar Jugadores desde Inscripciones
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-anton text-white">Gestión de Jugadores - SaltoCraft Extremo 3</h2>

            <div className="grid gap-4">
                {players.map((player) => (
                    <div key={player.id} className="bg-zinc-900/50 backdrop-blur-sm p-4 rounded-lg border border-neutral-800 shadow-lg hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className={`font-semibold text-white font-minecraftia ${player.livesCount === 0
                                    ? 'text-red-500 line-through'
                                    : ''
                                    }`}>
                                    {player.inscription.minecraft_username}
                                </h3>
                                <p className="text-sm text-gray-300 font-rubik">{player.inscription.discordUsername}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-rubik">Confirmado:</label>
                                    <input
                                        type="checkbox"
                                        checked={player.isConfirmedPlayer}
                                        onChange={(e) => updatePlayer(player.id, 'isConfirmedPlayer', e.target.checked)}
                                        className="rounded bg-zinc-800 border border-neutral-600 text-electric-violet-500 focus:border-electric-violet-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-rubik">Vidas:</label>
                                    <button
                                        onClick={() => updatePlayer(player.id, 'livesCount', Math.max(0, player.livesCount - 1))}
                                        className="px-2 py-1 bg-red-600 text-white rounded font-rubik hover:bg-red-700 transition-colors"
                                    >
                                        -
                                    </button>
                                    <div className="flex items-center gap-1 px-2">
                                        {Array.from({ length: 3 }, (_, i) => (
                                            <img
                                                key={i}
                                                src={i < player.livesCount ? "/images/vida.webp" : "/images/calavera.webp"}
                                                alt={i < player.livesCount ? "Vida" : "Sin vida"}
                                                className="w-5 h-5"
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => updatePlayer(player.id, 'livesCount', Math.min(3, player.livesCount + 1))}
                                        className="px-2 py-1 bg-green-600 text-white rounded font-rubik hover:bg-green-700 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
