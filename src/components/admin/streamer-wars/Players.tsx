import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Teams } from "../Teams";

export const StreamerWarsPlayers = ({ pusher }: { pusher: Pusher }) => {
    const [players, setPlayers] = useState<
        { id?: number; playerNumber: number; displayName: string; avatar: string; admin: boolean; online: boolean; eliminated: boolean }[]
    >([]);

    const globalChannel = pusher.subscribe("streamer-wars");

    useEffect(() => {
        if (!pusher) return;

        const presenceChannel = pusher.subscribe("presence-streamer-wars");

        presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
            const onlinePlayers = Object.values(members.members).map((member: any) => ({
                ...member,
                displayName: member.name,
                online: true,
            }));

            setPlayers((prev) =>
                prev.map((player) => ({
                    ...player,
                    online: onlinePlayers.some((p) => p.id === player.id),
                }))
            );
        });

        presenceChannel.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: true } : player))
            );
        });

        presenceChannel.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: false } : player))
            );
        });

        pusher?.channel('streamer-wars').bind('player-eliminated', ({ playerNumber }: { playerNumber: number }) => {
            toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} eliminado`, {
                className: "bg-red-500",
            })
            playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.08 });
            setPlayers((prev) =>
                prev.map((player) => (player.playerNumber === playerNumber ? { ...player, eliminated: true } : player))
            );
        });

        return () => {
            presenceChannel.unbind_all();
            presenceChannel.unsubscribe();
        };
    }, [pusher]);

    useEffect(() => {
        actions.streamerWars.getPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }

            setPlayers((prev) => {
                const mergedPlayers = [...prev];

                data.players.forEach((player: any) => {
                    if (!mergedPlayers.some((p) => p.id === player.id)) {
                        mergedPlayers.push({
                            ...player,
                            displayName: player.displayName || player.name || '',
                            avatar: player.avatar || '',
                            admin: player.admin || false,
                            online: false,
                            eliminated: player.eliminated || false,
                        });
                    }
                });

                return mergedPlayers;
            });
        });
    }, []);



    const eliminatePlayer = async (playerNumber: number) => {
        if (!confirm(`¿Estás seguro de eliminar al jugador #${playerNumber?.toString().padStart(3, "0")}?`)) return;

        const response = await actions.streamerWars.eliminatePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }
    };

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Jugadores</h1>
            <div class="grid grid-cols-5 gap-16">
                {players.map((player) => (
                    <button
                        onClick={() => eliminatePlayer(player.playerNumber)}
                        class={`flex flex-col relative overflow-hidden items-center  hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4 ${player.eliminated ? "pointer-events-none" : ""
                            }`}
                        key={player.id}
                    >
                        <div class="relative size-16 rounded-full">
                            <img src={player.avatar} alt={player.displayName} class="w-full h-full rounded-full" />
                            {player.online && (
                                <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                            )}
                        </div>
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                        <span class="text-md text-white">{player.displayName}</span>
                        {
                            player.eliminated && <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-red-500 font-bold">
                                <span class="font-atomic text-2xl -rotate-45">
                                    ELIMINADO
                                </span>
                            </div>
                        }
                    </button>
                ))}
            </div>

            <Teams channel={globalChannel} />
        </div>
    );
};
