import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { getTranslation, TEAMS } from "@/consts/Teams";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideDot } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";

export const ButtonBox = ({ session, pusher, teamsQuantity, playersPerTeam }: { session: Session; pusher: Pusher; teamsQuantity: number; playersPerTeam: number }) => {
    const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[keyof typeof TEAMS] | null>(null);
    const [playersTeams, setPlayersTeams] = useState<{ [team: string]: { playerNumber: number; avatar: string; displayName: string, isCaptain: boolean }[] }>({});


    useEffect(() => {
        if (!selectedTeam) return;

        if (Object.keys(playersTeams).some((team) => playersTeams[team].some(({ playerNumber }) => playerNumber === session.user.streamerWarsPlayerNumber))) {
            toast.error("Ya estás unido a un equipo");
            return;
        }

        if (playersTeams[selectedTeam]?.length >= playersPerTeam) {
            toast.error("El equipo ya está lleno");
            return;
        }

        actions.streamerWars.joinTeam({ team: selectedTeam }).then(({ error, data }) => {
            if (error) {
                console.error(error);
                toast.warning(error.message)
                return;
            }
            toast.success("Te has unido al equipo correctamente");
        })
    }, [selectedTeam]);

    useEffect(() => {
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log(data);
            setPlayersTeams(data.playersTeams);
        })

        const channel = pusher.subscribe("streamer-wars");
        channel.bind("player-joined", () => {
            actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
                if (error) {
                    console.error(error);
                    return;
                }
                setPlayersTeams(data.playersTeams);
            })
        })

    }, []);

    const COLORS = [
        { team: TEAMS.BLUE, color: "#3498db", gradient: "from-blue-400 to-blue-600" },
        { team: TEAMS.RED, color: "#e74c3c", gradient: "from-red-400 to-red-600" },
        { team: TEAMS.YELLOW, color: "#f1c40f", gradient: "from-yellow-400 to-yellow-600" },
        { team: TEAMS.PURPLE, color: "#8e44ad", gradient: "from-purple-400 to-purple-600" },
        { team: TEAMS.WHITE, color: "#ecf0f1", gradient: "from-gray-100 to-gray-300" },
    ]

    return (
        <div class="flex flex-col items-center justify-center w-full space-y-6 mt-8">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.keys(playersTeams).map((team) => (
                        <div
                            key={team}
                            className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm 
                border border-gray-800 transition-all duration-300 hover:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white font-bold">{getTranslation(team)}</span>
                                <div className="flex items-center gap-2">
                                    <LucideDot
                                        className="animate-pulse"
                                        size={24}
                                        color={COLORS.find(({ team: t }) => t === team)?.color}
                                    />
                                    <span className="text-gray-400 text-sm">
                                        {playersTeams[team].length}/{playersPerTeam}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {playersTeams[team].map(({ avatar, displayName, playerNumber, isCaptain }) => (
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
