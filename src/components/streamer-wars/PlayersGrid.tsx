import { LucideX } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";

interface Player {
    playerNumber: number;
    playerName: string;
    playerAvatar: string;
    isEliminated: boolean;
}

export const PlayersGrid = ({ initialPlayers }: { initialPlayers: Player[] }) => {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);

    useEffect(() => {
        if (players.length === 0) {
            const jugadores = Array.from({ length: 50 }, (_, i) => ({
                playerNumber: i + 1,
                playerName: `Player ${i + 1}`,
                playerAvatar: `https://robohash.org/${i + 1}`,
                isEliminated: Math.random() < 0.5,
            }));
            setPlayers(jugadores);
        }
    }, [players]);

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-black to-gray-800">
            <div className="grid grid-cols-7 gap-x-9 gap-y-5">
                {players.map((jugador) => (
                    <button
                        key={jugador.playerNumber}
                        class={`relative size-[90px] bg-[#1a1a1a] border-2 border-[#333] rotate-45 flex items-center justify-center hover:border-white transition-transform ${jugador.isEliminated ? "opacity-70 cursor-not-allowed !bg-red-500/20" : ""
                            }
                        `}
                    >
                        <div className="transform -rotate-45 flex flex-col items-center relative">
                            <img
                                src={jugador.playerAvatar}
                                alt={jugador.playerName}
                                className="w-12 h-12 rounded-full border border-gray-600"
                            />
                            <p className="text-white text-xs mt-1">{`#${jugador.playerNumber
                                .toString()
                                .padStart(3, "0")}`}</p>

                            {
                                jugador.isEliminated && (
                                    <div className="text-5xl text-lime-500 absolute font-atomic inset-0 h-full w-full text-center ml-2 flex items-center justify-center">
                                        X
                                    </div>
                                )
                            }
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
