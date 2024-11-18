import { NOMINEES } from "@/awards/Nominees";
import type { Category, Vote } from "@/types/Awards";
import type { Session } from "@auth/core/types";
import { ActionError, actions, type ActionReturnType, type Actions } from "astro:actions";
import { LucideLoader } from "lucide-preact";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export const VoteFinal = ({ user, categories, votes, onReturn }: { user: Session['user'] | null, categories: Category[], votes: { [key: string]: Vote[] }, onReturn: () => void }) => {
    const [loading, setLoading] = useState(false)

    const sendVotes = async () => {
        setLoading(true)
        try {
            // Enviar votos al servidor
            toast.promise(actions.sendVotes({ votes }), {
                loading: "Enviando votos...",
                success: (data: ActionReturnType<Actions["sendVotes"]>) => {
                    console.log({ data })
                    if (data.error) {
                        setLoading(false)
                        throw new Error(data.error.message)
                    }
                    setLoading(false)
                    return "Votos enviados correctamente"
                },
                error: (e: ActionError) => {
                    setLoading(false)
                    return e.message
                }
            })
        } catch (error) {
            console.error("Error al enviar votos", error)
        }
    }

    return (
        <div class="flex flex-col w-full max-w-xl">
            <h2 class="text-2xl font-bold text-center uppercase font-rubik tracking-wider">
                Tus votos finales
            </h2>

            {
                categories.map(category => {
                    const categoryVotes = votes[category.id] || []
                    // Filtramos solo los nominados que han recibido votos
                    const votedNominees = category.nominees.filter(nominee =>
                        categoryVotes.some(vote => vote.nomineeId === nominee.id)
                    )

                    if (votedNominees.length === 0) return null  // No mostrar categorías sin votos

                    return (
                        <section key={category.id} class="w-full max-w-lg mt-8">
                            <h3 class="text-xl font-bold text-left uppercase font-rubik tracking-wider italic text-blue-400">{category.name}</h3>
                            <ul class="flex flex-col gap-y-4 mt-4">
                                {votedNominees.map(nominee => {
                                    const nomineeVotes = categoryVotes.filter(vote => vote.nomineeId === nominee.id)
                                    const nomineeFromConst = Object.values(NOMINEES).find(n => n.username === nominee.id)
                                    return (
                                        <li key={nominee.id} class="flex gap-y-2 gap-x-4 items-center">
                                            <img src={`https://ui-avatars.com/api/?name=${nomineeFromConst?.avatar}`} alt={nomineeFromConst?.displayName} class="size-10 rounded-full" />
                                            <div class="flex flex-col gap-y-2 items-center">
                                                <span class="font-bold">{nomineeFromConst?.displayName}</span>

                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )
                })
            }

            <footer class="flex w-full justify-between mt-8">
                <button
                    class="bg-brand-gray/5 hover:bg-brand-gray/10 text-white font-bold py-2 px-4 rounded-[10px] transition-colors duration-300"
                    onClick={onReturn}>
                    Volver
                </button>

                <button
                    disabled={loading}
                    class="bg-brand-gray/5 flex gap-x-2 hover:bg-brand-gray/10 text-white font-bold py-2 px-4 rounded-[10px] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={sendVotes}>
                    {
                        loading && <LucideLoader class="size-5 animate-rotate-360 animate-iteration-count-infinite" />
                    }
                    {
                        loading ? "Enviando votos..." : "Enviar votos"
                    }
                </button>
            </footer>
        </div>
    )
}
