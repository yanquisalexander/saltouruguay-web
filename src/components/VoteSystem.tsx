import type { Category, Vote } from "@/types/Awards"
import type { Session } from "@auth/core/types"
import { LucideCheckCircle2, LucideCircleDashed, LucideMinus, LucideTrophy, LucideChevronLeft, LucideChevronRight, LucideList } from "lucide-preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { VoteNominee } from "./VoteNominee"
import { toast } from "sonner"
import { VoteFinal } from "./VoteFinal"
import { IS_VOTES_OPEN } from "@/config"
import { NOMINEES } from "@/awards/Nominees"
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

    // --- EFFECT: Cargar Borrador ---
    useEffect(() => {
        const savedVotes = localStorage.getItem(storageDraftKey)
        if (savedVotes) {
            if (!IS_VOTES_OPEN()) {
                localStorage.removeItem(storageDraftKey)
                return
            }
            const parsedVotes = JSON.parse(savedVotes)
            if (Object.keys(parsedVotes).length > 0) setVotesByCategory(parsedVotes)
        }
    }, [])

    // --- EFFECT: Guardar Borrador ---
    useEffect(() => {
        localStorage.setItem(storageDraftKey, JSON.stringify(votesByCategory))
    }, [votesByCategory])

    // --- EFFECT: Sonido primer voto ---
    useEffect(() => {
        const totalVotes = Object.values(votesByCategory).flat().length
        if (!hasShownFirstVoteToast && totalVotes > 0) {
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION })
            toast.success("¡Primer voto registrado! Puedes votar 2 por categoría.", { position: 'bottom-center' })
            setHasShownFirstVoteToast(true)
        }
    }, [votesByCategory, hasShownFirstVoteToast])

    // --- HANDLERS ---
    const handleVote = (nomineeId: string, categoryId: string) => {
        const isVoted = currentVotesCategory.some(vote => vote.nomineeId === nomineeId)
        if (isVoted) {
            const newVotes = currentVotesCategory.filter(vote => vote.nomineeId !== nomineeId)
            setVotesByCategory(prev => ({ ...prev, [categoryId]: newVotes }))
            return
        }
        if (currentVotesCategory.length === MAX_VOTES_PER_CATEGORY) return
        setVotesByCategory(prev => ({ ...prev, [categoryId]: [...currentVotesCategory, { nomineeId, categoryId }] }))
    }

    const showMyVotes = () => {
        if (!hasAlmostOneVotePerCategory) {
            toast.warning("Debes votar al menos una vez en cada categoría")
            return
        }
        setIsVotingFinished(true)
    }

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleNextCategory = () => {
        if (isLastCategory) return
        setCurrentCategoryIndex(prev => prev + 1)
        scrollToTop()
    }

    const handlePreviousCategory = () => {
        if (currentCategoryIndex === 0) return
        setCurrentCategoryIndex(prev => prev - 1)
        scrollToTop()
    }

    const currentUserIsNominee = Object.values(NOMINEES).some(nominee => nominee.username === user?.name?.toLowerCase())

    // --- RENDER ---
    return (
        <div class="flex w-full max-w-5xl flex-col justify-center items-center gap-y-8 pb-10">
            {currentUserIsNominee && (
                <div class="bg-blue-500/10 border border-blue-500/30 w-full rounded-xl p-4 flex items-center gap-4 animate-fade-in-down">
                    <div class="bg-blue-500 p-2 rounded-lg text-white"><LucideTrophy size={20} /></div>
                    <div>
                        <strong class="text-white font-anton tracking-wide">¡Eres un nominado! 🎉</strong>
                        <p class="text-blue-200 text-sm">Pronto recibirás el logro especial por tu participación.</p>
                    </div>
                </div>
            )}

            {isVotingFinished ? (
                <VoteFinal user={user} categories={categories} votes={votesByCategory} onReturn={() => setIsVotingFinished(false)} />
            ) : (
                <>
                    <AwardsInmersiveIntro />

                    {/* Header Categoría */}
                    <div class="text-center space-y-2">
                        <div class="flex items-center justify-center gap-3 animate-fade-in">
                            <LucideMinus class="w-8 h-8 text-yellow-500 hidden md:block" />
                            <h1 class="text-4xl md:text-5xl font-anton text-white uppercase tracking-wide">{currentCategory.name}</h1>
                            <LucideMinus class="w-8 h-8 text-yellow-500 hidden md:block" />
                        </div>
                        <div class="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-full text-yellow-400 font-rubik text-sm">
                            <LucideTrophy size={14} />
                            <span class="font-medium">Seleccionados: <strong>{currentVotesCategory.length}/{MAX_VOTES_PER_CATEGORY}</strong></span>
                        </div>
                    </div>

                    {/* Grid de Nominados */}
                    <ul class={`grid grid-cols-2 ${currentCategory.isEventsCategory ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4 w-full`}>
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

                    {/* Footer Navigation (Manteniendo tu estructura original) */}
                    <footer class="w-full flex flex-col gap-6 mt-8 p-6 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl">

                        {/* Scroll Horizontal de Categorías */}
                        <div class="relative w-full">
                            {/* Degradados para indicar scroll */}
                            <div class="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10"></div>
                            <div class="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10"></div>

                            <div class="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1 snap-x">
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
                                            onClick={() => setCurrentCategoryIndex(index)}
                                            class={`
                                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-300 border snap-center
                                                ${isCurrentCategory
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                                                }
                                            `}
                                        >
                                            {isCurrentCategory
                                                ? <span class=" tracking-wide">{category.name}</span>
                                                : (
                                                    <>
                                                        {hasVoted
                                                            ? <LucideCheckCircle2 size={16} class="text-green-500" />
                                                            : <LucideCircleDashed size={16} />
                                                        }
                                                        <span>{category.name}</span>
                                                    </>
                                                )
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Botones Anterior / Siguiente */}
                        <div class="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5">
                            <span class="font-teko text-xl text-white/50 order-2 md:order-1">
                                Categoría {currentCategoryIndex + 1} de {categories.length}
                            </span>

                            <nav class="flex gap-3 w-full md:w-auto order-1 md:order-2">
                                <button
                                    class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={handlePreviousCategory}
                                    disabled={currentCategoryIndex === 0}
                                >
                                    <LucideChevronLeft size={18} /> Anterior
                                </button>

                                {isLastCategory ? (
                                    <button
                                        class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-lg transition-all hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                        onClick={showMyVotes}
                                    >
                                        Ver mis votos <LucideList size={18} />
                                    </button>
                                ) : (
                                    <button
                                        class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-2.5 px-6 rounded-lg transition-colors"
                                        onClick={handleNextCategory}
                                    >
                                        Siguiente <LucideChevronRight size={18} />
                                    </button>
                                )}
                            </nav>
                        </div>
                    </footer>
                </>
            )}
        </div>
    )
}