import { getTranslation } from "@/utils/translate";
import { useEffect } from "preact/hooks";



interface SimonSaysButtonsProps {
    activeButton: string | null;
    showingPattern: boolean;
    onClick: (color: string) => void;
    onColorShowed?: (color: string) => void;
}

export const colors = [
    { name: "red", gradient: "from-red-400 to-red-600" },
    { name: "blue", gradient: "from-blue-400 to-blue-600" },
    { name: "green", gradient: "from-green-400 to-green-600" },
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
        <div className="grid grid-cols-2 gap-4 mt-8">
            {colors.map(({ name, gradient }) => (
                <div
                    key={name}
                    className={`
            size-48 flex justify-center items-center text-xl font-teko uppercase italic font-medium 
            cursor-pointer transition-transform rounded-3xl bg-gradient-to-b ${gradient}
            ${activeButton === name ? "scale-125" : ""}
            transition-all duration-300
            ${showingPattern ? "pointer-events-none" : "hover:scale-105 active:scale-95"}
          `}
                    onClick={() => onClick(name)}
                >
                    {getTranslation(name)}
                </div>
            ))}
        </div>
    );
};
