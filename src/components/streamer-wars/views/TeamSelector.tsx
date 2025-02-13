import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCrown, LucideDot } from "lucide-preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";

type Player = {
    playerNumber: number;
    avatar: string;
    displayName: string;
    isCaptain: boolean;
};

const REFRESH_AFTER_EVENT_TIMEOUT = 2000;

export const TeamSelector = ({ session, channel, teamsQuantity, playersPerTeam }: { session: Session; channel: Channel; teamsQuantity: number; playersPerTeam: number }) => {
    const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[keyof typeof TEAMS] | null>(null);
    const [playersTeams, setPlayersTeams] = useState<Record<string, Player[]>>({});
    const refreshPlayersTimeout = useRef<NodeJS.Timeout | null>(null);

    const refreshPlayersTeams = useCallback(() => {
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (error) return console.error(error);
            setPlayersTeams(data.playersTeams);
        });
    }, []);

    const scheduleRefresh = useCallback(() => {
        if (refreshPlayersTimeout.current) clearTimeout(refreshPlayersTimeout.current);
        refreshPlayersTimeout.current = setTimeout(refreshPlayersTeams, REFRESH_AFTER_EVENT_TIMEOUT);
    }, [refreshPlayersTeams]);

    useEffect(() => {
        if (!selectedTeam) return;

        const isAlreadyInTeam = Object.values(playersTeams).some(team =>
            team.some(({ playerNumber }) => playerNumber === session.user.streamerWarsPlayerNumber)
        );

        if (isAlreadyInTeam) {
            toast.error("Ya estás unido a un equipo");
            return;
        }

        if (playersTeams[selectedTeam]?.length >= playersPerTeam) {
            toast.error("El equipo ya está lleno");
            return;
        }

        // Agregar jugador localmente antes de confirmar con el backend
        setPlayersTeams(prev => ({
            ...prev,
            [selectedTeam]: [
                ...(prev[selectedTeam] || []),
                {
                    playerNumber: session.user.streamerWarsPlayerNumber!,
                    avatar: session.user.image || '',
                    displayName: session.user.name || '',
                    isCaptain: false
                }
            ]
        }));

        actions.streamerWars.joinTeam({ team: selectedTeam }).then(({ error }) => {
            if (error) {
                console.error(error);
                toast.warning(error.message);
                setPlayersTeams(prev => ({
                    ...prev,
                    [selectedTeam]: (prev[selectedTeam] || []).filter(
                        player => player.playerNumber !== session.user.streamerWarsPlayerNumber
                    )
                }));
                return;
            }
            toast.success("Te has unido al equipo correctamente");
        });
    }, [selectedTeam]);

    useEffect(() => {
        refreshPlayersTeams();

        const handlePlayerJoined = (player: Player & { team: string }) => {
            setPlayersTeams(prev => ({
                ...prev,
                [player.team]: [
                    ...(prev[player.team] || []).filter(p => p.playerNumber !== player.playerNumber),
                    { ...player, isCaptain: player.isCaptain ?? false }
                ]
            }));
            scheduleRefresh();
        };

        const handlePlayerRemoved = ({ playerNumber }: { playerNumber: number }) => {
            setPlayersTeams(prev => {
                const team = Object.keys(prev).find(team => prev[team].some(p => p.playerNumber === playerNumber));
                if (!team) return prev;

                return { ...prev, [team]: prev[team].filter(p => p.playerNumber !== playerNumber) };
            });

            if (session.user.streamerWarsPlayerNumber === playerNumber) {
                setSelectedTeam(null);
                toast.success("Un administrador te ha removido del equipo");
            }
            scheduleRefresh();
        };

        const handleCaptainAssigned = ({ team, playerNumber }: { team: string; playerNumber: number }) => {
            setPlayersTeams(prev => ({
                ...prev,
                [team]: prev[team]?.map(player => ({
                    ...player,
                    isCaptain: player.playerNumber === playerNumber
                })) ?? []
            }));

            if (session.user.streamerWarsPlayerNumber === playerNumber) {
                playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK });
                toast.success(`Has sido nombrado capitán del equipo ${getTranslation(team)}`);
            }
            scheduleRefresh();
        };

        channel.bind("player-joined", handlePlayerJoined);
        channel.bind("player-removed", handlePlayerRemoved);
        channel.bind("captain-assigned", handleCaptainAssigned);

        return () => {
            channel.unbind("player-joined", handlePlayerJoined);
            channel.unbind("player-removed", handlePlayerRemoved);
            channel.unbind("captain-assigned", handleCaptainAssigned);
        };
    }, [refreshPlayersTeams, scheduleRefresh]);


    const COLORS = [
        { team: TEAMS.BLUE, color: "#3498db", gradient: "from-blue-400 to-blue-600" },
        { team: TEAMS.RED, color: "#e74c3c", gradient: "from-red-400 to-red-600" },
        { team: TEAMS.YELLOW, color: "#f1c40f", gradient: "from-yellow-400 to-yellow-600" },
        { team: TEAMS.PURPLE, color: "#8e44ad", gradient: "from-purple-400 to-purple-600" },
        { team: TEAMS.WHITE, color: "#ecf0f1", gradient: "from-gray-100 to-gray-300" },
    ]

    return (
        <div class="flex flex-col items-center justify-center w-full space-y-6 mt-8">
            <Instructions duration={15000}>
                <p class="font-mono max-w-2xl text-left">
                    Para unirte a un equipo, debes seleccionar uno de los botones de abajo. Una vez que te unas, no podrás cambiar de equipo.
                </p>
                <p class="font-mono max-w-2xl text-left">
                    Cada equipo tiene un máximo de {playersPerTeam} jugadores. Si un equipo ya está lleno, deberás unirte a otro.
                </p>
            </Instructions>
            {/* Botonera de Equipos */}
            <header className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                    Selecciona un equipo
                </h1>
            </header>
            <div className="flex flex-wrap items-center justify-center gap-6">
                {COLORS.slice(0, teamsQuantity).map(({ team, color, gradient }) => (
                    <div key={team} className="flex flex-col items-center group">
                        <button
                            className={`relative w-24 h-24 rounded-full transform transition-all duration-300 
                hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 
                focus:ring-offset-gray-900`}
                            onClick={() => {
                                playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK })
                                setSelectedTeam(team)
                            }}
                        >
                            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} 
                transition-all duration-300 group-hover:opacity-90`} />
                            <div className="absolute inset-0 rounded-full bg-black opacity-0 
                group-hover:opacity-10 transition-opacity duration-300" />
                            <span className="sr-only">{`Unirse al equipo ${getTranslation(team)}`}</span>
                        </button>
                        <span className="mt-3 text-white text-sm font-medium tracking-wide">
                            {getTranslation(team)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Team Players */}
            <div className="w-full max-w-6xl pt-16">
                <header className="text-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                        Jugadores por equipo
                    </h2>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                    {Object.values(TEAMS).slice(0, teamsQuantity).map((team) => (
                        <div
                            key={team}
                            className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm 
                border border-gray-800 transition-all duration-300 hover:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white font-bold">{getTranslation(team)}</span>
                                <div className="flex items-center gap-2">
                                    <LucideDot
                                        className="animate-pulse size-12"
                                        color={COLORS.find(({ team: t }) => t === team)?.color}
                                    />
                                    <span className="text-gray-400 text-sm">
                                        {playersTeams[team]?.length || 0} / {playersPerTeam}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {playersTeams[team]?.map(({ playerNumber, avatar, displayName, isCaptain }) => (
                                    <div
                                        key={displayName}
                                        className="flex items-center gap-3 p-2 rounded-lg 
                      bg-gray-800/50 transition-all duration-300 hover:bg-gray-800/70"
                                    >
                                        <img
                                            src={avatar || "/placeholder.svg"}
                                            alt={`${displayName}'s avatar`}
                                            className="w-8 h-8 rounded-full ring-2 ring-white/20"
                                        />

                                        <span className="text-white text-sm font-medium truncate">{displayName}</span>
                                        {isCaptain && (
                                            <span
                                                title={`#${playerNumber.toString().padStart(3, "0")} - Capitán del equipo ${getTranslation(team)}`}
                                                className=" bg-lime-500 text-black font-bold text-xs px-1 rounded-tr-lg rounded-bl-lg">
                                                <LucideCrown size={16} />
                                            </span>
                                        )}
                                        <span class="font-atomic text-lime-500 text-2xl ml-auto">
                                            #{playerNumber.toString().padStart(3, "0")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
