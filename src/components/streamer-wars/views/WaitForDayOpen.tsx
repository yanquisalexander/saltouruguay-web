import type { Session } from "@auth/core/types"
import { ConnectedPlayers } from "../ConnectedPlayers"

const DAYS = [
    {
        number: 1,
        completed: false,
        pending: true,
    },
    {
        number: 2,
        completed: false,
        pending: true,
    },
    {
        number: 3,
        completed: false,
        pending: true,
    }
]
export const WaitForDayOpen = ({ session, players }: { session: Session, players: any[] }) => {
    console.log(players)
    return (
        <div class="flex flex-col justify-center space-x-4 mt-8">
            <header class="text-center mb-12">
                <h2 class="text-4xl  font-atomic text-zinc-100 -skew-y-6">
                    Bienvenido, <span class="text-lime-400 tracking-wider">{session.user.name}</span>
                </h2>
                <p class="text-lg text-zinc-500 animate-pulse mt-8 font-anton"
                    style={{
                        animationDuration: "4.5s"
                    }}>
                    Esperando a que la jornada comience
                </p>
            </header>
            <ConnectedPlayers players={players} />
            <div>
                <h3 class="text-xl tracking-widest flex mt-8 w-full justify-center mb-8 font-atomic text-zinc-300">
                    Jornadas
                </h3>
            </div>

            <div class="flex justify-center space-x-4">
                {DAYS.map(({ number: day, completed, pending }) => (
                    <button
                        key={day}
                        class={`font-atomic size-20 w-56 px-4 cursor-default transition py-2 text-3xl bg-gray-800/40 border-2 border-gray-600 text-white rounded-md ${day === 2 ? "skew-y-6" : "-skew-y-6"
                            } 
                            ${pending && "grayscale opacity-60"} 
                            `}
                    >
                        <span class="transform skew-x-6 text-lime-400">
                            Día {day}
                        </span>

                        {
                            completed && (
                                <span class="text-zinc-500 -mt-1 text-xl block">
                                    Completado
                                </span>
                            )
                        }


                    </button>
                ))}
            </div>
        </div>
    )

}