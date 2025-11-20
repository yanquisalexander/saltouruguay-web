import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCrown, LucideGamepad2, LucideUsers } from "lucide-preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";

type Player = {
    playerNumber: number;
    avatar: string;
    displayName: string;
    isCaptain: boolean;
};

const REFRESH_AFTER_EVENT_TIMEOUT = 2000;

// Configuración visual por equipo (Estilo Retro)
const TEAM_CONFIG: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    [TEAMS.BLUE]: { bg: "bg-blue-600", border: "border-blue-400", text: "text-blue-300", shadow: "shadow-blue-900" },
    [TEAMS.RED]: { bg: "bg-red-600", border: "border-red-400", text: "text-red-300", shadow: "shadow-red-900" },
    [TEAMS.YELLOW]: { bg: "bg-yellow-500", border: "border-yellow-200", text: "text-yellow-200", shadow: "shadow-yellow-800" },
    [TEAMS.PURPLE]: { bg: "bg-purple-600", border: "border-purple-400", text: "text-purple-300", shadow: "shadow-purple-900" },
    [TEAMS.WHITE]: { bg: "bg-gray-200", border: "border-white", text: "text-gray-600", shadow: "shadow-gray-600" },
};

export const TeamSelector = ({
    session,
    channel,
    teamsQuantity,
    playersPerTeam
}: {
    session: Session;
    channel: Channel;
    teamsQuantity: number;
    playersPerTeam: number
}) => {
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [playersTeams, setPlayersTeams] = useState<Record<string, Player[]>>({});

    // Refs para control de memoria y timeouts
    const refreshPlayersTimeout = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const refreshPlayersTeams = useCallback(() => {
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (!isMounted.current) return;
            if (error) return console.error(error);
            setPlayersTeams(data.playersTeams);
        });
    }, []);

    const scheduleRefresh = useCallback(() => {
        if (refreshPlayersTimeout.current) clearTimeout(refreshPlayersTimeout.current);
        refreshPlayersTimeout.current = setTimeout(refreshPlayersTeams, REFRESH_AFTER_EVENT_TIMEOUT);
    }, [refreshPlayersTeams]);

    // Lógica de Selección de Equipo
    useEffect(() => {
        if (!selectedTeam) return;

        // Validación Optimista
        const isAlreadyInTeam = Object.values(playersTeams).some(team =>
            team.some(({ playerNumber }) => playerNumber === session.user.streamerWarsPlayerNumber)
        );

        if (isAlreadyInTeam) {
            toast.error("ACCESS DENIED: Ya tienes equipo", { className: "font-press-start-2p text-xs" });
            setSelectedTeam(null);
            return;
        }

        const currentTeamCount = playersTeams[selectedTeam]?.length || 0;
        if (currentTeamCount >= playersPerTeam) {
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
            toast.error("TEAM FULL: Intenta otro equipo", { className: "font-press-start-2p text-xs" });
            setSelectedTeam(null);
            return;
        }

        // Actualización Optimista
        const optimisticPlayer = {
            playerNumber: session.user.streamerWarsPlayerNumber!,
            avatar: session.user.image || '',
            displayName: session.user.name || '',
            isCaptain: false
        };

        setPlayersTeams(prev => ({
            ...prev,
            [selectedTeam]: [...(prev[selectedTeam] || []), optimisticPlayer]
        }));

        // Llamada al servidor
        actions.streamerWars.joinTeam({ team: selectedTeam }).then(({ error }) => {
            if (!isMounted.current) return;

            if (error) {
                console.error(error);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
                toast.warning(error.message, { className: "font-press-start-2p text-xs" });

                // Revertir estado optimista
                setPlayersTeams(prev => ({
                    ...prev,
                    [selectedTeam]: (prev[selectedTeam] || []).filter(
                        player => player.playerNumber !== session.user.streamerWarsPlayerNumber
                    )
                }));
                setSelectedTeam(null);
            } else {
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION });
                toast.success("TEAM JOINED: ¡Buena suerte!", { className: "font-press-start-2p text-xs" });
            }
        });
    }, [selectedTeam]);

    // Suscripción a Eventos Pusher
    useEffect(() => {
        refreshPlayersTeams();

        const handlePlayerJoined = (player: Player & { team: string }) => {
            if (!isMounted.current) return;
            playSound({ sound: STREAMER_WARS_SOUNDS.POP });
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
            if (!isMounted.current) return;
            setPlayersTeams(prev => {
                const newState: Record<string, Player[]> = {};
                Object.keys(prev).forEach(key => {
                    newState[key] = prev[key].filter(p => p.playerNumber !== playerNumber);
                });
                return newState;
            });

            if (session.user.streamerWarsPlayerNumber === playerNumber) {
                setSelectedTeam(null);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
                toast.info("Has sido expulsado del equipo", { className: "font-press-start-2p text-xs" });
            }
            scheduleRefresh();
        };

        const handleCaptainAssigned = ({ team, playerNumber }: { team: string; playerNumber: number }) => {
            if (!isMounted.current) return;
            setPlayersTeams(prev => ({
                ...prev,
                [team]: (prev[team] || []).map(player => ({
                    ...player,
                    isCaptain: player.playerNumber === playerNumber
                }))
            }));

            if (session.user.streamerWarsPlayerNumber === playerNumber) {
                playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK });
                toast.success(`RANK UP: Eres el capitán`, { className: "font-press-start-2p text-xs" });
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

    return (
        <div className="flex flex-col items-center justify-start w-full min-h-screen p-4 space-y-8">
            <Instructions duration={15000}>
                <p class="font-mono max-w-2xl text-left">
                    Para unirte a un equipo, debes seleccionar uno de los botones de abajo. Una vez que te unas, no podrás cambiar de equipo.
                </p>
                <p class="font-mono max-w-2xl text-left">
                    Cada equipo tiene un máximo de {playersPerTeam} jugadores. Si un equipo ya está lleno, deberás unirte a otro.
                </p>
            </Instructions>

            <header className="text-center space-y-4 mt-4">
                <h1 className="text-2xl font-bold font-press-start-2p text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)] animate-pulse">
                    ELIGE TU EQUIPO
                </h1>
                <div className="h-1 w-full bg-gray-700 rounded-none" />
            </header>

            {/* Selector de Equipos (Botones Arcade) */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-4">
                {Object.keys(TEAMS).slice(0, teamsQuantity).map((teamKey) => {
                    const team = TEAMS[teamKey as keyof typeof TEAMS];
                    const config = TEAM_CONFIG[team] || TEAM_CONFIG[TEAMS.WHITE];
                    const currentPlayers = playersTeams[team]?.length || 0;
                    const isFull = currentPlayers >= playersPerTeam;

                    return (
                        <div key={team} className="flex flex-col items-center group relative">
                            {/* Badge de Full */}
                            {isFull && (
                                <div className="absolute -top-4 z-20 bg-red-500 text-white text-[10px] font-press-start-2p px-2 py-1 border-2 border-black transform rotate-6 shadow-[2px_2px_0_black]">
                                    FULL
                                </div>
                            )}

                            <button
                                disabled={isFull}
                                onClick={() => {
                                    playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK });
                                    setSelectedTeam(team);
                                }}
                                className={`
                                    relative w-24 h-24 md:w-32 md:h-32 transition-all duration-100
                                    border-4 border-black
                                    ${config.bg}
                                    shadow-[6px_6px_0_rgba(0,0,0,1)]
                                    active:shadow-[0_0_0_rgba(0,0,0,1)]
                                    active:translate-x-[6px] active:translate-y-[6px]
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-[6px_6px_0_rgba(0,0,0,1)]
                                    flex flex-col items-center justify-center gap-2
                                `}
                            >
                                <LucideGamepad2 className="w-8 h-8 md:w-10 md:h-10 text-white/80" strokeWidth={1.5} />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-white/10 transition-colors" />
                            </button>

                            <div className="mt-4 bg-black/80 text-white px-3 py-1 border border-white/20 shadow-[2px_2px_0_black]">
                                <span className="text-[10px] md:text-xs font-press-start-2p tracking-widest uppercase">
                                    {getTranslation(team)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Grid de Jugadores (Estilo Roster Retro) */}
            <div className="w-full max-w-7xl pt-12">
                <div className="flex items-center gap-4 mb-8">
                    <LucideUsers className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-xl font-press-start-2p text-white">ROSTER STATUS</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.values(TEAMS).slice(0, teamsQuantity).map((team) => {
                        const config = TEAM_CONFIG[team] || TEAM_CONFIG[TEAMS.WHITE];
                        const players = playersTeams[team] || [];

                        return (
                            <div
                                key={team}
                                className={`
                                    bg-gray-900 border-2 border-gray-700 relative overflow-hidden
                                    shadow-[4px_4px_0_black]
                                `}
                            >
                                {/* Header del Equipo */}
                                <div className={`
                                    ${config.bg} border-b-2 border-black p-3 flex justify-between items-center
                                `}>
                                    <span className="font-press-start-2p text-xs text-white uppercase drop-shadow-md">
                                        {getTranslation(team)}
                                    </span>
                                    <span className="font-mono font-bold text-white bg-black/30 px-2 py-1 text-xs rounded-sm">
                                        {players.length}/{playersPerTeam}
                                    </span>
                                </div>

                                {/* Lista de Jugadores */}
                                <div className="p-4 space-y-3 min-h-[150px]">
                                    {players.length === 0 && (
                                        <div className="h-full flex items-center justify-center opacity-30">
                                            <span className="font-press-start-2p text-[10px] text-white">EMPTY SLOT</span>
                                        </div>
                                    )}

                                    {players.map(({ playerNumber, avatar, displayName, isCaptain }) => (
                                        <div
                                            key={playerNumber}
                                            className="flex items-center gap-3 p-2 bg-black/40 border border-gray-700 hover:border-gray-500 transition-colors group"
                                        >
                                            <div className="relative shrink-0">
                                                <img
                                                    src={avatar || "/placeholder.svg"}
                                                    alt={displayName}
                                                    className="w-8 h-8 bg-gray-800 [image-rendering:pixelated]"
                                                />
                                                {isCaptain && (
                                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-0.5 border border-black shadow-sm z-10">
                                                        <LucideCrown size={10} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-bold truncate font-mono text-gray-200 group-hover:text-white`}>
                                                    {displayName}
                                                </span>
                                                <span className={`text-[10px] font-mono ${config.text}`}>
                                                    ID: {playerNumber.toString().padStart(3, "0")}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Scanlines decorativos */}
                                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};