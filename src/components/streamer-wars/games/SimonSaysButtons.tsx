import { getTranslation } from "@/utils/translate";
import { useEffect } from "preact/hooks";



interface SimonSaysButtonsProps {
    activeButton: string | null;
    showingPattern: boolean;
    onClick: (color: string) => void;
    onColorShowed?: (color: string) => void;
}

export const colors = [
    { name: "red", gradient: "from-red-500 to-red-700" },
    { name: "blue", gradient: "from-blue-500 to-blue-700" },
    { name: "green", gradient: "from-green-500 to-green-700" },
    { name: "yellow", gradient: "from-yellow-400 to-yellow-600" }
] as const;

export const SimonSaysButtons = ({
    activeButton,
    showingPattern,
    onClick,
    onColorShowed
}: SimonSaysButtonsProps) => {

    useEffect(() => {
        if (onColorShowed && activeButton) {
            onColorShowed(activeButton);
        }
    }, [activeButton]);

    return (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Colores de Simón dice">
            {colors.map(({ name, gradient }) => (
                <button
                    key={name}
                    type="button"
                    aria-label={getTranslation(name)}
                    aria-pressed={activeButton === name}
                    disabled={showingPattern}
                    className={`
                        size-28 flex justify-center items-center text-sm font-teko tracking-wider uppercase font-medium
                        cursor-pointer transition-all duration-300 rounded-lg border border-white/10 bg-linear-to-b ${gradient}
                        shadow-md shadow-black/20 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-[#b4cd02]
                        ${activeButton === name ? "scale-105 ring-2 ring-[#b4cd02]/60 border-[#b4cd02]/50 shadow-[0_0_20px_rgba(180,205,2,0.2)]" : ""}
                        ${showingPattern ? "" : "hover:brightness-110 active:brightness-75 active:scale-95"}
                    `}
                    onClick={() => onClick(name)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(name); } }}
                >
                    {getTranslation(name)}
                </button>
            ))}
        </div>
    );
};
