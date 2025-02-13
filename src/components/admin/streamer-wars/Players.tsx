import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Teams } from "../Teams";
import { CINEMATICS_CDN_PREFIX } from "@/config";

export interface Players {
    id?: number;
    playerNumber: number;
    displayName: string;
    avatar: string;
    admin: boolean;
    online: boolean;
    eliminated: boolean;
}


const CINEMATICS_LIST = Array.from({ length: 10 }, (_, i) => ({
    id: `animacion-juego-${i + 1}`,
    name: `Animación de juego ${i + 1}`,
}));

const Morgue = ({ players, onClick }: { players: Players[], onClick: (playerNumber: number) => void }) => {
    /* 
        Mostrar una lista de jugadores eliminados, y la opción de "revivirlos".
    */

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Morgue</h1>
            <div class="grid gap-16 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {players.map((player) => (
                    <button
                        class={`flex flex-col relative overflow-hidden items-center  hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4`}
                        key={player.id}
                        onClick={() => onClick(player.playerNumber)}
                    >
                        <div class="relative size-16 rounded-full">
                            <img src={`/images/streamer-wars/players/${player.playerNumber.toString().padStart(3, "0")}.webp`}
                                onError={(e) => {
                                    e.currentTarget.src = player.avatar
                                }}
                                alt={player.displayName} class="w-full h-full rounded-full" />
                            {player.online && (
                                <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                            )}
                        </div>
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                        <span class="text-md text-white">{player.displayName}</span>
                        {
                            player.eliminated && <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-red-500 font-bold">
                                <span class="font-atomic text-2xl -rotate-45">
                                    ELIMINADO
                                </span>
                            </div>
                        }
                    </button>
                ))}
            </div>
        </div>
    );
}


export const StreamerWarsPlayers = ({ pusher }: { pusher: Pusher }) => {
    const [players, setPlayers] = useState<Players[]>([]);
    const [addNewPlayer, setAddNewPlayer] = useState({
        dialogOpen: false,
        loading: false,
        username: "",
        playerNumber: 0,
    });

    const globalChannel = pusher.subscribe("streamer-wars");

    useEffect(() => {
        if (!pusher) return;

        const presenceChannel = pusher.subscribe("presence-streamer-wars");

        presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
            const onlinePlayers = Object.values(members.members).map((member: any) => ({
                ...member,
                displayName: member.name,
                online: true,
            }));

            setPlayers((prev) =>
                prev.map((player) => ({
                    ...player,
                    online: onlinePlayers.some((p) => p.id === player.id),
                }))
            );
        });

        presenceChannel.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: true } : player))
            );
        });

        presenceChannel.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: false } : player))
            );
        });

        pusher?.channel('streamer-wars').bind('player-eliminated', ({ playerNumber }: { playerNumber: number }) => {
            toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} eliminado`)
            playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.08 });
            setPlayers((prev) =>
                prev.map((player) => (player.playerNumber === playerNumber ? { ...player, eliminated: true } : player))
            );
        });

        pusher.channel('streamer-wars').bind('player-revived', ({ playerNumber }: { playerNumber: number }) => {
            toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} revivido`)
            playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK, volume: 0.08 });
            setPlayers((prev) =>
                prev.map((player) => (player.playerNumber === playerNumber ? { ...player, eliminated: false } : player))
            );
        });

        return () => {
            presenceChannel.unbind_all();
            presenceChannel.unsubscribe();
        };
    }, [pusher]);



    const reloadPlayers = () => {
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
    }

    const handleAddNewPlayer = async () => {
        const { playerNumber, username } = addNewPlayer;

        if (!playerNumber || !username) {
            toast.error("Por favor, rellena todos los campos");
            return;
        }

        const { error } = await actions.streamerWars.addPlayer({ playerNumber, twitchUsername: username });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} añadido`);

        setAddNewPlayer((prev) => ({ ...prev, dialogOpen: false, loading: false }));
        reloadPlayers();
    };

    useEffect(() => {
        reloadPlayers();
    }, []);



    const eliminatePlayer = async (playerNumber: number, event: MouseEvent) => {
        /* 
            Is shift + click pressed? If so, it should remove PERMANENTLY the player from the game.
        */

        if (event.shiftKey) {
            if (!confirm(`ATENCION: ¿Estás seguro de eliminar PERMANENTEMENTE al jugador #${playerNumber?.toString().padStart(3, "0")}? Esto lo eliminará de la base de datos y no podrá ser recuperado.`)) return
            const response = await actions.streamerWars.removePlayer({ playerNumber });

            if (response.error) {
                console.error(response.error);
                toast.error(response.error.message);
                return
            }

            setPlayers((prev) => prev.filter((player) => player.playerNumber !== playerNumber));

            reloadPlayers();

            return


        }

        if (!confirm(`¿Estás seguro de eliminar al jugador #${playerNumber?.toString().padStart(3, "0")}?`)) return;

        const response = await actions.streamerWars.eliminatePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }
    };

    const revivePlayer = async (playerNumber: number) => {
        if (!confirm(`¿Estás seguro de revivir al jugador #${playerNumber?.toString().padStart(3, "0")}?`)) return;

        const response = await actions.streamerWars.revivePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }
    }

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Jugadores</h1>
            <div class="grid gap-16 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {players.map((player) => (
                    <button
                        onClick={(e) => eliminatePlayer(player.playerNumber, e)}
                        class={`flex flex-col relative overflow-hidden items-center  hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4 ${player.eliminated ? "pointer-events-none" : ""
                            }`}
                        key={player.id}
                    >
                        <div class="relative size-16 rounded-full">
                            <img src={`/images/streamer-wars/players/${player.playerNumber.toString().padStart(3, "0")}.webp`}
                                onError={(e) => {
                                    e.currentTarget.src = player.avatar
                                }}
                                alt={player.displayName} class="w-full h-full rounded-full" />
                            {player.online && (
                                <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                            )}
                        </div>
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
                        <span class="text-md text-white">{player.displayName}</span>
                        {
                            player.eliminated && <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-red-500 font-bold">
                                <span class="font-atomic text-2xl -rotate-45">
                                    ELIMINADO
                                </span>
                            </div>
                        }
                    </button>
                ))}
            </div>

            {
                players.some((player) => player.eliminated) && (
                    <Morgue players={players.filter((player) => player.eliminated)} onClick={revivePlayer} />
                )
            }



            <Teams channel={globalChannel} />

            <dialog
                class="max-w-[540px] w-full fixed inset-0 z-[99999999] p-8 animate-fade-in-up bg-[#0b1422] border border-line rounded-xl shadow-2xl text-white"

                open={addNewPlayer.dialogOpen}
            >
                <div class="rounded-lg">
                    <h1 class="text-2xl font-bold mb-4">Añadir nuevo jugador</h1>
                    <div class="flex flex-col gap-y-4 items-center justify-center">
                        <input
                            type="number"
                            class="bg-gray-800/50 rounded-lg p-4 w-full"
                            placeholder="Número de jugador"
                            value={addNewPlayer.playerNumber}
                            onInput={(e) => setAddNewPlayer((prev) => ({ ...prev, playerNumber: parseInt(e.currentTarget.value) }))}
                        />
                        <input
                            type="text"
                            class="bg-gray-800/50 rounded-lg p-4 w-full"
                            placeholder="Nombre de usuario de Twitch"
                            value={addNewPlayer.username}
                            onInput={(e) => setAddNewPlayer((prev) => ({ ...prev, username: e.currentTarget.value }))}
                        />
                    </div>
                    <footer class="flex justify-between mt-8">
                        <button
                            class="bg-red-500 text-white px-4 py-2 rounded-lg"
                            onClick={() => setAddNewPlayer((prev) => ({ ...prev, dialogOpen: false }))}
                        >
                            Cancelar
                        </button>
                        <button
                            class="bg-blue-500 text-white px-4 py-2 rounded-lg"
                            onClick={handleAddNewPlayer}
                        >
                            {addNewPlayer.loading ? "Cargando..." : "Añadir"}
                        </button>
                    </footer>

                </div>
            </dialog>

            <div
                class="dialog-background inset-0 w-dvw h-dvh backdrop-blur-sm bg-white/5 z-[9999999] animate-blurred-fade-in"
            >
            </div>

            <button
                class="bg-blue-500 text-white px-4 py-2 rounded-lg mt-8"
                onClick={() => setAddNewPlayer((prev) => ({ ...prev, dialogOpen: true }))}
            >
                Añadir nuevo jugador
            </button>

            <div class="cinematics-launcher mt-8">
                <h2 class="text-2xl font-bold mb-4">Animaciones de juego</h2>
                <div class="grid grid-cols-2 gap-4">
                    {CINEMATICS_LIST.map(({ id, name }) => (
                        <button
                            class="p-4 rounded-lg bg-gray-800 text-white font-bold"
                            onClick={() => {
                                toast.promise(
                                    actions.admin.launchCinematic({
                                        url: `${CINEMATICS_CDN_PREFIX}/${id}.webm`,
                                        targetUsers: players.map((player) => player.id).filter((id): id is number => id !== undefined),
                                    }), {
                                    loading: 'Cargando...',
                                    success: 'Animación lanzada',
                                    error: 'Error al lanzar la animación'
                                });
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
