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

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Jugadores</h1>
            <div class="grid grid-cols-3 gap-4">
                <pre>{JSON.stringify(players, null, 2)}</pre>
                {players.filter((player) => !player.admin).map((player) => (
                    <div class="flex flex-col items-center">
                        <img src={player.avatar} alt={player.name} class="w-16 h-16 rounded-full" />
                        <p class="text-sm mt-2">#{player.playerNumber.toString().padStart(3, "0")}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};