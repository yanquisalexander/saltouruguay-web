import type { Session } from "@auth/core/types";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";
import { MemoryGame } from "./games/MemoryGame";
import { DaySelector } from "./views/DaySelector";
import { PlayersGrid } from "./PlayersGrid";
import Pusher from "pusher-js";
import { PUSHER_KEY } from "@/config";
import { ConnectedPlayers } from "./ConnectedPlayers";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { PlayerEliminated } from "./PlayerEliminated";

const PRELOAD_SOUNDS = () => {
    const CDN_PREFIX = "https://cdn.saltouruguayserver.com/sounds/";
    Object.values(STREAMER_WARS_SOUNDS).forEach((sound) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.preload = "auto";
        console.log(`Preloading sound: ${sound}`);
    })
}

const FOR_BETTER_EXPERIENCE = () => {
    playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION });
    toast.success("Para una mejor experiencia, te recomendamos utiliza pantalla completa (F11) y activar el sonido 🔊");
}

const SplashScreen = () => {
    const [loading, setLoading] = useState(true);
    const [fadingOut, setFadingOut] = useState(false);
    const [progress, setProgress] = useState(0);
    const [alertedBetterExperience, setAlertedBetterExperience] = useState(false);

    useEffect(() => {
        // Precargar los sonidos
        // Simular progreso de la barra de carga
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 100));
            if (progress > 50) {
                if (!alertedBetterExperience) {
                    FOR_BETTER_EXPERIENCE();
                    setAlertedBetterExperience(true);
                }
            }
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
    }, [progress, alertedBetterExperience]);

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
    const [pusher, setPusher] = useState<Pusher | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [recentlyEliminatedPlayer, setRecentlyEliminatedPlayer] = useState<number | null>(null);

    useEffect(() => {
        PRELOAD_SOUNDS();

        if (session) {
            const host = /* import.meta.env.DEV ? 'localhost' :  */`soketi.saltouruguayserver.com`;

            const pusherInstance = new Pusher(PUSHER_KEY, {
                wsHost: host,
                cluster: "us2",
                enabledTransports: ['ws', 'wss'],
                forceTLS: true
            });

            setPusher(pusherInstance);
        }
    }, [session]);

    useEffect(() => {
        if (pusher) {
            const globalChannel = pusher.subscribe("streamer-wars");
            const presenceChannel = pusher.subscribe("presence-streamer-wars");

            globalChannel.bind("player-eliminated", function ({ playerNumber, audioBase64 }: { playerNumber: number, audioBase64: string }) {
                playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.5 }).then(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                    audio.play();
                    setRecentlyEliminatedPlayer(playerNumber);
                })

            })

            presenceChannel.bind("pusher:subscription_succeeded", function (members: any) {
                console.log("Members: ", members);
            });

            presenceChannel.bind("pusher:member_added", function (member: any) {
                console.log("Member added: ", member);
            });

            presenceChannel.bind("pusher:member_removed", function (member: any) {
                console.log("Member removed: ", member);
            });

        }
    }, [pusher]);




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

            {/* <DaySelector /> */}
            {/*             <PlayersGrid initialPlayers={[]} />
 */}

            <ConnectedPlayers players={[]} />
            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />

        </>
    );
}