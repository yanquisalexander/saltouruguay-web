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
    aislated?: boolean;
    isLiveOnTwitch?: boolean;
}

const CINEMATICS_LIST = Array.from({ length: 11 }, (_, i) => ({
    id: `animacion-juego-${i + 1}`,
    name: `Animación de juego ${i + 1}`,
}));

const Morgue = ({
    players,
    onClick,
}: {
    players: Players[];
    onClick: (playerNumber: number) => void;
}) => {
    /* 
        Mostrar una lista de jugadores eliminados, y la opción de "revivirlos".
    */
    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Morgue</h1>
            <div class="grid gap-16 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {players.map((player) => (
                    <button
                        class={`flex flex-col relative overflow-hidden items-center hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4`}
                        key={player.id}
                        onClick={() => onClick(player.playerNumber)}
                    >
                        <div class="relative size-16 rounded-full">
                            <img
                                src={`/images/streamer-wars/players/${player.playerNumber
                                    .toString()
                                    .padStart(3, "0")}.webp`}
                                onError={(e) => {
                                    e.currentTarget.src = player.avatar;
                                }}
                                alt={player.displayName}
                                class="w-full h-full rounded-full"
                            />
                            {player.online && (
                                <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                            )}
                        </div>
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">
                            #{player.playerNumber?.toString().padStart(3, "0")}
                        </p>
                        <span class="text-md text-white">{player.displayName}</span>
                        {player.eliminated && (
                            <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-red-500 font-bold">
                                <span class="font-atomic text-2xl -rotate-45">
                                    ELIMINADO
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};


export const StreamerWarsPlayers = ({ pusher }: { pusher: Pusher }) => {
    const [players, setPlayers] = useState<Players[]>([]);
    const [playersLiveOnTwitch, setPlayersLiveOnTwitch] = useState<string[]>([]);
    const [addNewPlayer, setAddNewPlayer] = useState({
        dialogOpen: false,
        loading: false,
        username: "",
        playerNumber: 0,
    });

    // Estado para el menú contextual
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        playerNumber: number | null;
    }>({
        visible: false,
        x: 0,
        y: 0,
        playerNumber: null,
    });

    const globalChannel = pusher.subscribe("streamer-wars");

    const ContextualMenuActions = [
        {
            name: "Eliminar",
            execute: (playerNumber: number) => handleNormalElimination(playerNumber),
        },
        {
            name: "Eliminar permanentemente",
            execute: (playerNumber: number) => handlePermanentElimination(playerNumber),
        },
        {
            name: "Revivir",
            execute: (playerNumber: number) => revivePlayer(playerNumber),
        },
        {
            name: "Aislar/Quitar aislamiento",
            execute: (playerNumber: number) => {
                const player = players.find((p) => p.playerNumber === playerNumber);
                if (player?.aislated) {
                    unaislatePlayer(playerNumber);
                } else {
                    aislatePlayer(playerNumber);
                }
            }
        }
    ];

    useEffect(() => {
        if (!pusher) return;

        const presenceChannel = pusher.subscribe("presence-streamer-wars");

        presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
            const onlinePlayers = Object.values(members.members).map((member: any) => ({
                ...member,
                displayName: member.name,
                online: true,
                isLiveOnTwitch: playersLiveOnTwitch.includes(member.info?.displayName.toLowerCase())
            }));

            setPlayers((prev) =>
                prev.map((player) => ({
                    ...player,
                    online: onlinePlayers.some((p) => p.id === player.id),
                    isLiveOnTwitch: playersLiveOnTwitch.includes(player.displayName.toLowerCase())
                }))
            );
        });

        presenceChannel.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === member.info.id ? { ...player, online: true, isLiveOnTwitch: playersLiveOnTwitch.includes(player.displayName.toLowerCase()) } : player
                )
            );
        });

        presenceChannel.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === member.info.id ? { ...player, online: false } : player
                )
            );
        });

        pusher.channel("streamer-wars").bind(
            "players-unaislated", () => {
                toast.success(
                    `Los jugadores han sido quitados del aislamiento`
                );
                setPlayers((prev) =>
                    prev.map((player) =>
                        ({ ...player, aislated: false })
                    )
                );
            }
        );

        pusher?.channel("streamer-wars").bind(
            "player-eliminated",
            ({ playerNumber }: { playerNumber: number }) => {
                toast.success(
                    `Jugador #${playerNumber?.toString().padStart(3, "0")} eliminado`
                );
                playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.08 });
                setPlayers((prev) =>
                    prev.map((player) =>
                        player.playerNumber === playerNumber
                            ? { ...player, eliminated: true }
                            : player
                    )
                );
            }
        );

        pusher.channel("streamer-wars").bind(
            "player-aislated",
            ({ playerNumber }: { playerNumber: number }) => {
                toast.success(
                    `Jugador #${playerNumber?.toString().padStart(3, "0")} aislado`
                );
                setPlayers((prev) =>
                    prev.map((player) =>
                        player.playerNumber === playerNumber
                            ? { ...player, aislated: true }
                            : player
                    )
                );
            }
        );

        pusher.channel("streamer-wars").bind(
            "players-aislated", ({ playerNumbers }: { playerNumbers: number[] }) => {
                toast.success(
                    `Los jugadores ${new Intl.ListFormat("es-ES").format(playerNumbers.map((playerNumber) => `#${playerNumber?.toString().padStart(3, "0")}`))} han sido aislados`
                );
                setPlayers((prev) =>
                    prev.map((player) =>
                        playerNumbers.includes(player.playerNumber)
                            ? { ...player, aislated: true }
                            : player
                    )
                );
            }
        );
        pusher.channel("streamer-wars").bind(
            "player-unaislated",
            ({ playerNumber }: { playerNumber: number }) => {
                toast.success(
                    `Jugador #${playerNumber?.toString().padStart(3, "0")} quitado del aislamiento`
                );
                setPlayers((prev) =>
                    prev.map((player) =>
                        player.playerNumber === playerNumber
                            ? { ...player, aislated: false }
                            : player
                    )
                );
            }
        );

        pusher.channel("streamer-wars").bind(
            "player-revived",
            ({ playerNumber }: { playerNumber: number }) => {
                toast.success(
                    `Jugador #${playerNumber?.toString().padStart(3, "0")} revivido`
                );
                playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK, volume: 0.08 });
                setPlayers((prev) =>
                    prev.map((player) =>
                        player.playerNumber === playerNumber
                            ? { ...player, eliminated: false }
                            : player
                    )
                );
            }
        );

        fetchPlayersLiveOnTwitch();


        return () => {
            presenceChannel.unbind_all();
            presenceChannel.unsubscribe();
        };
    }, [pusher]);

    const fetchPlayersLiveOnTwitch = async () => {
        const { error, data } = await actions.streamerWars.getPlayersLiveOnTwitch();

        console.log({ error, data });

        if (error) {
            console.error(error);
            return;
        }

        setPlayersLiveOnTwitch(data.players.map((player) => player.userName));
    }

    useEffect(() => {
        /* 
            Every 60 seconds, fetch the players that are live on Twitch
        */

        fetchPlayersLiveOnTwitch();
        const intervalId = setInterval(fetchPlayersLiveOnTwitch, 60000);

        // @ts-ignore
        return () => clearInterval(intervalId);
    }, []);

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
                            displayName: player.displayName || player.name || "",
                            avatar: player.avatar || "",
                            admin: player.admin || false,
                            online: false,
                            eliminated: player.eliminated || false,
                            aislated: player.aislated || false,
                            isLiveOnTwitch: playersLiveOnTwitch.includes(player.displayName.toLowerCase()),
                        });
                    }
                });

                return mergedPlayers;
            });
        });
    };

    // Función para eliminar normalmente (sin eliminación definitiva)
    const handleNormalElimination = async (playerNumber: number) => {
        if (
            !confirm(
                `¿Estás seguro de eliminar al jugador #${playerNumber
                    .toString()
                    .padStart(3, "0")}?`
            )
        )
            return;

        const response = await actions.streamerWars.eliminatePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }
    };

    // Función para eliminar permanentemente (eliminación definitiva)
    const handlePermanentElimination = async (playerNumber: number) => {
        if (
            !confirm(
                `ATENCIÓN: ¿Estás seguro de eliminar PERMANENTEMENTE al jugador #${playerNumber
                    .toString()
                    .padStart(3, "0")}? Esto lo eliminará de la base de datos y no podrá ser recuperado.`
            )
        )
            return;

        const response = await actions.streamerWars.removePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }

        setPlayers((prev) =>
            prev.filter((player) => player.playerNumber !== playerNumber)
        );

        reloadPlayers();
    };

    const revivePlayer = async (playerNumber: number) => {
        if (
            !confirm(
                `¿Estás seguro de revivir al jugador #${playerNumber
                    .toString()
                    .padStart(3, "0")}?`
            )
        )
            return;

        const response = await actions.streamerWars.revivePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }
    };

    const aislatePlayer = async (playerNumber: number) => {
        if (
            !confirm(
                `¿Estás seguro de aislar al jugador #${playerNumber
                    .toString()
                    .padStart(3, "0")}?`
            )
        )
            return;

        const response = await actions.streamerWars.aislatePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }

        reloadPlayers();
    }

    const unaislatePlayer = async (playerNumber: number) => {
        if (
            !confirm(
                `¿Estás seguro de quitar el aislamiento al jugador #${playerNumber
                    .toString()
                    .padStart(3, "0")}?`
            )
        )
            return;

        const response = await actions.streamerWars.unaislatePlayer({ playerNumber });

        if (response.error) {
            console.error(response.error);
            toast.error(response.error.message);
            return;
        }

        reloadPlayers();
    }

    useEffect(() => {
        reloadPlayers();
    }, []);

    // Cierra el menú contextual al hacer click en cualquier parte de la ventana
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.visible) {
                setContextMenu((prev) => ({ ...prev, visible: false }));
            }
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-2xl font-bold mb-4">Jugadores</h1>
            <div class="grid gap-16 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {players.map((player) => (
                    <button
                        // Al hacer click izquierdo se ejecuta la eliminación normal
                        onClick={() => handleNormalElimination(player.playerNumber)}
                        // Con click derecho se abre el menú contextual
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                                visible: true,
                                x: e.clientX,
                                y: e.clientY,
                                playerNumber: player.playerNumber,
                            });
                        }}
                        class={`flex flex-col relative overflow-hidden items-center hover:scale-105 hover:bg-lime-500/20 transition rounded-lg p-4 ${player.eliminated ? "pointer-events-none" : ""
                            }`}
                        key={player.id}
                    >
                        <div class="relative size-16 rounded-full">
                            <img
                                src={player.avatar}
                                alt={player.displayName}
                                class="w-full h-full rounded-full"
                            />
                            {player.online && (
                                <div class="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 rounded-full ring-2 ring-black"></div>
                            )}
                        </div>
                        <p class="text-2xl text-lime-400 mt-2 font-atomic">
                            #{player.playerNumber?.toString().padStart(3, "0")}
                        </p>
                        <span class="text-md text-white">{player.displayName}</span>
                        {player.eliminated && (
                            <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-red-500 font-bold">
                                <span class="font-atomic text-2xl -rotate-45">
                                    ELIMINADO
                                </span>
                            </div>
                        )}
                        {
                            player.aislated && (
                                <div class="absolute animate-fade-in inset-0 bg-black/50 flex items-center justify-center text-yellow-500 font-bold">
                                    <span class="font-atomic text-2xl -rotate-45">
                                        AISLADO
                                    </span>
                                </div>
                            )
                        }

                        {
                            player.isLiveOnTwitch && (
                                <div class="absolute top-0 right-0 bg-twitch rounded-bl-lg p-1 bg-electric-violet-500 text-white text-xs font-medium">
                                    <span class="font-teko">
                                        EN VIVO
                                    </span>
                                </div>
                            )

                        }
                    </button>
                ))}
            </div>

            {/* Si hay jugadores eliminados, mostramos el Morgue */}
            {players.some((player) => player.eliminated) && (
                <Morgue
                    players={players.filter((player) => player.eliminated)}
                    onClick={revivePlayer}
                />
            )}

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
                            onInput={(e) =>
                                setAddNewPlayer((prev) => ({
                                    ...prev,
                                    playerNumber: parseInt(e.currentTarget.value),
                                }))
                            }
                        />
                        <input
                            type="text"
                            class="bg-gray-800/50 rounded-lg p-4 w-full"
                            placeholder="Nombre de usuario de Twitch"
                            value={addNewPlayer.username}
                            onInput={(e) =>
                                setAddNewPlayer((prev) => ({
                                    ...prev,
                                    username: e.currentTarget.value,
                                }))
                            }
                        />
                    </div>
                    <footer class="flex justify-between mt-8">
                        <button
                            class="bg-red-500 text-white px-4 py-2 rounded-lg"
                            onClick={() =>
                                setAddNewPlayer((prev) => ({ ...prev, dialogOpen: false }))
                            }
                        >
                            Cancelar
                        </button>
                        <button
                            class="bg-blue-500 text-white px-4 py-2 rounded-lg"
                            onClick={async () => {
                                const { playerNumber, username } = addNewPlayer;

                                if (!playerNumber || !username) {
                                    toast.error("Por favor, rellena todos los campos");
                                    return;
                                }

                                const { error } = await actions.streamerWars.addPlayer({
                                    playerNumber,
                                    twitchUsername: username,
                                });

                                if (error) {
                                    toast.error(error.message);
                                    return;
                                }

                                toast.success(
                                    `Jugador #${playerNumber
                                        .toString()
                                        .padStart(3, "0")} añadido`
                                );

                                setAddNewPlayer((prev) => ({
                                    ...prev,
                                    dialogOpen: false,
                                    loading: false,
                                }));
                                reloadPlayers();
                            }}
                        >
                            {addNewPlayer.loading ? "Cargando..." : "Añadir"}
                        </button>
                    </footer>
                </div>
            </dialog>

            <div class="dialog-background inset-0 w-dvw h-dvh backdrop-blur-sm bg-white/5 z-[9999999] animate-blurred-fade-in"></div>

            <button
                class="bg-blue-500 text-white px-4 py-2 rounded-lg mt-8"
                onClick={() =>
                    setAddNewPlayer((prev) => ({ ...prev, dialogOpen: true }))
                }
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
                                        targetUsers: players
                                            .map((player) => player.id)
                                            .filter((id): id is number => id !== undefined),
                                    }),
                                    {
                                        loading: "Cargando...",
                                        success: "Animación lanzada",
                                        error: "Error al lanzar la animación",
                                    }
                                );
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menú contextual */}
            {contextMenu.visible && (
                <div
                    class="fixed z-[10000] bg-gray-800 text-white rounded shadow-lg p-2"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {
                        // Mostrar acciones según el jugador seleccionado
                        ContextualMenuActions.map(({ name, execute }) => (
                            <button
                                class="block w-full text-left px-2 py-1 hover:bg-gray-700 rounded"
                                onClick={() => {
                                    if (contextMenu.playerNumber !== null) {
                                        execute(contextMenu.playerNumber);
                                    }
                                    setContextMenu((prev) => ({ ...prev, visible: false }));
                                }}
                            >
                                {name}
                            </button>
                        ))
                    }

                    <button
                        class="block w-full text-left px-2 py-1 hover:bg-gray-700 rounded"
                        onClick={() => {
                            setContextMenu((prev) => ({ ...prev, visible: false }));
                        }}
                    >
                        Cerrar
                    </button>

                </div>
            )}
        </div>
    );
};
