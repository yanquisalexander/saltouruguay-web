import type { Category, Vote } from "@/types/Awards"
import type { Session } from "@auth/core/types"
import { LucideCheckCircle2, LucideCircleDashed, LucideMinus, LucideTrophy } from "lucide-preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { VoteNominee } from "./VoteNominee"
import { toast } from "sonner"
import { VoteFinal } from "./VoteFinal"
import { IS_VOTES_OPEN } from "@/config"
import { NOMINEES } from "@/awards/Nominees"
/* 
 Son más de las 9:30 AM del 30 de Noviembre de 2024 en Uruguay?
*/

import { DateTime } from "luxon";
import { AwardsInmersiveIntro } from "./streamer-wars/AwardsInmersiveIntro"
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds"


const MAX_VOTES_PER_CATEGORY = 2;

export const VoteSystem = ({ user, categories }: { user: Session['user'] | null, categories: Category[] }) => {

    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
    const [votesByCategory, setVotesByCategory] = useState<{ [key: string]: Vote[] }>({})
    const [isVotingFinished, setIsVotingFinished] = useState(false)
    const [hasShownFirstVoteToast, setHasShownFirstVoteToast] = useState(false)

    const currentCategory = categories[currentCategoryIndex]
    const currentVotesCategory = currentCategory ? votesByCategory[currentCategory.id] || [] : []

    const isLastCategory = currentCategoryIndex === categories.length - 1

    const hasAlmostOneVotePerCategory = categories.every(category => votesByCategory[category.id]?.length > 0)

    const storageDraftKey = `saltoawards-${new Date().getFullYear()}`

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

            // toast.success("Se han cargado tus votos guardados en borrador")
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

    useEffect(() => {
        const totalVotes = Object.values(votesByCategory).flat().length
        if (!hasShownFirstVoteToast && totalVotes > 0) {
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION })
            toast.success("¡Primer voto registrado! Recuerda que puedes votar hasta dos nominados por categoría.", { position: 'bottom-center', richColors: true })
            setHasShownFirstVoteToast(true)
        }
    }, [votesByCategory, hasShownFirstVoteToast])

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

    const currentUserIsNominee = Object.values(NOMINEES).some(nominee => nominee.username === user?.name?.toLowerCase())

    return (
        <div class="flex w-full max-w-5xl flex-col justify-center items-center gap-y-8">
            {
                currentUserIsNominee && (
                    <div class="bg-blue-500/5 border w-full font-rubik p-4 border-dashed  gap-x-2 items-center">
                        <strong class="text-white font-normal font-anton">
                            ¡Eres un nominado! 🎉
                        </strong>
                        <p class="text-white text-sm">
                            Pronto recibirás el logro <strong>"Yo estuve ahi IV"</strong> por ser parte de los nominados de los Salto Awards {new Date().getFullYear()}
                        </p>

                    </div>
                )
            }

            {
                isVotingFinished ? (
                    <VoteFinal user={user} categories={categories} votes={votesByCategory} onReturn={returnToVoting} />
                ) : (
                    <>
                        <AwardsInmersiveIntro />
                        <div class="flex gap-x-2">
                            <LucideMinus class="w-8 h-8 text-yellow-500" />
                            <h1 class="text-3xl font-anton">{currentCategory.name}</h1>
                            <LucideMinus class="w-8 h-8 text-yellow-500" />
                        </div>
                        <div class="flex items-center justify-center gap-2 text-white font-rubik text-sm">
                            <LucideTrophy class="w-4 h-4 text-yellow-500" />
                            <strong class="font-semibold">Recuerda:</strong> Puedes votar hasta dos nominados por categoría 🗳️
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

                        <footer class="flex gap-x-2 w-full overflow-x-scroll snap-x snap-center snap-mandatory scrollbar-hide">
                            {
                                /* 
                                    Si no ha votado en una categoría, renderizar LucideCircleDashed en coloor text-gray-500
                                    Si ha votado en una categoría, renderizar LucideCheckCircle en color text-green-500

                                    La categoría actual debe ser un botón en color azul redondeado

                                */

                                <div class="relative overflow-x-auto scroll-timeline-axis-block" style={{ scrollbarColor: '#5865F2 #060109', scrollbarWidth: '2px' }}>
                                    {/* Degradados laterales */}
                                    <div class="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#060109]/50 to-transparent pointer-events-none"></div>
                                    <div class="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#060109]/50 to-transparent pointer-events-none"></div>

                                    <div class="flex gap-4 overflow-x-auto scrollbar-hide">
                                        {categories.map((category, index) => {
                                            const hasVoted = votesByCategory[category.id]?.length > 0;
                                            const isCurrentCategory = currentCategory.id === category.id;
                                            const ref = useRef<HTMLButtonElement>(null);

                                            useEffect(() => {
                                                if (isCurrentCategory && ref.current) {
                                                    ref.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                                                }
                                            }, [isCurrentCategory]);

                                            return (
                                                <button
                                                    ref={ref}
                                                    class={`flex w-full items-center border gap-2 font-rubik text-sm font-bold py-2 px-4 rounded-[10px] transition-colors duration-300 ${isCurrentCategory
                                                        ? 'bg-[#5865F2]/20 border-[#5865F2]'
                                                        : 'bg-brand-gray/5 border-transparent'
                                                        } ${hasVoted ? 'text-green-500' : 'text-gray-500'}`}
                                                    onClick={() => setCurrentCategoryIndex(index)}
                                                >
                                                    <span class="w-full flex items-center gap-x-2 whitespace-nowrap text-left">
                                                        {isCurrentCategory
                                                            ? category.name
                                                            : <>
                                                                {hasVoted ? (
                                                                    <LucideCheckCircle2 class="w-6 h-6" />
                                                                ) : (
                                                                    <LucideCircleDashed class="w-6 h-6" />
                                                                )}
                                                                {category.name}
                                                            </>}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>


                            }
                        </footer>

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
