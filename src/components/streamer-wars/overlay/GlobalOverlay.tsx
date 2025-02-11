import type { Session } from "@auth/core/types";
import { useStreamerWarsSocket } from "../hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";

export const GlobalOverlay = () => {
    const [players, setPlayers] = useState<any[]>([]);
    const { pusher, gameState, setGameState, recentlyEliminatedPlayer, globalChannel, presenceChannel } = useStreamerWarsSocket(null);


    const restoreGameStateFromCache = async () => {
        const { data, error } = await actions.streamerWars.getGameState();
        console.log({ data, error });

        if (error) {
            return;
        }


        if (data && data.gameState) {
            if (data && data.gameState.game && data.gameState.props) {
                const { game, props } = data.gameState;
                setGameState({ component: game, props: { channel: globalChannel.current, players, pusher, ...props } });
            }
        }
    }

    useEffect(() => {
        restoreGameStateFromCache();
    }, []);

    return (
        <div>
            {gameState && (
                <pre>
                    {JSON.stringify(gameState.component, null, 2)}
                </pre>
            )}
        </div>
    );
}