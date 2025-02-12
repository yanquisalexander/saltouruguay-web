import type { Session } from "@auth/core/types";
import { useStreamerWarsSocket } from "../hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";
import { useEffect, useRef, useState } from "preact/hooks";
import { SimonSaysOverlay } from "./SimonSaysOverlay";
import type { Players } from "@/components/admin/streamer-wars/Players";

const OverlayRenderer = ({ gameState, setGameState, players, pusher, globalChannel, presenceChannel }: any) => {
    const components = useRef<any>({
        SimonSays: SimonSaysOverlay
    });

    if (!pusher || !gameState) return null;

    const Component = components.current[gameState.component];

    if (!Component) return null;

    return <Component initialGameState={gameState} {...gameState.props} />;
}


export const GlobalOverlay = () => {
    const [players, setPlayers] = useState<Players[]>([]);
    const { pusher, gameState, setGameState, recentlyEliminatedPlayer, globalChannel, presenceChannel } = useStreamerWarsSocket(null);

    useEffect(() => {
        actions.streamerWars.getPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }

            setPlayers((prev) => {
                const mergedPlayers = [...prev];

                data.players.forEach((player: any) => {
                    if (!mergedPlayers.some((p) => p.id === player.id)) {
                        mergedPlayers.push({
                            ...player,
                            displayName: player.displayName || player.name || '',
                            avatar: player.avatar || '',
                            admin: player.admin || false,
                            online: false,
                            eliminated: player.eliminated || false,
                        });
                    }
                });

                return mergedPlayers;
            });
        });
    }, []);


    useEffect(() => {
        if (!pusher) return; // Espera hasta que pusher esté definido

        const restoreGameStateFromCache = async () => {
            const { data, error } = await actions.streamerWars.getGameState();
            console.log({ data, error });

            if (error || !data?.gameState) return;

            const { game, props } = data.gameState;
            if (game && props) {
                setGameState({ component: game, props: { channel: globalChannel.current, players, pusher, ...props } });
            }
        };

        presenceChannel.current?.bind("pusher:member_added", ({ id, info }: { id: number, info: any }) => {
            setPlayers((prev) => [...prev, { id, ...info }]);
        });

        presenceChannel.current?.bind("pusher:member_removed", (data: any) => {
            setPlayers((prev) => prev.filter((player) => player.id !== data.id));
        });

        presenceChannel.current?.bind("pusher:subscription_succeeded", (members: any) => {
            console.log("Members", members);
            const players = Object.values(members.members).map((member: any) => ({
                ...member,
            }));

            setPlayers(players);
        });


        restoreGameStateFromCache();
    }, [pusher]); // Solo se ejecuta cuando pusher cambia

    if (!pusher) return null; // No renderiza nada hasta que pusher esté listo

    return (
        <div>
            <OverlayRenderer gameState={gameState} setGameState={setGameState} players={players} pusher={pusher} globalChannel={globalChannel} presenceChannel={presenceChannel} />
        </div>
    );
};
