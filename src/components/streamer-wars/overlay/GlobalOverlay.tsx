import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { useStreamerWarsSocket } from "../hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";
import type { Players } from "@/components/admin/streamer-wars/Players";
import { SimonSaysOverlay } from "./SimonSaysOverlay";
import type Pusher from "pusher-js";
import { PlayerEliminated } from "../PlayerEliminated";
import { TeamSelectorOverlay } from "./TeamSelectorOverlay";

const OverlayRenderer = ({
    gameState,
    players,
    pusher,
}: {
    gameState: any;
    players: Players[];
    pusher: Pusher;
}) => {
    const components = useRef({
        SimonSays: SimonSaysOverlay,
        TeamSelector: TeamSelectorOverlay,
    });

    if (!gameState) return null;


    // Seleccionamos el componente basado en la propiedad "component" de gameState
    // @ts-ignore
    const Component = components.current[gameState.component];
    console.log("Component", Component);
    if (!Component) return null;

    // Pasamos players directamente desde el prop, sin mezclarlo con gameState.props
    return (
        <Component
            gameState={gameState}
            initialGameState={gameState}
            pusher={pusher}
            players={players}
            teamsQuantity={gameState.props?.teamsQuantity}
            {...gameState.props}
        />
    );
};

export const GlobalOverlay = () => {
    const [players, setPlayers] = useState<Players[]>([]);
    const { pusher, gameState, setGameState, globalChannel, recentlyEliminatedPlayer } =
        useStreamerWarsSocket(null);

    // Cargar jugadores al iniciar
    useEffect(() => {
        actions.streamerWars.getPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }

            setPlayers(
                data?.players.map((player: any) => ({ ...player, online: false })) || []
            );
            console.log("Players loaded", data?.players);
        });
    }, []);

    // Restaurar el estado del juego sin incluir players en gameState.props
    const restoreGameStateFromCache = useCallback(async () => {
        const { data, error } = await actions.streamerWars.getGameState();
        console.log({ data, error });

        if (error) return;

        if (data?.gameState && data.gameState.game && data.gameState.props) {
            const { game, props } = data.gameState;
            setGameState({
                component: game,
                // No incluimos players aquí; se pasará directamente desde GlobalOverlay
                props: { channel: globalChannel.current, pusher, ...props },
            });
        }
    }, [globalChannel, pusher, setGameState]);

    // Ejecutar restauración al iniciar
    useEffect(() => {
        restoreGameStateFromCache();
    }, [restoreGameStateFromCache]);

    if (!pusher) return null;

    return (
        <div class="min-h-screen">
            <OverlayRenderer gameState={gameState} players={players} pusher={pusher} />
            {
                recentlyEliminatedPlayer && <PlayerEliminated playerNumber={recentlyEliminatedPlayer} session={null} />
            }
        </div>
    );
};
