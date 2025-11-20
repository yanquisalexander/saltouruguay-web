import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { useEffect, useState } from "preact/hooks";
import { ShimmeringText } from "../ui/shadcn-io/shimmering-text";

export interface Episode {
    episode: number;
    title: string;
    subtitle: string;
    sound: string;
    duration: number;
}

export const EPISODES: Episode[] = [
    {
        episode: 1,
        title: "Episodio 1",
        subtitle: "¡Este truco solo puede hacerse una vez!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_1,
        duration: 5000
    },
    {
        episode: 2,
        title: "Episodio 2",
        subtitle: "¡La batalla continúa!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_2,
        duration: 5000
    },
    {
        episode: 3,
        title: "Episodio 3",
        subtitle: "¡El final se acerca!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_3,
        duration: 5000
    }
];

interface JourneyTitleProps {
    episode: number;
    onEnd: () => void;
}

export const JourneyTitle = ({ episode, onEnd }: JourneyTitleProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const [fadeClass, setFadeClass] = useState("animate-fade-in");

    const episodeData = EPISODES.find(e => e.episode === episode);

    useEffect(() => {
        if (!episodeData) {
            onEnd();
            return;
        }

        // Reproducir sonido
        playSound({ sound: episodeData.sound, volume: 1 });

        // Duración del título
        const duration = episodeData.duration;

        const timer = setTimeout(() => {
            setFadeClass("animate-fade-out");
            setTimeout(() => {
                setIsVisible(false);
                onEnd();
            }, 500); // Tiempo de fade out
        }, duration);

        return () => clearTimeout(timer);
    }, [episode, episodeData, onEnd]);

    if (!isVisible || !episodeData) return null;

    return (
        <div className={`fixed inset-0 bg-black/90 flex flex-col justify-center items-center z-[9000] transition-opacity duration-500 ${fadeClass}`}>
            <ShimmeringText
                wave
                duration={1}
                text={`{ ${episodeData.title} }`}
                className="text-5xl font-bold text-white font-squids mb-4 animate-reveal-up"
            />
            <hr class="w-1/2 border-t-2 border-white mb-4 animate-reveal-hr" />
            <h2 className="text-lg font-semibold text-[#b4cd02] font-press-start-2p animate-reveal-down">{episodeData.subtitle}</h2>
        </div>
    );
};