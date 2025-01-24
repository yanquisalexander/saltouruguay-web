import type { Session } from "@auth/core/types";
import { useEffect, useState } from "preact/hooks";

export const PlayerEliminated = ({ playerNumber, session }: { playerNumber: number | null, session: Session }) => {
    const [showing, setShowing] = useState(false);

    /* 
        Cuando playerNumber sea diferente de null, mostrar un mensaje de eliminación
        durante 3 segundos y luego ocultarlo.
    */

    useEffect(() => {
        if (playerNumber) {
            setShowing(true);
            setTimeout(() => setShowing(false), 5000);
        }
    }, [playerNumber]);

    return (
        <div class={`z-[999] fixed bottom-0 left-0 right-0 min-h-screen w-full bg-black/85 p-4 flex items-center justify-center transition-opacity duration-[4000ms] ${showing ? "opacity-100" : "opacity-0"}`}>
            <div class=" text-white p-4 rounded-lg">
                <span class={`relative text-center animate-duration-[4000ms] ${showing && "animate-scale"}`}>
                    <h2 class="text-6xl font-bold font-atomic text-red-500 -rotate-6 skew-x-12">
                        Eliminado
                    </h2>
                    <span class="absolute -bottom-14 text-red-500 inset-x-0 text-7xl font-bold font-atomic-extras -rotate-6 skew-x-12">
                        a
                    </span>
                </span>
                <p class="text-2xl font-anton pt-16">
                    {playerNumber === session.user.streamerWarsPlayerNumber ? "¡Has sido eliminado!" : `El jugador #${playerNumber} ha sido eliminado`}
                </p>
            </div>
        </div>
    );
}