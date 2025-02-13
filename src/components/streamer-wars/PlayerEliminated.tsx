import type { Session } from "@auth/core/types";
import { navigate } from "astro:transitions/client";
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

            if (playerNumber === session.user.streamerWarsPlayerNumber) {
                setTimeout(() => navigate('/guerra-streamers'), 2000);
            }
            setTimeout(() => setShowing(false), 5000);
        }
    }, [playerNumber]);


    return (
        <div class={`z-[6500] fixed inset-0 bottom-0 left-0 right-0 min-h-screen w-full bg-black p-4 flex items-center justify-center transition animate-duration-[2500ms] ${showing ? "animate-fade-in" : "animate-fade-out pointer-events-none"}`}>
            <div class=" text-white p-4 rounded-lg">
                <span class={`relative text-center animate-duration-[4000ms] ${showing && "animate-scale"}`}>
                    <h2 class="text-6xl font-bold font-atomic text-red-500 -rotate-6 skew-x-12">
                        Eliminado
                    </h2>
                    <span class="absolute -bottom-14 text-red-500 inset-x-0 text-7xl font-bold font-atomic-extras -rotate-6 skew-x-12">
                        a
                    </span>
                </span>
                <p class="text-2xl font-rubik pt-16 text-center">
                    {playerNumber === session.user.streamerWarsPlayerNumber ? "¡Has sido eliminado!" : `El jugador #${playerNumber?.toString().padStart(3, '0')} ha sido eliminado`}
                </p>

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