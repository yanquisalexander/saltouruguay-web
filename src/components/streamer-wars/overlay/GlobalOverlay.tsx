import { useEffect, useRef, useState } from "preact/hooks";
import { useStreamerWarsSocket } from "../hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";
import type { Players } from "@/components/admin/streamer-wars/Players";
import { SimonSaysOverlay } from "./SimonSaysOverlay";
import type Pusher from "pusher-js";

const OverlayRenderer = ({ gameState, players, pusher }: { gameState: any; players: Players[], pusher: Pusher }) => {
    const components = useRef({
        SimonSays: SimonSaysOverlay
    });

    if (!gameState) return null;

    // @ts-ignore
    const Component = components.current[gameState.component];
    if (!Component) return null;

    return <Component initialGameState={gameState} pusher={pusher} players={players} {...gameState.props} />;
};

export const GlobalOverlay = () => {
    const [players, setPlayers] = useState<Players[]>([]);
    const { pusher, gameState, setGameState, globalChannel, presenceChannel } = useStreamerWarsSocket(null);

    // Cargar jugadores una vez al inicio
    useEffect(() => {

        actions.streamerWars.getPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }

            setPlayers(data?.players.map((player: any) => ({ ...player, online: false })) || []);

        });

    }, []);


    // Restaurar estado del juego y manejar eventos de Pusher
    useEffect(() => {
        if (!pusher) return;

        const restoreGameStateFromCache = async () => {
            const { data, error } = await actions.streamerWars.getGameState();

            if (error || !data?.gameState) return;

            const { game, props } = data.gameState;
            if (game && props) {
                setGameState((prev) => {
                    return {
                        ...prev,
                        component: game,
                        props
                    };
                });
            }
        };



        restoreGameStateFromCache();

        return () => {
            pusher.disconnect();
        };
    }, [pusher]);

    if (!pusher) return null;

    return (
        <div>
            <OverlayRenderer gameState={gameState} players={players} pusher={pusher} />
        </div>
    );
};
