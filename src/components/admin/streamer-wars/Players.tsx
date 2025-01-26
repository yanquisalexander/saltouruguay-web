import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";

export const StreamerWarsPlayers = ({ pusher }: { pusher: Pusher }) => {
    /* 
        Uses presence channel to get the list of players

    */

    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        if (!pusher) return;

        const presenceChannel = pusher.subscribe("presence-streamer-wars");

        presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
            setPlayers(Object.values(members.members));
        });

        presenceChannel.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) => [...prev, member.info]);
        });

        presenceChannel.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) => prev.filter((p) => p.id !== member.info.id));
        });

        return () => {
            presenceChannel.unbind_all();
            presenceChannel.unsubscribe();
        };
    }, [pusher]);

    const eliminatePlayer = async (playerNumber: number) => {
        if (!confirm(`¿Estás seguro de eliminar al jugador #${playerNumber?.toString().padStart(3, "0")}?`)) return;
        return await actions.streamerWars.eliminatePlayer({ playerNumber });
    }

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Jugadores conectados</h1>
            <div class="grid grid-cols-3 gap-16">
                {players.filter((player) => player.admin).map((player) => (
                    <button
                        onClick={() => eliminatePlayer(player.playerNumber)}
                        class="flex flex-col items-center aspect-square hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4" key={player.id}>
                        <img src={player.avatar} alt={player.name} class="w-16 h-16 rounded-full" />
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                        <span class="text-md text-white">{player.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};