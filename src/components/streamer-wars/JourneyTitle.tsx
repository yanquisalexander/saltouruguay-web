import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { useEffect, useRef, useState } from "preact/hooks";
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
        episode: 0,
        title: "Episodio #0",
        subtitle: "¡Probemos esta cosa!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_0,
        duration: 8000 // Le di 1s extra para acomodar el suspenso
    },
    {
        episode: 1,
        title: "Episodio #1",
        subtitle: "¡Sigan las instrucciones!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_1,
        duration: 6000
    },
    {
        episode: 2,
        title: "Episodio 2",
        subtitle: "¡La batalla continúa!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_2,
        duration: 6000
    },
    {
        episode: 3,
        title: "Episodio 3",
        subtitle: "¡El final se acerca!",
        sound: STREAMER_WARS_SOUNDS.EPISODE_3,
        duration: 6000
    }
];

interface JourneyTitleProps {
    episode: number;
    onEnd: () => void;
}

// Estados de nuestra secuencia de animación
type RevealStep = "entering" | "show-episode" | "show-subtitle" | "fade-out";

export const JourneyTitle = ({ episode, onEnd }: JourneyTitleProps) => {
    const [step, setStep] = useState<RevealStep>("entering");
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    const episodeData = EPISODES.find(e => e.episode === episode);

    useEffect(() => {
        if (!episodeData) {
            onEndRef.current();
            return;
        }

        // Reproducir el sonido de fondo
        playSound({ sound: STREAMER_WARS_SOUNDS.JOURNEY_TITLE_BG, volume: 0.4 });

        // Secuencia de animación controlada por timers:

        // Suena el impacto/ambiente inicial
        const audioTimer = setTimeout(() => {
            playSoundWithReverb({ sound: episodeData.sound, volume: 1, reverbAmount: 0.15 });
        }, 1000);

        // Secuencia de suspenso:

        // 1. Mostrar el número de episodio casi de inmediato
        const episodeTimer = setTimeout(() => setStep("show-episode"), 100);

        // 2. Esperar 1.8 segundos en tensión para revelar el título/subtítulo
        const subtitleTimer = setTimeout(() => setStep("show-subtitle"), 2800);

        // 3. Iniciar el fade out general antes de terminar
        const fadeOutTimer = setTimeout(() => setStep("fade-out"), episodeData.duration - 800);

        // 4. Terminar y desmontar
        const endTimer = setTimeout(() => {
            onEndRef.current();
        }, episodeData.duration);

        return () => {
            clearTimeout(audioTimer);
            clearTimeout(episodeTimer);
            clearTimeout(subtitleTimer);
            clearTimeout(fadeOutTimer);
            clearTimeout(endTimer);
        };
    }, [episode, episodeData]);

    if (!episodeData) return null;

    // Lógica para clases de transición
    const isOverlayVisible = step !== "fade-out";
    const isEpisodeVisible = step === "show-episode" || step === "show-subtitle";
    const isSubtitleVisible = step === "show-subtitle";

    return (
        <div
            className={`fixed inset-0 flex flex-col justify-center items-center z-[9000] transition-opacity duration-1000 ease-in-out ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            {/* Glow central más sutil y enfocado para dar un aire lúgubre */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,205,2,0.06)_0%,transparent_50%)]" />

            <div className="relative z-10 flex flex-col items-center">

                {/* NÚMERO DE EPISODIO */}
                <div className={`transition-all duration-1000 ease-out transform ${isEpisodeVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <ShimmeringText
                        wave
                        duration={2} // Un poco más lento para más drama
                        text={`{ ${episodeData.title.toUpperCase()} }`} // Cambié {} por [] que se ve más rígido/clínico
                        className="text-7xl font-squids text-white tracking-[0.3em] mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    />
                </div>

                {/* CONTENEDOR DEL SUBTÍTULO Y LÍNEA (Se revela después) */}
                <div
                    className={`flex flex-col items-center transition-all duration-700 ease-out transform ${isSubtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                >
                    <div className="w-[60vw] max-w-md h-[2px] bg-gradient-to-r from-transparent via-[#b4cd02] to-transparent mb-6 shadow-[0_0_20px_rgba(180,205,2,0.8)]" />

                    <h2 className="text-2xl font-mono tracking-[0.25em] font-bold text-[#b4cd02] uppercase drop-shadow-[0_0_12px_rgba(180,205,2,0.6)]">
                        {episodeData.subtitle}
                    </h2>
                </div>

            </div>
        </div>
    );
};