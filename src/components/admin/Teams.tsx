import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { getTranslation, TEAMS } from "@/consts/Teams";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCrown, LucideDot, LucideX } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { toast } from "sonner";

export const Teams = ({ channel }: { channel: Channel }) => {
    const [playersTeams, setPlayersTeams] = useState<{ [team: string]: { playerNumber: number; avatar: string; displayName: string, isCaptain: boolean }[] }>({});

    const handleAssignCaptain = async (playerNumber: number, team: string) => {
        const { error } = await actions.streamerWars.setTeamCaptain({ playerNumber, team });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Capitán asignado correctamente");
    };

    const removeCaptain = async (team: string) => {
        const { error } = await actions.streamerWars.removeTeamCaptain({ team });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Capitán removido correctamente");
    };
    useEffect(() => {
        const fetchTeams = async () => {
            const { error, data } = await actions.streamerWars.getPlayersTeams();
            if (error) return console.error(error);
            setPlayersTeams(data.playersTeams);
        };

        fetchTeams();

        channel?.bind("player-joined", fetchTeams);
        channel?.bind("captain-assigned", fetchTeams);

        return () => {
            channel?.unbind("player-joined", fetchTeams);
            channel?.unbind("captain-assigned", fetchTeams);
        };
    }, []);

    const COLORS = [
        { team: TEAMS.BLUE, color: "#3498db", gradient: "from-blue-400 to-blue-600" },
        { team: TEAMS.RED, color: "#e74c3c", gradient: "from-red-400 to-red-600" },
        { team: TEAMS.YELLOW, color: "#f1c40f", gradient: "from-yellow-400 to-yellow-600" },
        { team: TEAMS.PURPLE, color: "#8e44ad", gradient: "from-purple-400 to-purple-600" },
        { team: TEAMS.WHITE, color: "#ecf0f1", gradient: "from-gray-100 to-gray-300" },
    ];

    return (
        <div className="w-full max-w-6xl pt-16">
            <header className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                    Jugadores por equipo
                </h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                {Object.values(TEAMS).map((team) => (
                    <div
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

                            </div>
                        </div>
                        <div className="space-y-3">
                            {playersTeams[team]?.map(({ playerNumber, avatar, displayName, isCaptain }) => {
                                return (
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

                                        {isCaptain ? (
                                            <div className="flex items-center gap-1 ml-auto">
                                                <span
                                                    title={`Capitán del equipo ${getTranslation(team)}`}
                                                    className="bg-lime-500 text-black font-bold text-xs px-1 rounded-tr-lg rounded-bl-lg">
                                                    <LucideCrown size={16} />
                                                </span>
                                                <button
                                                    onClick={() => removeCaptain(team)}
                                                    className="px-2 py-1 bg-red-500 rounded-md text-xs
                                            hover:bg-red-600 transition-colors"
                                                    title="Remover capitán"
                                                >
                                                    <LucideX size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAssignCaptain(playerNumber, team)}
                                                className="ml-auto px-2 py-1 bg-gray-700 rounded-md text-xs
                                            hover:bg-gray-600 transition-colors"
                                                title="Asignar como capitán"
                                            >
                                                ⭐
                                            </button>
                                        )}

                                        <span className="font-atomic text-lime-500 text-2xl">
                                            #{playerNumber.toString().padStart(3, "0")}
                                        </span>
                                    </div>
                                )
                            }
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}