import type { SimonSaysGameState } from "@/utils/streamer-wars";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { LucideCircleDotDashed } from "lucide-preact";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export const SimonSays = ({
    session,
    initialGameState,
}: {
    session: Session;
    initialGameState?: SimonSaysGameState;
}) => {
    const colors = [
        { name: "red", gradient: "from-red-400 to-red-600" },
        { name: "blue", gradient: "from-blue-400 to-blue-600" },
        { name: "green", gradient: "from-green-400 to-green-600" },
        { name: "yellow", gradient: "from-yellow-400 to-yellow-600" },
    ] as const;

    const [gameState, setGameState] = useState<SimonSaysGameState>(initialGameState || {
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        failedPlayers: [],
    });

    const [playerPattern, setPlayerPattern] = useState<string[]>([]);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [waitingForPattern, setWaitingForPattern] = useState(false);

    const handlePlayerInput = (color: string) => {
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
            toast.error("You missed the pattern! Try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="flex gap-2 mt-4">
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
                {colors.map(({ name, gradient }, index) => (
                    <div
                        key={name}
                        className={`size-48 flex justify-center items-center text-xl font-teko uppercase italic font-medium cursor-pointer transition-transform 
                            hover:scale-105 active:scale-95 rounded-3xl bg-gradient-to-b ${gradient}
                            ${activeButton === name ? "animate-pulse" : ""}`}
                        onClick={() => handlePlayerInput(name)}
                    >
                        {getTranslation(name)}
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xl font-medium">
                {waitingForPattern ? "Watch the pattern" : "Repeat the pattern"}
            </div>
        </div>
    );
};
