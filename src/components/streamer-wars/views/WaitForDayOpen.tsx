import type { Session } from "@auth/core/types";
import { StreamerWarsPlayers } from "../StreamerWarsPlayers";
import type { Players } from "@/components/admin/streamer-wars/Players";

const DAYS = [
    { number: 1, completed: false, pending: false },
    { number: 2, completed: false, pending: true },
    { number: 3, completed: false, pending: true },
    // Si agregas un día 4 en el futuro:
    // { number: 4, completed: false, pending: true }
];

export const WaitForDayOpen = ({ session, players }: { session: Session; players: Players[] }) => {
    return (
        // Corregido: En flex-col se usa gap-y o space-y, no space-x.
        <div class="flex flex-col items-center justify-center gap-y-12 text-center w-full">

            <StreamerWarsPlayers players={players} />

            <div class="w-full flex flex-col items-center">
                <h3 class="text-xl tracking-widest flex w-full justify-center mb-6 font-atomic text-neutral-300">
                    Jornadas
                </h3>

                <div class="flex flex-wrap justify-center gap-6">
                    {DAYS.map(({ number: day, completed, pending }) => {
                        // Lógica para que se inclinen en zigzag automáticamente (Día 1 izq, Día 2 der, Día 3 izq...)
                        const skewClass = day % 2 === 0 ? "skew-y-6" : "-skew-y-6";

                        return (
                            <button
                                key={day}
                                class={`
                                    font-atomic size-20 w-56 px-4 cursor-default transition py-2 text-3xl 
                                    bg-neutral-900/30 border-2 border-neutral-700 text-white rounded-md 
                                    flex flex-col items-center justify-center
                                    ${skewClass} 
                                    ${pending ? "grayscale opacity-50" : ""}
                                `}
                            >
                                <span class="transform skew-x-6 text-[#b4cd02]">
                                    Día {day}
                                </span>

                                {/* Renderizado condicional mejorado para los 3 posibles estados */}
                                {completed ? (
                                    <span class="text-neutral-500 font-squids mt-1 text-xl block">
                                        Completado
                                    </span>
                                ) : pending ? (
                                    <span class="text-neutral-600 font-squids mt-1 text-xl block">
                                        Próximamente
                                    </span>
                                ) : (
                                    <span class="text-neutral-300 font-squids mt-1 text-xl block animate-pulse">
                                        ¿Preparado?
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};