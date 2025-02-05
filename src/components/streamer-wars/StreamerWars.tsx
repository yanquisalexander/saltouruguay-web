import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import { SimonSays } from "./games/SimonSays";
import { WaitForDayOpen } from "./views/WaitForDayOpen";
import { PlayersGrid } from "./PlayersGrid";
import Pusher, { type Channel } from "pusher-js";
import { PUSHER_KEY } from "@/config";
import { ConnectedPlayers } from "./ConnectedPlayers";
import { CDN_PREFIX, playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { PlayerEliminated } from "./PlayerEliminated";
import { WaitingRoom } from "./views/WaitingRoom";
import { ButtonBox } from "./views/ButtonBox";
import { useStreamerWarsSocket } from "./hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";

const PRELOAD_SOUNDS = () => {
    Object.values(STREAMER_WARS_SOUNDS).forEach((sound) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.preload = "auto";
    });
};

const SplashScreen = ({ onEnd }: { onEnd: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [alertedBetterExperience, setAlertedBetterExperience] = useState(false);
    const [fadingOut, setFadingOut] = useState(false);

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 100));
            if (progress > 50 && !alertedBetterExperience) {
                toast.success("Para una mejor experiencia, usa pantalla completa (F11) y activa el sonido 🔊");
                setAlertedBetterExperience(true);
                playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.2 });
            }
        }, 50);

        const timer = setTimeout(() => {
            document.dispatchEvent(new CustomEvent('splash-screen-ended'));
            setFadingOut(true);
            setTimeout(() => {
                setLoading(false);
                onEnd();
            }, 500); // Tiempo de fade out
        }, 6000);

        return () => {
            clearTimeout(timer);
            // @ts-ignore
            clearInterval(progressInterval);
        };
    }, [progress, alertedBetterExperience, onEnd]);

    if (!loading) return null;

    return (
        <div className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[8000] transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <img src="/images/guerra-streamers-logo.webp" alt="Guerra de Streamers" className="h-24" />
            <div className="w-56 mt-8 h-2 bg-gray-700 rounded-full">
                <div className="h-full bg-[#b4cd02] rounded-xl" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

const GameComponent = ({ gameState, players, pusher }: { gameState: any; players: any[]; pusher: Pusher }) => {
    const GAME_CONFIG = useRef({ ButtonBox, SimonSays }).current;
    const [componentProps, setComponentProps] = useState(gameState.props);

    const Component = GAME_CONFIG[gameState.component as keyof typeof GAME_CONFIG];
    useEffect(() => {
        // Asegura que se actualice cuando cambie el `gameState.props`
        setComponentProps(gameState.props);
    }, [gameState.props]);

    // Aquí puedes manejar el comportamiento de tu componente
    return (
        <Component {...componentProps} players={players} pusher={pusher} />
    );
};


export const StreamerWars = ({ session }: { session: Session }) => {
    const [players, setPlayers] = useState<any[]>([]);
    const [dayAvailable, setDayAvailable] = useState(false);
    const { pusher, gameState, setGameState, recentlyEliminatedPlayer, globalChannel, presenceChannel } = useStreamerWarsSocket(session);
    const [pusherLoaded, setPusherLoaded] = useState(false);

    useEffect(() => {
        document.addEventListener("splash-screen-ended", () => setPusherLoaded(true), { once: true });
    }, []);

    const restoreGameStateFromCache = async () => {
        const { data, error } = await actions.streamerWars.getGameState();

        if (error) {
            return;
        }

        if (data.dayAvailable) {
            setDayAvailable(data.dayAvailable);
        }

        if (data && data.gameState) {
            if (data && data.gameState.game && data.gameState.props) {
                const { game, props } = data.gameState;
                setGameState({ component: game, props: { session, channel: globalChannel.current, players, pusher, ...props } });
            }
        }
    }

    useEffect(() => {
        restoreGameStateFromCache();
    }, []);

    useEffect(() => {
        if (!pusherLoaded) return;

        PRELOAD_SOUNDS();

        globalChannel.current?.bind("day-available", () => {
            document.addEventListener("cinematic-ended", () => setDayAvailable(true), { once: true });
        });

        globalChannel.current?.bind("day-finished", () => {
            document.addEventListener("cinematic-ended", () => setDayAvailable(false), { once: true });
        });

        presenceChannel.current?.bind("pusher:subscription_succeeded", ({ members }: { members: any }) => {
            setPlayers(Object.values(members));
        });

        presenceChannel.current?.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) => [...prev, member.info]);
        });

        presenceChannel.current?.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) => prev.filter((player) => player.playerNumber !== member.info.playerNumber));
        });

        actions.streamerWars.getGameState().then(({ data, error }) => {
            if (!error && data?.gameState) {
                setGameState({ component: data.gameState.game, props: { session, channel: globalChannel.current, players, pusher, ...data.gameState.props } });
            }
        });

        return () => {
            presenceChannel.current?.unbind_all();
            presenceChannel.current?.unsubscribe();
        };
    }, [pusherLoaded]);



    return (
        <>
            <SplashScreen onEnd={() => setPusherLoaded(true)} />
            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />
            {pusherLoaded && pusher && globalChannel.current && presenceChannel.current && (
                <>
                    {!gameState ? (
                        dayAvailable ? (
                            <WaitingRoom session={session} channel={globalChannel.current} />
                        ) : (
                            <WaitForDayOpen session={session} players={players} />
                        )
                    ) : (
                        <GameComponent gameState={gameState} players={players} pusher={pusher} />
                    )}
                </>
            )}
        </>
    );
};
