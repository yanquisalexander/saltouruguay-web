import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import { MemoryGame } from "./games/MemoryGame";
import { DaySelector } from "./views/DaySelector";
import { PlayersGrid } from "./PlayersGrid";
import Pusher, { type Channel } from "pusher-js";
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
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 100));
            if (progress > 50) {
                if (!alertedBetterExperience) {
                    FOR_BETTER_EXPERIENCE();
                    setAlertedBetterExperience(true);
                }
            }
        }, 50);

        const timer = setTimeout(() => {
            setFadingOut(true);
            setTimeout(() => setLoading(false), 500);
        }, 6000);

        return () => {
            clearTimeout(timer);
            // @ts-ignore
            clearInterval(progressInterval);
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
                <div class="w-56 mt-8 h-2 bg-gray-700 rounded-full overflow-hidden animate-fade-in">
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

    const [gameState, setGameState] = useState<{
        key: string;
        component: string;
        props: any;
    } | null>(null);

    const GAME_CONFIG = useRef({
        ButtonBox: ButtonBox,
        MemoryGame: MemoryGame,
    }).current;

    const globalChannel = useRef<Channel | null>(null);

    useEffect(() => {
        PRELOAD_SOUNDS();

        if (session) {
            const pusherInstance = new Pusher(PUSHER_KEY, {
                wsHost: 'soketi.saltouruguayserver.com',
                cluster: "us2",
                enabledTransports: ['ws', 'wss'],
                forceTLS: true
            });

            setPusher(pusherInstance);

            globalChannel.current = pusherInstance.subscribe("streamer-wars");

            globalChannel.current.bind("player-eliminated", ({ playerNumber, audioBase64 }: { playerNumber: number, audioBase64: string }) => {
                playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.2 }).then(async () => {
                    setRecentlyEliminatedPlayer(playerNumber);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                    audio.play();
                });
            });

            globalChannel.current.bind("send-to-waiting-room", () => {
                setGameState(null);
                toast("Todos los jugadores han sido enviados a la sala de espera");
            });

            globalChannel.current.bind("launch-game", ({ game, props }: { game: string, props: any }) => {
                const newKey = `${game}-${Date.now()}`;
                playSound({ sound: STREAMER_WARS_SOUNDS.QUE_COMIENCE_EL_JUEGO });

                setGameState({
                    key: newKey,
                    component: game,
                    props: {
                        session,
                        pusher: pusherInstance,
                        ...props
                    }
                });
            });

            return () => {
                globalChannel.current?.unbind_all();
                globalChannel.current?.unsubscribe();
                pusherInstance.disconnect();
            };
        }
    }, [session]);

    useEffect(() => {
        if (pusher) {
            const presenceChannel = pusher.subscribe("presence-streamer-wars");

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

    const renderGame = () => {
        if (!gameState) {
            toast.error("No se ha configurado el estado del juego");
            return null;
        }

        const GameComponent = GAME_CONFIG[gameState.component as keyof typeof GAME_CONFIG];

        return <GameComponent key={gameState.key} {...gameState.props} />;
    };

    return (
        <>
            <div
                class="flex w-full flex-col gap-y-2 fixed inset-0 min-h-dvh md:hidden justify-center items-center bg-black z-[9000]">
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

            {pusher && (
                <>
                    {!gameState ? (
                        <WaitingRoom session={session} pusher={pusher} />
                    ) : (
                        renderGame()
                    )}
                </>
            )}

            <ConnectedPlayers players={[]} />
            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />
        </>
    );
};
