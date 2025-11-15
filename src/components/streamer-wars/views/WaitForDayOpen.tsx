import type { Session } from "@auth/core/types"
import { ConnectedPlayers } from "../ConnectedPlayers"

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
        <div class="flex flex-col items-center justify-center space-x-4 mt-8 text-center">
            <header class="mb-8">
                <h3 class="with-glyph flex relative w-max text-3xl transform px-2 font-atomic tracking-wider font-bold text-neutral-500">
                    <span class="flex transform">Guerra de Streamers</span>
                </h3>

                <h2 class="text-4xl font-atomic text-[#b4cd02] -skew-y-6 mt-6">
                    Bienvenido, <span class="text-[#b4cd02] tracking-wider">{session.user.name}</span>
                </h2>

                <p class="text-lg text-neutral-400 animate-pulse mt-4 font-anton" style={{ animationDuration: "4.5s" }}>
                    Esperando a que la jornada comience
                </p>
            </header>

            <ConnectedPlayers players={players} />

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
