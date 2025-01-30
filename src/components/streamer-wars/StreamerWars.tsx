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
import { WaitingRoom } from "./views/WaitingRoom";
import { ButtonBox } from "./views/ButtonBox";

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
            // @ts-expect-error Type 'number' is not assignable to type 'NodeJS.Timeout'.
            clearInterval(progressInterval); // Limpiar los intervalos si el componente se desmonta
        };
    }, [progress, alertedBetterExperience]);

    if (loading) {
        return (
            <div
                class={`flex flex-col fixed justify-center items-center inset-0 bg-black z-[8000] transition-opacity duration-500 ${fadingOut ? "opacity-0" : "opacity-100"
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
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    const GAMES = [
        {
            id: "ButtonBox",
            component: ButtonBox,
            props: { session, pusher, teamsQuantity: 4, playersPerTeam: 5 }
        },
        {
            id: "MemoryGame",
            component: MemoryGame,
            props: { session, pusher }
        }
    ]

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
                    setRecentlyEliminatedPlayer(playerNumber);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                    audio.play();
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
            <div
                ref={(el) => {
                    if (el && el.clientWidth > 768) {
                        el.classList.remove("hide-scroll-page");
                    }
                }}
                class="flex w-full flex-col gap-y-2 fixed inset-0 hide-scroll-page min-h-dvh md:hidden justify-center items-center bg-black z-[9000]">
                <span class="text-white text-center text-lg font-rubik">Este juego no está disponible en dispositivos móviles</span>
                <a href="/" class="bg-lime-500 text-black px-4 py-2">Volver al inicio</a>
            </div>

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

            {
                pusher && (
                    <>
                        {
                            !selectedGame ? (
                                <WaitingRoom session={session} pusher={pusher} />
                            ) : (
                                GAMES.map((game) => {
                                    if (game.id === selectedGame) {
                                        const Component = game.component;
                                        return <Component {...{ ...game.props, pusher: pusher! }} />
                                    }
                                }
                                )
                            )
                        }

                    </>
                )
            }

            <ConnectedPlayers players={[]} />
            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />

        </>
    );
}