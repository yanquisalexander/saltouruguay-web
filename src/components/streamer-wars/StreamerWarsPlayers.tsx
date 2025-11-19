import { useState } from "preact/hooks";
import type { Players } from "../admin/streamer-wars/Players";

export const StreamerWarsPlayers = ({ players }: { players: Players[] }) => {

    if (players.length === 0) {
        return null;
    }

    const multiplyArray = (arr: Players[], times: number) => {
        return Array.from({ length: times }, () => arr).flat();
    }

    return (
        <div>
            <div class="flex flex-col items-center">
                <h3 class="text-xl tracking-widest flex w-full justify-center mb-2 font-squids text-zinc-300">
                    Jugadores
                </h3>

                <div class={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(15,_minmax(0,_1fr))]`}>
                    {
                        multiplyArray(players, 50).map((player, index) => (
                            <div
                                key={index}
                                title={`Jugador #${player.playerNumber} - ${player.displayName}`}
                                class={`flex flex-col select-none relative overflow-hidden items-center hover:scale-105 hover:bg-lime-500/20 transition ${player.eliminated ? "pointer-events-none" : ""
                                    }`}                                >
                                <div class="relative size-20">
                                    <img src={player.avatar} alt={player.displayName} class={`w-full h-full ${!player.online ? "grayscale brightness-50" : ""} ${player.eliminated ? "opacity-40 !grayscale" : ""}`} />
                                    {
                                        player.eliminated && (<div class="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span class="text-red-600 font-atomic text-5xl">X</span>
                                        </div>)
                                    }
                                </div>
                                <p class="text-2xl text-lime-400  font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                            </div>
                        ))

                    }

                </div>




            </div>
        </div>
    )





}
