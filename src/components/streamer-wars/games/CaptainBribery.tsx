import { actions } from "astro:actions";
import { useEffect, useState, useRef } from "preact/hooks";
import { Instructions } from "../Instructions";
import type { Session } from "@auth/core/types";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { getTranslation } from "@/utils/translate";
import { LucideCrown } from "lucide-preact";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface Props {
    session: Session;
    players: any[];
    pusher: Pusher;
    channel: Channel;
}

export const CaptainBribery = ({ session, players, pusher, channel }: Props) => {
    const [playersTeams, setPlayersTeams] = useState<{
        [team: string]: {
            playerNumber: number;
            avatar: string;
            displayName: string;
            isCaptain: boolean;
        }[]
    }>({});
    const [briberyAccepted, setBriberyAccepted] = useState<{ team: string } | null>(null);

    useEffect(() => {
        const getPlayersTeams = async () => {
            try {
                const { error, data } = await actions.streamerWars.getPlayersTeams();
                if (error) throw error;
                setPlayersTeams(data.playersTeams);
            } catch (err) {
                console.error("Error fetching player teams:", err);
                toast.error("Error al cargar los equipos");
            }
        };
        getPlayersTeams();
    }, []);

    // Obtener equipo actual del usuario con optional chaining
    const currentUserTeam = Object.values(playersTeams).find(team =>
        team.some(player => player.playerNumber === session?.user?.streamerWarsPlayerNumber)
    ) || [];

    const currentUserTeamName = Object.entries(playersTeams).find(
        ([_, players]) => players.some(player =>
            player.playerNumber === session?.user?.streamerWarsPlayerNumber
        )
    )?.[0] || "?";

    // Usar some en lugar de find para boolean
    const currentUserIsCaptain = currentUserTeam.some(player =>
        player.isCaptain && player.playerNumber === session?.user?.streamerWarsPlayerNumber
    );

    const handleAcceptBribe = async () => {
        try {
            const { error } = await actions.streamerWars.acceptBribe();
            if (error) throw error;
        } catch (err) {
            console.error(err);
            toast.error("Error al aceptar el soborno");
        }
    };

    // Usar ref para latest team name en event handlers
    const currentTeamRef = useRef(currentUserTeamName);
    currentTeamRef.current = currentUserTeamName;

    useEffect(() => {
        const handler = ({ team }: { team: string }) => {
            const isMyTeamLost = team === currentTeamRef.current;

            setBriberyAccepted({ team });

            if (!isMyTeamLost) {
                playSound({ sound: STREAMER_WARS_SOUNDS.WIN_BRIBE, volume: 0.5 });
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                toast.success(`El capitán del equipo "${getTranslation(team)}" ha aceptado el soborno. ¡Tu equipo está a salvo!`);
                return;
            }

            playSound({ sound: STREAMER_WARS_SOUNDS.LOSED_BRIBE, volume: 0.5 });
            toast.warning("Tu capitán ha aceptado el soborno. Tu equipo ha sido eliminado del juego.");
        };

        channel.bind("bribe-accepted", handler);
        return () => channel.unbind("bribe-accepted", handler);
    }, [channel]);

    return (
        <>
            <Instructions duration={15000}>
                <p className="font-mono max-w-2xl text-left">
                    <strong>Capitán:</strong> Recibirás varias ofertas de soborno por parte de los auspiciantes.
                    Si aceptas una oferta, recibirás la cantidad de dinero que se te ofrece, pero <strong>tú y tu equipo serán eliminados del juego</strong>.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    <strong>Jugadores:</strong> Su capitán recibirá ofertas de soborno. Tu única esperanza es que tu capitán sea leal y no acepte ninguna oferta.
                </p>
            </Instructions>

            {Object.keys(playersTeams).length === 0 ? (
                <div className="text-center">
                    <p>Cargando...</p>
                </div>
            ) : (
                <div class="flex flex-col items-center mt-16">
                    <h2 class="text-xl font-anton mb-4">Soborno al capitán</h2>

                    {briberyAccepted ? (
                        <p class="text-center max-w-[65ch]">
                            {currentUserTeamName === briberyAccepted.team ? (
                                currentUserIsCaptain ? (
                                    <span>Has aceptado el soborno.<br />Recibirás la cantidad ofrecida, pero tu equipo será eliminado.</span>
                                ) : (
                                    "Tu capitán aceptó el soborno. Equipo eliminado."
                                )
                            ) : (
                                <span>El capitán del equipo "{getTranslation(briberyAccepted.team)}" aceptó el soborno.<br />Tu equipo está a salvo 🎉... por ahora</span>
                            )}
                        </p>
                    ) : (
                        <>
                            {currentUserIsCaptain && (
                                <div class="flex flex-col items-center gap-4">
                                    <p>Eres el capitán del equipo {getTranslation(currentUserTeamName)}</p>
                                    <button
                                        class="size-48 font-rubik rounded-full bg-lime-500 hover:bg-lime-600 hover:scale-110 transition font-medium text-black text-lg px-4 py-2 mt-8"
                                        onClick={handleAcceptBribe}
                                    >
                                        Aceptar soborno
                                    </button>
                                </div>
                            )}

                            {!currentUserIsCaptain && (
                                <p>Esperando decisión de tu capitán...</p>
                            )}

                            <div class="flex flex-wrap justify-center mt-8">
                                {Object.keys(playersTeams).map(team => (
                                    team !== currentUserTeamName ? null :
                                        <div
                                            key={team}
                                            className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm 
                border border-gray-800 transition-all duration-300 hover:border-gray-700"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-white font-rubik font-medium text-sm">
                                                    Tu equipo: {getTranslation(team)}
                                                </span>
                                                <div className="flex items-center gap-2">


                                                </div>
                                            </div>
                                            <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                        </>
                    )}
                </div>
            )}
        </>
    );
};
