import type { Session } from "@auth/core/types";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";

const SplashScreen = () => {
    const [loading, setLoading] = useState(true);
    const [fadingOut, setFadingOut] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simular progreso de la barra de carga
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 100));
        }, 50); // Incrementa el progreso cada 50ms

        // Gestionar el fade-out
        const timer = setTimeout(() => {
            setFadingOut(true);
            setTimeout(() => setLoading(false), 500); // Duración del fade-out
        }, 6000); // Tiempo total de la pantalla de carga

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval); // Limpiar los intervalos si el componente se desmonta
        };
    }, []);

    if (loading) {
        return (
            <div
                class={`flex flex-col fixed justify-center items-center inset-0 bg-black z-[9999] transition-opacity duration-500 ${fadingOut ? "opacity-0" : "opacity-100"
                    }`}
            >
                <header class="flex w-full justify-center">
                    <img
                        src="/images/guerra-streamers-logo.webp"
                        draggable={false}
                        style={{ animationDuration: "3.5s" }}
                        alt="Guerra de Streamers"
                        class="h-24 select-none animate-fade-in"
                    />
                </header>
                {/* Barra de carga */}
                <div class="w-56 mt-8 h-2 bg-gray-700 rounded-full overflow-hidden animate-fade-in"
                >
                    <div
                        class="h-full bg-[#b4cd02] transition-all"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        );
    }

    return null;
};


export const StreamerWars = ({ session }: { session: Session }) => {
    return (
        <>
            <SplashScreen />
            <div class="flex w-full animate-fade-in">

                <header class="flex w-full justify-between">
                    <img src="/images/guerra-streamers-logo.webp"
                        draggable={false}
                        alt="Guerra de Streamers" class="h-24 select-none" />

                    <div class="border-2 flex self-start hover:border-white cursor-pointer transition items-center gap-x-2 border-dashed border-gray-700 rounded-lg p-2">
                        <span class="text-white text-sm font-medium font-rubik">{session.user.name}</span>
                        <img src={session.user.image as string} alt="Avatar" class="w-8 h-8 rounded-full" />
                    </div>

                </header>

            </div>
            {/* <MemoryGame session={session} onGameEnd={() => { }} onMissedPattern={() => {
                toast.error("You missed the pattern! Try again.");
            }} /> */}
        </>
    );
}