import { CDN_PREFIX, playSound, playSoundWithReverb } from "@/consts/Sounds";
import { useEffect, useState } from "preact/hooks";
import { LucideCheckCircle2, LucideClock, LucideHash } from "lucide-preact";

interface ScriptItem {
    text?: string;
    component?: preact.JSX.Element;
    duration: number;
    audioPath?: string;
    audioVolume?: number;
}

const INTRO_SCRIPT: ScriptItem[] = [
    {
        duration: 4000,
        audioPath: "scripts/awards-intro",
        audioVolume: 0.08,
        component: (

            <div className="flex flex-col items-center animate-fade-in-up">
                <div class="relative animate-fade-in-up" style="--floating-duration: 5000ms">
                    <img src="/images/trofeo-awards.webp" alt="Trofeo SaltoAwards" class="size-28 md:size-24 w-auto object-contain aspect-square animate-sink animate-iteration-count-infinite animate-duration-[var(--floating-duration)] saturate-150" /> <img src="/images/trofeo-awards.webp" alt="" aria-hidden="true" class="absolute blur-md brightness-125 saturate-200 inset-0 size-28 md:size-24 w-auto object-contain aspect-square z-[-1] animate-sink animate-iteration-count-infinite animate-duration-[var(--floating-duration)]" />
                </div>
                <h1 className="text-8xl md:text-9xl font-teko text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 uppercase tracking-wider">
                    SALTO
                </h1>
                <h2 className="text-6xl md:text-7xl font-teko text-yellow-500 uppercase tracking-widest -mt-4">
                    AWARDS 2025
                </h2>
            </div>
        )
    },
    {
        duration: 6000,
        audioPath: "scripts/bienvenida-awards-1",
        text: "¡Bienvenidos a la ceremonia de premiación más esperada del año!"
    },
    {
        duration: 5000,
        audioPath: "scripts/bienvenida-awards-2",
        text: "Prepárense para celebrar los logros más destacados de nuestra comunidad."
    },
    {
        duration: 21000,
        audioPath: "scripts/bienvenida-awards-reglas",
        component: (
            <div className="flex flex-col">
                <h3 className="text-5xl font-teko text-yellow-500 uppercase mb-8">Reglas de Votación</h3>
                <div className="flex items-center gap-6 mb-4">
                    <LucideCheckCircle2 className="size-12 text-green-500" />
                    <p className="text-2xl font-rubik text-white">Puedes votar hasta 2 nominados por categoría</p>
                </div>
                <div className="flex items-center  gap-6 mb-4">
                    <LucideClock className="size-12 text-blue-500" />
                    <p className="text-2xl font-rubik text-white">Tómate tu tiempo, una vez enviados no podrás modificar tus votos</p>
                </div>
                <div className="flex items-center  gap-6">
                    <LucideHash className="size-12 text-yellow-500" />
                    <p className="text-2xl font-rubik text-white">El número en la tarjeta indica el puntaje: 1 o 0.5 puntos</p>
                </div>
            </div>
        )
    },
    {
        duration: 7000,
        audioPath: "scripts/bienvenida-awards-3",
        component: (
            <div className="flex flex-col items-center">
                <p className="text-4xl md:text-5xl font-teko text-yellow-400 uppercase">
                    ¡Que comience la votación!
                </p>
                <p className="text-sm md:text-base font-mono text-white mt-4 max-w-xl">
                    Recuerda que puedes votar a más de un nominado por categoría y que tus votos ayudarán a decidir quiénes serán los ganadores de este año.
                </p>
            </div>
        )
    }
];

const PRELOAD_SOUNDS = () => {
    const allSounds = INTRO_SCRIPT.map((item) => item.audioPath).filter(Boolean);
    allSounds.forEach((sound) => {
        if (!sound) return;
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        console.log('Preloading sound:', audio.src);
        audio.preload = "auto";
    });
}

export const AwardsInmersiveIntro = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const totalDuration = INTRO_SCRIPT.reduce((acc, item) => acc + item.duration, 0);
    const [remainingTime, setRemainingTime] = useState(totalDuration / 1000);

    useEffect(() => {
        if (!isPlaying) return;

        const intervalId = setInterval(() => {
            setRemainingTime((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(intervalId as unknown as number);
    }, [isPlaying]);

    useEffect(() => {
        PRELOAD_SOUNDS();
        const checkIntroStatus = () => {
            const shown = localStorage.getItem('awards-2025-inmersive-shown');
            if (!shown) {

                setIsVisible(true);
                setIsPlaying(true);

            }
            setIsLoading(false);
        };

        checkIntroStatus();
    }, []);

    useEffect(() => {
        if (!isPlaying) return;

        let timeoutId: number;

        const playItem = (index: number) => {
            if (index >= INTRO_SCRIPT.length) {
                handleFinish();
                return;
            }

            setCurrentIndex(index);
            const item = INTRO_SCRIPT[index];

            if (item.audioPath) {
                // El primero no tiene reverb
                playSoundWithReverb({ sound: item.audioPath, volume: item.audioVolume || 1, reverbAmount: index === 0 ? 0 : 0.5 });
            }

            timeoutId = window.setTimeout(() => {
                playItem(index + 1);
            }, item.duration);
        };

        playItem(0);

        return () => clearTimeout(timeoutId);
    }, [isPlaying]);

    const handleFinish = () => {
        setIsFadingOut(true);
        setTimeout(() => setIsVisible(false), 500);

        localStorage.setItem('awards-2025-inmersive-shown', 'true');
    };

    if (isLoading || !isVisible) return null;

    const currentItem = INTRO_SCRIPT[currentIndex];
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);

    return (
        <div className={`fixed inset-0 bg-black/95 flex min-h-screen h-full flex-col justify-center items-center z-[10000] transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-300 z-[10001]">
                {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 blur-[100px] rounded-full animate-pulse"></div>
            </div>

            <div className="relative z-10 max-w-4xl px-8 text-center">
                {currentItem?.component ? (
                    currentItem.component
                ) : (
                    <p className="text-3xl md:text-5xl font-rubik text-white leading-relaxed animate-fade-in">
                        {currentItem?.text}
                    </p>
                )}
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
                {INTRO_SCRIPT.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-yellow-500' : 'w-2 bg-gray-700'}`}
                    />
                ))}
            </div>
        </div>
    );
};