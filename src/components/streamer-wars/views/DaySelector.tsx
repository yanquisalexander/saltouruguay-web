const DAYS = [
    {
        number: 1,
        available: false,
    },
    {
        number: 2,
        available: false,
    },
    {
        number: 3,
        available: false,
    }
]
export const DaySelector = () => {
    return (
        <div class="flex flex-col justify-center space-x-4">
            <header class="text-center mb-12">
                <h2 class="text-4xl font-atomic text-zinc-100 -skew-y-6">
                    Bienvenido, jugador
                </h2>
                <p class="text-lg text-zinc-500">

                </p>
            </header>
            <div class="flex justify-center space-x-4">
                {DAYS.map(({ number: day, available }) => (
                    <button
                        key={day}
                        class={`font-atomic size-48 w-56 px-4 transition py-2 text-4xl bg-gray-800/40 border-2 border-gray-600 text-white rounded-md ${day === 2 ? "skew-y-6" : "-skew-y-6"
                            } ${!available ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-gray-800 hover:scale-105"
                            }`}
                    >
                        <span class="transform skew-x-6 text-lime-400">
                            Día {day}
                        </span>

                        {
                            !available && (
                                <span class="text-zinc-500 mt-2 text-xl block">
                                    No disponible
                                </span>
                            )
                        }
                    </button>
                ))}
            </div>
        </div>
    )

}