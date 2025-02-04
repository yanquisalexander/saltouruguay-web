import type { SimonSaysGameState } from "@/utils/streamer-wars";
import type { Session } from "@auth/core/types";
import { LucideCircleDotDashed } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";

export const SimonSays = ({
    session,
    onMissedPattern,
    initialGameState,
}: {
    session: Session;
    onMissedPattern: () => void;
    initialGameState?: SimonSaysGameState;
}) => {
    const colors = ["red", "blue", "green", "yellow"] as const;
    const [gameState, setGameState] = useState<SimonSaysGameState>(initialGameState || {
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        failedPlayers: []
    });
    const [playerPattern, setPlayerPattern] = useState<typeof colors[number][]>([]);
    const [activeButton, setActiveButton] = useState<typeof colors[number] | null>(null);
    const [waitingForPattern, setWaitingForPattern] = useState(false);

    const handlePlayerInput = async (color: typeof colors[number]) => {
        if (waitingForPattern) return;
        const updatedPattern = [...playerPattern, color];
        setPlayerPattern(updatedPattern);

        if (color === gameState.pattern[updatedPattern.length - 1]) {
            if (updatedPattern.length === gameState.pattern.length) {
                toast.success("Correct pattern! Next round.");
                setPlayerPattern([]);
                // Aquí podrías llamar a una API para obtener el nuevo patrón
            }
        } else {
            onMissedPattern();
            toast.error("You missed the pattern! Try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div>
                <div class="flex gap-2 mt-4">
                    {gameState.pattern.map((color, index) => (
                        <LucideCircleDotDashed
                            key={index}
                            size={24}
                            class={`text-[var(--color)]`}
                            style={{ "--color": playerPattern[index] === color ? color : "white" }}
                        />
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                    {colors.map((color) => (
                        <div
                            key={color}
                            className={`size-48 skew-x-6 flex font-teko text-xl uppercase italic font-medium animate-duration-400 justify-center items-center border-2 bg-opacity-20 rounded-lg shadow-md cursor-pointer transition-transform 
                                hover:scale-105 active:scale-95
                                ${color === "red"
                                    ? "bg-red-500 border-red-500"
                                    : color === "blue"
                                        ? "bg-blue-500 border-blue-500"
                                        : color === "green"
                                            ? "bg-green-500 border-green-500"
                                            : "bg-yellow-500 border-yellow-500"
                                } ${activeButton === color ? "animate-pulsing" : ""}`}
                            onClick={() => handlePlayerInput(color)}
                        >
                            {color}
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-xl font-medium">
                    {waitingForPattern ? "Watch the pattern" : "Repeat the pattern"}
                </div>
            </div>
        </div>
    );
};
