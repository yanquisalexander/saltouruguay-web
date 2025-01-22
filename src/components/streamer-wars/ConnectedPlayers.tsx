import { useState } from "preact/hooks";
import type Pusher from "pusher-js";

export const ConnectedPlayers = ({ players }: { players: any[] }) => {

    return (
        <div class="flex flex-col gap-2">
            {players.map((player) => (
                <div class="flex items-center gap-2">
                    <img
                        src={player.avatar}
                        alt={player.name}
                        class="w-8 h-8 rounded-full"
                    />
                    <span class="text-white
                        text-sm font-medium font-rubik">
                        {player.name}
                    </span>
                </div>
            ))}
        </div>
    );
}
