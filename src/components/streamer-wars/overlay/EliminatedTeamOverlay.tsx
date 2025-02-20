import { getTranslation } from "@/utils/translate";
import { useEffect, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";
import { actions } from "astro:actions";
import { LucideCrown } from "lucide-preact";

interface Player {
    playerNumber: number;
    avatar: string;
    displayName: string;
    isCaptain: boolean;
}

interface Teams {
    [team: string]: Player[];
}

export const EliminatedTeamOverlay = ({
    channel,
    pusher,
}: {
    channel: Channel;
    pusher: Pusher;
}) => {
    const [eliminatedTeam, setEliminatedTeam] = useState<string | null>(null);
    const [showing, setShowing] = useState<boolean>(false);
    const [playersTeams, setPlayersTeams] = useState<Teams>({});

    // Se obtienen los equipos y jugadores al montar el componente
    useEffect(() => {
        const fetchTeams = async () => {
            const { error, data } = await actions.streamerWars.getPlayersTeams();
            if (error) {
                console.error("Error fetching player teams:", error);
                return;
            }
            setPlayersTeams(data.playersTeams);
        };
        fetchTeams();
    }, []);

    // Escucha el evento "bribe-accepted" para activar el overlay
    useEffect(() => {
        const handleBribeAccepted = ({ team }: { team: string }) => {
            console.log("Bribe accepted", team);
            setEliminatedTeam(team);
            setShowing(true);
            // Después de 10 segundos, inicia el fade-out del mensaje
            setTimeout(() => {
                setShowing(false);
            }, 10000);
        };

        channel?.bind("bribe-accepted", handleBribeAccepted);
        return () => {
            channel?.unbind("bribe-accepted", handleBribeAccepted);
        };
    }, []);

    return (
        <>
            {/* Banner superior siempre visible */}
            <div class="fixed font-squids bg-gradient-to-r from-lime-500 to-lime-400 text-black text-2xl text-center w-full py-2">
                Soborno al capitan
            </div>

            {/* Panel persistente: muestra siempre la lista de equipos */}
            <div className="p-4 pt-16">
                {/* Encabezado con mensaje de espera o nombre del equipo eliminado */}
                <h2 className="text-2xl font-medium text-center text-white animate-pulse animate-iteration-count-infinite animate-duration-[3000ms] mb-4">
                    {eliminatedTeam
                        ? getTranslation(eliminatedTeam)
                        : "Esperando que se acepte un soborno..."}
                </h2>
                {Object.keys(playersTeams).length === 0 ? (
                    <h2 className="text-2xl font-medium text-center text-white animate-pulse animate-iteration-count-infinite animate-duration-1000 mb-4">
                        Cargando equipos...
                    </h2>
                ) : (
                    <div class={"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"}>
                        {
                            Object.entries(playersTeams).map(([team, teamPlayers]) => {
                                const captain = teamPlayers.find((player) => player.isCaptain);
                                return (
                                    <div key={team} className="mb-8">
                                        <h2 className="text-2xl font-medium text-center text-white mb-4">
                                            {getTranslation(team)}
                                        </h2>
                                        {captain && (
                                            <div className="relative mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={captain.avatar || "/placeholder.svg"}
                                                        alt={`${captain.displayName}'s avatar`}
                                                        className="w-12 h-12 rounded-full ring-2 ring-white/20"
                                                    />
                                                    <div>
                                                        <p className="text-white font-bold">
                                                            {captain.displayName}
                                                        </p>
                                                        <p className="text-lime-500 font-atomic text-xl">
                                                            #{captain.playerNumber.toString().padStart(3, "0")}
                                                        </p>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <span
                                                            title={`Capitán del equipo ${getTranslation(team)}`}
                                                            className="bg-lime-500 text-black font-bold text-xs px-2 rounded-tr-lg rounded-bl-lg"
                                                        >
                                                            <LucideCrown size={16} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-5 gap-4">
                                            {teamPlayers.filter((player) => !player.isCaptain).map(({ displayName, avatar, playerNumber }) => (
                                                <div
                                                    key={displayName}
                                                    className="flex relative flex-col justify-center items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                                                >
                                                    <img
                                                        src={avatar || "/placeholder.svg"}
                                                        alt={`${displayName}'s avatar`}
                                                        className="size-8 rounded-full ring-2 ring-white/20"
                                                    />


                                                    <span className="font-atomic text-lime-500 text-xl">
                                                        #{playerNumber.toString().padStart(3, "0")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                )}
            </div>

            {/* Overlay del mensaje con efecto fade in/out (solo se activa al aceptar el soborno) */}
            {eliminatedTeam && (
                <div
                    className={`fixed inset-0 bg-black bg-opacity-100 flex flex-col items-center justify-center z-50 transition-all animate-duration-[2500ms] ${showing ? "animate-fade-in" : "animate-fade-out pointer-events-none"}`}
                >
                    <span
                        class="relative flex flex-col justify-center text-center animate-duration-[4000ms] animate-scale">
                        <span class="font-squids  text-lg text-center mb-8 font-bold text-neutral-400">
                            Gracias por participar
                        </span>
                        <div class="relative">
                            <h2 class="text-6xl font-bold font-atomic text-red-500 -rotate-6 skew-x-12">
                                Equipo eliminado
                            </h2>
                            <span class="absolute -bottom-14 text-red-500 inset-x-0 text-7xl font-bold font-atomic-extras -rotate-6 skew-x-12">
                                a
                            </span>
                        </div>
                        <p class="text-3xl font-teko pt-16 text-center text-white">
                            El equipo <span class="font-bold">{getTranslation(eliminatedTeam)}</span> ha sido eliminado
                        </p>
                    </span>

                    <div class="flex gap-x-6">
                        {
                            /* Muestra todos los jugadores del equipo en una fila */

                            playersTeams[eliminatedTeam]?.map((player) => (
                                <div class="flex flex-col items-center gap-4 mt-8">
                                    <img
                                        src={player.avatar || "/placeholder.svg"}
                                        alt={`${player.displayName}'s avatar`}
                                        class="w-12 h-12 rounded-full ring-2 ring-white/20"
                                    />
                                    <div>

                                        <p class="text-lime-500 font-atomic text-xl">
                                            #{player.playerNumber.toString().padStart(3, "0")}
                                        </p>
                                    </div>
                                </div>
                            ))

                        }
                    </div>
                </div>
            )}
        </>
    );
};
