import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import { LucideCrown, LucideDot } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";
import { actions } from "astro:actions";

const COLORS = [
    { team: TEAMS.BLUE, color: "#3498db" },
    { team: TEAMS.RED, color: "#e74c3c" },
    { team: TEAMS.YELLOW, color: "#f1c40f" },
    { team: TEAMS.PURPLE, color: "#8e44ad" },
    { team: TEAMS.WHITE, color: "#ecf0f1" },
];

export const TeamSelectorOverlay = ({
    channel,
    players,
    pusher,
    teamsQuantity,
}: {
    channel: Channel;
    players: any[];
    pusher: Pusher;
    teamsQuantity?: number;
}) => {
    const [playersTeams, setPlayersTeams] = useState<Record<string, any[]>>({});

    useEffect(() => {
        // Función para actualizar los equipos
        const fetchTeams = async () => {
            const { error, data } = await actions.streamerWars.getPlayersTeams();
            if (error) return console.error(error);
            setPlayersTeams(data.playersTeams);
        };

        // Obtener datos al montar el componente
        fetchTeams();

        // Actualizar en tiempo real según los eventos de Pusher
        channel?.bind("player-joined", fetchTeams);
        channel?.bind("player-removed", fetchTeams);
        channel?.bind("captain-assigned", fetchTeams);

        return () => {
            channel?.unbind("player-joined", fetchTeams);
            channel?.unbind("player-removed", fetchTeams);
            channel?.unbind("captain-assigned", fetchTeams);
        };
    }, [channel]);

    return (
        <div className="mx-auto w-full max-w-6xl pt-16">
            <header className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                    Jugadores por equipo
                </h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {Object.values(TEAMS).slice(0, teamsQuantity).map((team) => (
                    <div
                        key={team}
                        className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm border border-gray-800"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white font-bold">
                                {getTranslation(team)}
                            </span>
                            <LucideDot
                                className="animate-pulse size-12"
                                color={COLORS.find(({ team: t }) => t === team)?.color}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {playersTeams[team]?.map(
                                ({ playerNumber, avatar, displayName, isCaptain }) => (
                                    <div
                                        key={displayName}
                                        className="flex relative flex-col justify-center items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                                    >
                                        <img
                                            src={avatar || "/placeholder.svg"}
                                            alt={`${displayName}'s avatar`}
                                            className="size-8 rounded-full ring-2 ring-white/20"
                                        />

                                        {isCaptain && (
                                            <span
                                                title={`Capitán del equipo ${getTranslation(team)}`}
                                                className="bg-lime-500 text-black font-bold text-xs px-1 rounded-tr-lg rounded-bl-lg absolute top-0 right-0"
                                            >
                                                <LucideCrown size={16} />
                                            </span>
                                        )}
                                        <span className="font-atomic text-lime-500 text-xl">
                                            #{playerNumber.toString().padStart(3, "0")}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
