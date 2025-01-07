import type { Session } from "@auth/core/types";
import { LucideCircleDotDashed } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";

export const MemoryGame = ({
    session,
    onGameEnd,
    onMissedPattern,
}: {
    session: Session;
    onGameEnd: () => void;
    onMissedPattern: () => void;
}) => {
    const colors = ["red", "blue", "green", "yellow"] as const;
    const [waitingForPattern, setWaitingForPattern] = useState(false);
    const [waitingForPlayers, setWaitingForPlayers] = useState(true);
    const [pattern, setPattern] = useState<Array<typeof colors[number]>>([]);
    const [playerPattern, setPlayerPattern] = useState<Array<typeof colors[number]>>([]);
    const [activeButton, setActiveButton] = useState<typeof colors[number] | null>(null);

    const startGame = () => {
        setWaitingForPlayers(false);
        setPattern([]);
        setPlayerPattern([]);
        generateNextPattern();
    };

    const generateNextPattern = () => {
        const nextColor = colors[Math.floor(Math.random() * colors.length)];
        setPattern((prev) => [...prev, nextColor]);
    };

    const handlePlayerInput = (color: typeof colors[number]) => {
        if (waitingForPattern) return;

        const updatedPlayerPattern = [...playerPattern, color];
        setPlayerPattern(updatedPlayerPattern);

        if (color === pattern[updatedPlayerPattern.length - 1]) {
            if (updatedPlayerPattern.length === pattern.length) {
                setTimeout(() => {
                    toast.success("Correct pattern! Next round.");
                    setPlayerPattern([]);
                    generateNextPattern();
                }, 1000);
            }
        } else {
            onMissedPattern();
            toast.error("You missed the pattern! Try again.");
            onGameEnd();
        }
    };

    useEffect(() => {
        if (pattern.length > 0) {
            const displayPattern = async () => {
                setWaitingForPattern(true);
                for (const color of pattern) {
                    setActiveButton(color);
                    await new Promise((resolve) => setTimeout(resolve, 600));
                    setActiveButton(null);
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
                setWaitingForPattern(false);
            };

            displayPattern();
        }
    }, [pattern]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            {waitingForPlayers ? (
                <button
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold shadow-md hover:bg-blue-600 transition"
                    onClick={startGame}
                >
                    Start Game
                </button>
            ) : (
                <div>
                    {/* 
                        Barra con los colores presionados por el jugador,
                        si todavía no ha presionado determinado color, se muestra sin relleno,
                        si ya lo presionó, se muestra con relleno.
                    */}

                    <div class="flex gap-2 mt-4">
                        {
                            pattern.map((color, index) => (
                                <LucideCircleDotDashed
                                    key={index}
                                    size={24}
                                    class={`text-[var(--color)]`}
                                    style={{ "--color": playerPattern[index] === color ? color : "white" }}
                                />
                            ))
                        }
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        {colors.map((color) => (
                            <div
                                key={color}
                                className={`w-24 h-24 flex font-teko text-xl uppercase italic font-medium animate-duration-400 justify-center items-center border-2 bg-opacity-20 rounded-lg shadow-md cursor-pointer transition-transform 
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
            )}
        </div>
    );
};
