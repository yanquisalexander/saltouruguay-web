import type { Session } from "@auth/core/types"
import { StreamerWarsPlayers } from "../StreamerWarsPlayers"

const DAYS = [
    {
        number: 1,
        completed: true,
        pending: false,
    },
    {
        number: 2,
        completed: true,
        pending: false,
    },
    {
        number: 3,
        completed: true,
        pending: false,
    }
]
export const WaitForDayOpen = ({ session, players }: { session: Session, players: any[] }) => {
    return (
        <div class="flex flex-col items-center justify-center space-x-4 text-center">


            <StreamerWarsPlayers players={players} />

            <div>
                <h3 class="text-xl tracking-widest flex mt-8 w-full justify-center mb-6 font-atomic text-neutral-300">
                    Jornadas
                </h3>
            </div>

            <div class="flex justify-center gap-4">
                {DAYS.map(({ number: day, completed, pending }) => (
                    <button
                        key={day}
                        class={`font-atomic size-20 w-56 px-4 cursor-default transition py-2 text-3xl bg-neutral-900/30 border-2 border-neutral-700 text-white rounded-md ${day === 2 ? "skew-y-6" : "-skew-y-6"} ${pending ? "grayscale opacity-60" : ""}`}
                    >
                        <span class="transform skew-x-6 text-[#b4cd02]">
                            Día {day}
                        </span>

                        {
                            completed ? (
                                <span class="text-neutral-500 font-squids -mt-1 text-xl block">
                                    Completado
                                </span>
                            ) : (!completed && !pending) && (
                                <span class="text-neutral-400 font-squids -mt-1 text-xl block">
                                    ¿Preparado?
                                </span>
                            )
                        }

                    </button>
                ))}
            </div>
        </div>
    )

}
