import { actions } from "astro:actions";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";

export const AutoEliminationOverlay = ({
    channel,
    pusher,
    players,
}: {
    channel: Channel;
    pusher: Pusher;
    players: {
        admin: boolean;
        id: string;
        avatar: string;
        displayName: string;
        playerNumber: number;
    }[];
}) => {
    const [eliminatedPlayers, setEliminatedPlayers] = useState<number[]>([]);
    const channelRef = useRef<Channel | null>(null);



    useEffect(() => {
        channelRef.current = pusher?.subscribe("auto-elimination");
        const handlePlayerAutoEliminated = (data: { playerNumber: number }) => {
            setEliminatedPlayers((prev) => {
                if (!prev.includes(data.playerNumber)) {
                    return [...prev, data.playerNumber];
                }
                return prev;
            });

        };

        actions.streamerWars.getAutoEliminatedPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }
            setEliminatedPlayers(data.autoEliminatedPlayers);
        });



        channelRef.current?.bind("player-autoeliminated", handlePlayerAutoEliminated);
        return () => {
            channelRef.current?.unbind("player-autoeliminated", handlePlayerAutoEliminated);
        };
    }, [pusher]);




    return (
        <div
            class="mt-16">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-lime-500 font-atomic mb-4">
                    Desafío #03
                </h1>
                <h2 className="text-xl font-medium text-white font-rubik mb-4">
                    Jugadores que aceptaron la oferta
                </h2>
                <div className="flex flex-col gap-4">
                    {eliminatedPlayers.map((playerNumber) => {
                        const player = players.find(
                            (p) => p.playerNumber === playerNumber
                        );
                        if (!player) return null;
                        return (
                            <div className="max-w-3xl w-full mx-auto bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm 
                            border border-gray-800 transition-all duration-300 hover:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={player.avatar}
                                        alt={player.displayName}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <div>
                                        <h2 className="text-xl font-medium text-white font-rubik">
                                            {player.displayName}
                                        </h2>
                                        <p className="text-gray-400">
                                            Jugador{" "}
                                            <span className="text-lime-500 font-atomic">
                                                #{playerNumber.toString().padStart(3, "0")}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
