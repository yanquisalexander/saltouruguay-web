import { useState } from "preact/hooks";
import type { Players } from "../admin/streamer-wars/Players";

export const ConnectedPlayers = ({ players }: { players: Players[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (players.length === 0) {
        return null;
    }

    return (
        <div>
            <div class="flex flex-col items-center">
                <h3 class="text-xl tracking-widest flex w-full justify-center mb-2 font-atomic text-zinc-300">
                    Jugadores conectados
                </h3>

                <div class="flex group">
                    {
                        isExpanded ? (
                            players.filter((player) => !player.eliminated && player.online).map((player, index) => (
                                <div
                                    key={index}
                                    title={`Jugador #${player.playerNumber} - ${player.displayName}`}
                                    class={`flex flex-col relative overflow-hidden items-center  hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4 ${player.eliminated ? "pointer-events-none" : ""
                                        }`}                                >
                                    <div class="relative size-16 rounded-full">
                                        <img src={player.avatar} alt={player.displayName} class="w-full h-full rounded-full" />
                                        {player.online && (
                                            <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                                        )}
                                    </div>
                                    <p class="text-2xl text-lime-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                                    <span class="text-md text-white">{player.displayName}</span>
                                </div>
                            ))
                        ) : (
                            players
                                .filter((player) => !player.eliminated && player.online)
                                .slice(0, 5).map((player, index) => (
                                    <div
                                        key={index}
                                        class={`relative transition-all duration-300 ${index !== 0 ? "-ml-4" : ""
                                            }`}
                                    >
                                        <img
                                            src={player.avatar}
                                            alt={player.displayName}
                                            class="w-8 h-8 rounded-full border border-dashed"
                                        />
                                    </div>
                                ))
                        )
                    }

                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    class="text-zinc-300 mt-4 font-teko text-lg tracking-widest uppercase flex items-center space-x-2"
                >
                    <span>
                        {isExpanded ? "Ocultar" : "Mostrar"} jugadores
                    </span>
                    <span class="animate-pulse">
                        {isExpanded ? "🔽" : "🔼"}
                    </span>
                </button>


            </div>
        </div>
    )





}
