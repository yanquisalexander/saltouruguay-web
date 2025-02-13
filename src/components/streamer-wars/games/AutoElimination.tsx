import { useEffect, useState, useRef } from "preact/hooks";
import Pusher, { type Channel } from "pusher-js";
import type { Session } from "@auth/core/types";
import { toast } from "sonner";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { Instructions } from "../Instructions";

interface AutoEliminationProps {
    pusher: Pusher;
    session: Session | null;
}

export const AutoElimination = ({ pusher, session }: AutoEliminationProps) => {
    const [autoEliminatedPlayers, setAutoEliminatedPlayers] = useState<number[]>([]);
    const channelRef = useRef<Channel | null>(null);

    useEffect(() => {
        // Suscribirse al canal "auto-elimination"
        channelRef.current = pusher.subscribe("auto-elimination");

        const handlePlayerAutoEliminated = (data: { playerNumber: number }) => {
            setAutoEliminatedPlayers((prev) => {
                if (!prev.includes(data.playerNumber)) {
                    return [...prev, data.playerNumber];
                }
                return prev;
            });
            if (data.playerNumber === session?.user?.streamerWarsPlayerNumber) {
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION });
                toast.info("¡Te has autoeliminado!");
            } else {
                toast.info(
                    `El jugador #${data.playerNumber.toString().padStart(3, "0")} se ha autoeliminado`
                );
            }
        };

        channelRef.current.bind("player-autoeliminated", handlePlayerAutoEliminated);

        return () => {
            channelRef.current?.unbind("player-autoeliminated", handlePlayerAutoEliminated);
            channelRef.current?.unsubscribe();
        };
    }, [pusher, session]);

    // Función que se ejecuta al hacer click en el botón
    const handleClick = async () => {
        playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK });

        const { error } = await actions.streamerWars.selfEliminate();
        if (error) {
            console.error(error);
            toast.error(error.message);
            return;
        }
    };

    // Determinamos el número de jugador del usuario actual y los estados derivados
    const currentPlayerNumber = session?.user?.streamerWarsPlayerNumber;
    const hasAutoEliminated =
        currentPlayerNumber !== undefined &&
        autoEliminatedPlayers.includes(currentPlayerNumber);
    const canAutoEliminate = !hasAutoEliminated && autoEliminatedPlayers.length < 3;

    useEffect(() => {
        if (autoEliminatedPlayers.length === 3) {
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION });
            const formattedPlayers = new Intl.ListFormat(undefined, {
                style: "long",
                type: "conjunction",
            }).format(
                autoEliminatedPlayers.map((playerNumber) =>
                    `#${playerNumber.toString().padStart(3, "0")}`
                )
            );
            toast.info(
                `¡Los jugadores ${formattedPlayers} han aceptado la oferta de autoeliminación!`,
                { richColors: true }
            );
        }
    }, [autoEliminatedPlayers]);

    return (
        <>
            <Instructions duration={10000}>
                <p className="font-mono max-w-2xl text-left">
                    Durante el juego recibirás ofertas económicas. <br />
                    Recuerda que, al aceptarlas, quedarás eliminado del juego.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    <strong>Nota:</strong> Solo tres jugadores podrán optar por la autoeliminación; una vez alcanzado este límite, ya no podrás autoeliminarte.
                </p>

            </Instructions>
            <div class="flex flex-col items-center gap-y-2 mt-16">
                <header class="flex items-center gap-x-2">
                    <h2 class="text-xl font-anton">Autoeliminación</h2>
                </header>
                <span class="mb-8 text-sm text-gray-400">
                    ({autoEliminatedPlayers.length}/3)
                </span>

                {hasAutoEliminated ? (
                    <span class="text-red-500">¡Te has autoeliminado!</span>
                ) : canAutoEliminate ? (
                    <button
                        class="font-rubik uppercase bg-gradient-to-br from-red-400 to-red-600 hover:scale-110 hover:saturate-200 transition-all text-white size-48 rounded-full"
                        onClick={handleClick}
                    >
                        Autoeliminarse
                    </button>
                ) : (
                    <span class="text-red-500">Ya no puedes autoeliminarte</span>
                )}

                <aside class="flex flex-col gap-y-2 mt-8">
                    <header class="text-lg font-bold">Jugadores autoeliminados</header>
                    <ul class="flex flex-col gap-y-2">
                        {autoEliminatedPlayers.map((playerNumber) => (
                            <li
                                key={playerNumber}
                                class="flex items-center gap-x-2 bg-blue-500/20 border border-blue-500 p-2 rounded-lg"
                            >
                                <span class="text-neutral-400 font-rubik flex items-center gap-x-2">
                                    Jugador{" "}
                                    <span class="text-lime-500 text-2xl font-atomic">
                                        #{playerNumber.toString().padStart(3, "0")}
                                    </span>
                                </span>
                                <span class="text-gray-400">- Autoeliminado</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </>
    );
};
