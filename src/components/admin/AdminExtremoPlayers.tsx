import { useState, useEffect } from "preact/compat";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
    const [repechajeVotes, setRepechajeVotes] = useState<Array<{ playerId: number, minecraft_username: string, discordUsername: string, voteCount: number }>>([]);

    useEffect(() => {
        fetchPlayers();
        fetchRepechajeVotes();
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

    const fetchRepechajeVotes = async () => {
        try {
            const response = await fetch("/api/repechaje-votes");
            const data = await response.json();
            setRepechajeVotes(data.votes || []);
        } catch (error) {
            console.error("Error fetching repechaje votes:", error);
        }
    };

    const updatePlayer = async (playerId: number, field: string, value: any) => {
        try {
            const updateData: any = { playerId };

            if (field === 'isConfirmedPlayer') {
                updateData.isConfirmedPlayer = value;
            } else if (field === 'isRepechaje') {
                updateData.isRepechaje = value;
            } else if (field === 'livesCount') {
                updateData.livesCount = value;
            } else if (field === 'minecraft_username') {
                updateData.minecraft_username = value;
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

    // Filtrar confirmados y aplicar búsqueda
    const confirmedPlayers = players.filter((p) => p.isConfirmedPlayer);
    const filteredConfirmed = confirmedPlayers.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            p.inscription.minecraft_username.toLowerCase().includes(q) ||
            p.inscription.discordUsername.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-anton text-white">Gestión de Jugadores - SaltoCraft Extremo 3</h2>

            {/* Botón para añadir jugadores faltantes desde las inscripciones */}
            <div className="flex items-center gap-4">
                <button
                    onClick={seedPlayers}
                    className="px-4 py-2 bg-electric-violet-500 text-white rounded font-rubik hover:bg-electric-violet-600 transition-colors"
                >
                    Añadir jugadores faltantes (Desde inscripción)
                </button>
            </div>

            {/* Barra de búsqueda para confirmados */}
            {confirmedPlayers.length > 0 && (
                <div className="my-2">
                    <input
                        type="text"
                        value={search}
                        onInput={e => setSearch((e.target as HTMLInputElement).value)}
                        placeholder="Buscar jugador confirmado..."
                        className="w-full md:w-96 px-3 py-2 rounded border border-neutral-700 bg-zinc-900/70 text-white font-rubik focus:outline-none focus:border-electric-violet-500 transition"
                    />
                </div>
            )}

            {/* Lista de confirmados filtrados */}
            <div className="grid gap-4">
                {filteredConfirmed.map((player) => (
                    <div key={player.id} className="bg-zinc-900/50 backdrop-blur-sm p-4 rounded-lg border border-neutral-800 shadow-lg hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                {/* Username editable */}
                                {editingId === player.id ? (
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
                                        className="font-semibold text-white font-minecraftia bg-zinc-800 px-2 py-1 rounded border border-electric-violet-500 focus:outline-none w-48"
                                    />
                                ) : (
                                    <h3
                                        className={`font-semibold text-white font-minecraftia cursor-pointer ${player.livesCount === 0 ? 'text-red-500 line-through' : ''}`}
                                        title="Editar username"
                                        onClick={() => {
                                            setEditingId(player.id);
                                            setEditingValue(player.inscription.minecraft_username);
                                        }}
                                    >
                                        {player.inscription.minecraft_username}
                                    </h3>
                                )}
                                <p className="text-sm text-gray-300 font-rubik">{player.inscription.discordUsername}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-rubik">Confirmado:</label>
                                    <input
                                        type="checkbox"
                                        checked={player.isConfirmedPlayer}
                                        onChange={(e: any) => updatePlayer(player.id, 'isConfirmedPlayer', e.currentTarget?.checked)}
                                        className="rounded bg-zinc-800 border border-neutral-600 text-electric-violet-500 focus:border-electric-violet-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-rubik">Repechaje:</label>
                                    <input
                                        type="checkbox"
                                        checked={player.isRepechaje}
                                        onChange={(e: any) => updatePlayer(player.id, 'isRepechaje', e.currentTarget?.checked)}
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

            {/* El resto de jugadores no confirmados */}
            <div className="grid gap-4 mt-8">
                {players.filter((p) => !p.isConfirmedPlayer).map((player) => (
                    <div key={player.id} className="bg-zinc-900/30 p-4 rounded-lg border border-neutral-800 shadow hover:bg-zinc-800/30 transition-colors opacity-80">
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
                                        onChange={(e: any) => updatePlayer(player.id, 'isConfirmedPlayer', e.currentTarget?.checked)}
                                        className="rounded bg-zinc-800 border border-neutral-600 text-electric-violet-500 focus:border-electric-violet-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-rubik">Repechaje:</label>
                                    <input
                                        type="checkbox"
                                        checked={player.isRepechaje}
                                        onChange={(e: any) => updatePlayer(player.id, 'isRepechaje', e.currentTarget?.checked)}
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

            {/* Sección de Votos del Repechaje */}
            <div className="mt-12 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold font-anton text-white">Votos del Repechaje</h3>
                    <button
                        onClick={fetchRepechajeVotes}
                        className="px-4 py-2 bg-electric-violet-500 text-white rounded font-rubik hover:bg-electric-violet-600 transition-colors"
                    >
                        Actualizar Votos
                    </button>
                </div>

                {repechajeVotes.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Gráfica de Pastel */}
                        <div className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-lg border border-neutral-800 shadow-lg">
                            <h4 className="text-xl font-bold text-white font-minecraftia mb-4">Distribución de Votos</h4>
                            <div className="h-80">
                                <Pie
                                    data={{
                                        labels: repechajeVotes.map(v => v.minecraft_username),
                                        datasets: [{
                                            data: repechajeVotes.map(v => v.voteCount),
                                            backgroundColor: [
                                                '#FF4444', '#FF6B44', '#FF9244', '#FFD144',
                                                '#44FF44', '#44FF92', '#44FFD1', '#44D1FF',
                                                '#4492FF', '#446BFF', '#4444FF', '#6B44FF'
                                            ],
                                            borderColor: '#ffffff',
                                            borderWidth: 2,
                                        }],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'bottom' as const,
                                                labels: {
                                                    color: '#ffffff',
                                                    font: {
                                                        size: 12
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                backgroundColor: '#1f2937',
                                                titleColor: '#ffffff',
                                                bodyColor: '#ffffff',
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Gráfica de Barras */}
                        <div className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-lg border border-neutral-800 shadow-lg">
                            <h4 className="text-xl font-bold text-white font-minecraftia mb-4">Votos por Jugador</h4>
                            <div className="h-80">
                                <Bar
                                    data={{
                                        labels: repechajeVotes.map(v => v.minecraft_username.length > 15 ? v.minecraft_username.substring(0, 15) + '...' : v.minecraft_username),
                                        datasets: [{
                                            label: 'Votos',
                                            data: repechajeVotes.map(v => v.voteCount),
                                            backgroundColor: '#FF4444',
                                            borderColor: '#ffffff',
                                            borderWidth: 1,
                                        }],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    color: '#ffffff',
                                                    stepSize: 1
                                                },
                                                grid: {
                                                    color: '#374151'
                                                }
                                            },
                                            x: {
                                                ticks: {
                                                    color: '#ffffff',
                                                    maxRotation: 45,
                                                    minRotation: 45
                                                },
                                                grid: {
                                                    color: '#374151'
                                                }
                                            }
                                        },
                                        plugins: {
                                            legend: {
                                                display: false
                                            },
                                            tooltip: {
                                                backgroundColor: '#1f2937',
                                                titleColor: '#ffffff',
                                                bodyColor: '#ffffff',
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-lg border border-neutral-800 shadow-lg text-center">
                        <p className="text-gray-300 font-rubik">No hay votos registrados aún.</p>
                    </div>
                )}

                {/* Lista detallada de votos */}
                {repechajeVotes.length > 0 && (
                    <div className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-lg border border-neutral-800 shadow-lg">
                        <h4 className="text-xl font-bold text-white font-minecraftia mb-4">Lista de Votos Detallada</h4>
                        <div className="space-y-3">
                            {repechajeVotes
                                .sort((a, b) => b.voteCount - a.voteCount)
                                .map((vote, index) => (
                                    <div key={vote.playerId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border border-neutral-700">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-[#FF4444] w-8">#{index + 1}</span>
                                            <div>
                                                <h5 className="font-semibold text-white font-minecraftia">{vote.minecraft_username}</h5>
                                                <p className="text-sm text-gray-300 font-rubik">{vote.discordUsername}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-[#FF4444]">{vote.voteCount}</span>
                                            <p className="text-sm text-gray-300">voto{vote.voteCount !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}