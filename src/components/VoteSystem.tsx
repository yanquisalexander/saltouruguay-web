import type { Category, Vote } from "@/types/Awards"
import type { Session } from "@auth/core/types"
import { LucideMinus } from "lucide-preact"
import { useEffect, useState } from "preact/hooks"
import { VoteNominee } from "./VoteNominee"
import { toast } from "sonner"
import { VoteFinal } from "./VoteFinal"
import { IS_VOTES_OPEN } from "@/config"
import { NOMINEES } from "@/awards/Nominees"
/* 
 Son más de las 9:30 AM del 30 de Noviembre de 2024 en Uruguay?
*/

import { DateTime } from "luxon";


const MAX_VOTES_PER_CATEGORY = 2;

export const VoteSystem = ({ user, categories }: { user: Session['user'] | null, categories: Category[] }) => {

    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
    const [votesByCategory, setVotesByCategory] = useState<{ [key: string]: Vote[] }>({})
    const [isVotingFinished, setIsVotingFinished] = useState(false)

    const currentCategory = categories[currentCategoryIndex]
    const currentVotesCategory = currentCategory ? votesByCategory[currentCategory.id] || [] : []

    const isLastCategory = currentCategoryIndex === categories.length - 1

    const hasAlmostOneVotePerCategory = categories.every(category => votesByCategory[category.id]?.length > 0)

    const storageDraftKey = `saltoawards-${new Date().getFullYear()}`

    const now = DateTime.now().setZone("America/Montevideo");
    const targetTime = DateTime.local(2024, 11, 30, 9, 30).setZone(
        "America/Montevideo"
    );

    const isAfterTargetTime = now > targetTime;

    useEffect(() => {
        const savedVotes = localStorage.getItem(storageDraftKey)
        if (savedVotes) {

            if (!IS_VOTES_OPEN()) {
                localStorage.removeItem(storageDraftKey)
                return
            }

            const parsedVotes = JSON.parse(savedVotes)

            if (Object.keys(parsedVotes).length === 0) return
            setVotesByCategory(parsedVotes)

            toast.success("Se han cargado tus votos guardados en borrador")
        }
    }, [])

    const showMyVotes = () => {
        // Pantalla para ver el resumen de votos antes de enviar
        console.log("Votos actuales:", votesByCategory)
        if (!hasAlmostOneVotePerCategory) {
            toast.warning("Debes votar al menos una vez en cada categoría")
            return
        }
        setIsVotingFinished(true)
    }

    const returnToVoting = () => {
        setIsVotingFinished(false)
    }



    const handleVote = (nomineeId: string, categoryId: string) => {
        const isVoted = currentVotesCategory.some(vote => vote.nomineeId === nomineeId)

        if (isVoted) {
            const newVotes = currentVotesCategory.filter(vote => vote.nomineeId !== nomineeId)
            setVotesByCategory(prevVotes => ({
                ...prevVotes,
                [categoryId]: newVotes
            }))
            return
        }

        if (currentVotesCategory.length === MAX_VOTES_PER_CATEGORY) {
            console.log("Max votes reached")
            return
        }

        setVotesByCategory(prevVotes => ({
            ...prevVotes,
            [categoryId]: [...currentVotesCategory, { nomineeId, categoryId }]
        }))

    }

    useEffect(() => {
        console.log({ votesByCategory })
        localStorage.setItem(storageDraftKey, JSON.stringify(votesByCategory))
    }, [votesByCategory])

    const handleNextCategory = () => {
        if (isLastCategory) {
            console.log("Voting finished")
            return
        }
        setCurrentCategoryIndex(currentCategoryIndex + 1)
    }

    const handlePreviousCategory = () => {
        if (currentCategoryIndex === 0) {
            console.log("No previous category")
            return
        }
        setCurrentCategoryIndex(currentCategoryIndex - 1)
    }

    return (
        <div class="flex w-full max-w-5xl flex-col justify-center items-center gap-y-8">
            <div class="flex bg-brand-gray/5 w-full p-4 rounded-[10px] gap-x-4 items-center">
                <strong class="text-white">
                    Recordatorio:
                </strong>
                <p class="text-white text-sm">
                    Las votaciones abren el 01 de Diciembre de 2024
                </p>

            </div>
            {
                isVotingFinished ? (
                    <VoteFinal user={user} categories={categories} votes={votesByCategory} onReturn={returnToVoting} />
                ) : (
                    <>
                        <div class="flex gap-x-2">
                            <LucideMinus class="w-8 h-8 text-yellow-500" />
                            <h1 class="text-3xl font-anton">{currentCategory.name}</h1>
                            <LucideMinus class="w-8 h-8 text-yellow-500" />
                        </div>
                        <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {currentCategory.nominees.map((nominee, index) => {
                                const isVoted = currentVotesCategory.some(vote => vote.nomineeId === nominee.id)
                                return (
                                    <VoteNominee
                                        key={`${nominee.id}-${index}`}
                                        nominee={nominee}
                                        category={currentCategory}
                                        onVote={handleVote}
                                        isVoted={isVoted}
                                        index={index}
                                        currentVotesCategory={currentVotesCategory}
                                    />
                                )
                            })}
                        </ul>

                        <footer class="flex flex-col w-full gap-y-4">
                            <span class="font-teko text-2xl">
                                Categoría {currentCategoryIndex + 1} de {categories.length}
                            </span>
                            <nav class="flex justify-between">
                                <button
                                    class="bg-brand-gray/5 border border-transparent hover:bg-brand-gray/10 text-white font-bold py-2 px-4 rounded-[10px] transition-colors duration-300"
                                    onClick={handlePreviousCategory}>
                                    Anterior
                                </button>
                                {
                                    isLastCategory ? (
                                        <button
                                            class="bg-[#5865F2]/20 border border-[#5865F2] hover:drop-shadow-[0_0px_20px_rgba(8,_112,_184,_0.9)] hover:scale-105 gap-1.5 text-white px-4 py-2 rounded-[10px] flex items-center transition-transform duration-300 will-change-transform transform font-bold"
                                            onClick={showMyVotes}>
                                            Ver mis votos
                                        </button>
                                    ) : (
                                        <button
                                            class="bg-brand-gray/5 border border-transparent hover:bg-brand-gray/10 text-white font-bold py-2 px-4 rounded-[10px] transition-colors duration-300"
                                            onClick={handleNextCategory}>Siguiente</button>
                                    )
                                }
                            </nav>
                        </footer>
                    </>
                )
            }
        </div>
    )
}
