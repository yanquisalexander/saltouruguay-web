import type { Session } from "@auth/core/types";
import { navigate } from "astro:transitions/client";
import { useEffect, useState } from "preact/hooks";

export const PlayerEliminated = ({ playerNumber, session }: { playerNumber: number | number[] | null, session: Session | null }) => {
    const [showing, setShowing] = useState(false);
    const [key, setKey] = useState(0);

    /* 
        Cuando playerNumber sea diferente de null, mostrar un mensaje de eliminación
        durante 3 segundos y luego ocultarlo.
    */

    useEffect(() => {
        if (playerNumber !== null) {
            setShowing(true);
            setKey(Math.random());

            if (!Array.isArray(playerNumber) && playerNumber === session?.user.streamerWarsPlayerNumber) {
                setTimeout(() => navigate('/guerra-streamers'), 2000);
                return
            } else if (Array.isArray(playerNumber) && playerNumber.includes(session?.user.streamerWarsPlayerNumber!)) {
                setTimeout(() => navigate('/guerra-streamers'), 2000);
                return
            }


            setTimeout(() => setShowing(false), Array.isArray(playerNumber) ? 10000 : 5000);
        }
    }, [playerNumber]);


    return (
        <div
            key={key}
            class={`z-[6500] fixed inset-0 bottom-0 left-0 right-0 min-h-screen w-full bg-black p-4 flex items-center justify-center transition animate-duration-[2500ms] ${showing ? "animate-fade-in" : "animate-fade-out pointer-events-none"}`}>
            <div class=" text-white p-4 rounded-lg">
                <span
                    class="relative flex flex-col justify-center text-center animate-duration-[4000ms] animate-scale">
                    <span class="font-squids  text-lg text-center mb-8 font-bold text-neutral-400">
                        Gracias por participar
                    </span>
                    <div class="relative">
                        <h2 class="text-6xl font-bold font-atomic text-red-500 -rotate-6 skew-x-12">
                            Eliminado{Array.isArray(playerNumber) ? 's' : ''}
                        </h2>
                        <span class="absolute -bottom-14 text-red-500 inset-x-0 text-7xl font-bold font-atomic-extras -rotate-6 skew-x-12">
                            a
                        </span>
                    </div>
                    <p class={`text-3xl font-teko pt-16 mx-auto text-center text-white ${Array.isArray(playerNumber) ? 'max-w-[90%]' : ''}`}>
                        {Array.isArray(playerNumber)
                            ? playerNumber.includes(session?.user.streamerWarsPlayerNumber!)
                                ? "¡Has sido eliminado!"
                                : `Los jugadores ${new Intl.ListFormat("es-ES").format(
                                    playerNumber.map((n: number) => `#${n.toString().padStart(3, "0")}`)
                                )} han sido eliminados`
                            : playerNumber === session?.user.streamerWarsPlayerNumber
                                ? "¡Has sido eliminado!"
                                : `El jugador #${playerNumber?.toString().padStart(3, "0")} ha sido eliminado`
                        }

                    </p>
                </span>

            </div>
            <h2 className="text-2xl fixed bottom-16 font-atomic text-neutral-500 select-none -skew-y-6">
                <span className="tracking-wider">Guerra de Streamers</span>
            </h2>
            <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                &#x0055;
            </span>
            <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                &#x0050;
            </span>
        </div>
    );
}