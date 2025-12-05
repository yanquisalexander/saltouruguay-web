import type { Category, Vote } from "@/types/Awards"
import type { Session } from "@auth/core/types"
import { LucideCheckCircle2, LucideCircleDashed, LucideMinus, LucideTrophy, LucideChevronLeft, LucideChevronRight, LucideList } from "lucide-preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { VoteNominee } from "./VoteNominee"
import { toast } from "sonner"
import { VoteFinal } from "./VoteFinal"
import { IS_VOTES_OPEN } from "@/config"
import { NOMINEES } from "@/awards/Nominees"
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds"

const MAX_VOTES_PER_CATEGORY = 2;

export const VoteSystem = ({ user, categories }: { user: Session['user'] | null, categories: Category[] }) => {

    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
    const [votesByCategory, setVotesByCategory] = useState<{ [key: string]: Vote[] }>({})
    const [isVotingFinished, setIsVotingFinished] = useState(false)
    const [hasShownFirstVoteToast, setHasShownFirstVoteToast] = useState(false)

    // Referencia para el scroll "suave" hacia arriba al cambiar categoría
    const topRef = useRef<HTMLDivElement>(null);

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

    const scrollToTop = () => {
        if (topRef.current) {
            const y = topRef.current.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

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
        <div ref={topRef} class="flex w-full max-w-6xl flex-col justify-center items-center gap-y-8 pb-32">

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
                    {/* Header Categoría */}
                    <div class="text-center space-y-2 animate-fade-in">
                        <div class="flex items-center justify-center gap-3">
                            <LucideMinus class="w-8 h-8 text-yellow-500 hidden md:block" />
                            <h1 class="text-3xl md:text-5xl font-anton text-white uppercase tracking-wide px-2 break-words">
                                {currentCategory.name}
                            </h1>
                            <LucideMinus class="w-8 h-8 text-yellow-500 hidden md:block" />
                        </div>
                        <div class="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-full text-yellow-400 font-rubik text-sm">
                            <LucideTrophy size={14} />
                            <span class="font-medium">Seleccionados: <strong>{currentVotesCategory.length}/{MAX_VOTES_PER_CATEGORY}</strong></span>
                        </div>
                    </div>

                    {/* Grid de Nominados */}
                    <ul class={`
                        grid grid-cols-1 sm:grid-cols-2 
                        ${currentCategory.isEventsCategory ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} 
                        gap-3 md:gap-4 w-full
                    `}>
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

                    {/* FOOTER CON TU DISEÑO ORIGINAL RESTAURADO */}
                    <footer class="fixed bottom-0 left-0 w-full z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-6 safe-area-bottom">
                        <div class="max-w-5xl mx-auto flex flex-col gap-4">

                            {/* --- AQUÍ ESTÁ TU CÓDIGO RESTAURADO --- */}
                            {/* Wrapper extra para blindar el overflow en móviles */}
                            <div class="w-full relative">
                                <div class="relative overflow-x-auto scrollbar-hide snap-x snap-mandatory" style={{ scrollbarColor: '#5865F2 #060109', scrollbarWidth: 'thin' }}>

                                    {/* Degradados laterales */}
                                    <div class="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none z-10"></div>
                                    <div class="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none z-10"></div>

                                    <div class="flex gap-2 w-max px-2">
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
                                                    key={category.id}
                                                    ref={ref}
                                                    onClick={() => setCurrentCategoryIndex(index)}
                                                    class={`
                                                        flex items-center gap-2 font-rubik text-sm font-bold py-2 px-4 rounded-[10px] transition-all duration-300 border snap-center whitespace-nowrap
                                                        ${isCurrentCategory
                                                            ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                                                            : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                                                        } 
                                                        ${hasVoted && !isCurrentCategory ? 'text-green-500' : ''}
                                                    `}
                                                >
                                                    {/* Lógica de Iconos Original */}
                                                    {!isCurrentCategory && (
                                                        hasVoted ? <LucideCheckCircle2 class="w-4 h-4" /> : <LucideCircleDashed class="w-4 h-4" />
                                                    )}
                                                    <span>{category.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* ------------------------------------- */}

                            {/* Controles de Navegación Inferior (Necesarios para UX) */}
                            <div class="flex justify-between items-center gap-4">
                                <button
                                    class="flex items-center gap-2 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    onClick={handlePreviousCategory}
                                    disabled={currentCategoryIndex === 0}
                                >
                                    <LucideChevronLeft size={24} />
                                    <span class="hidden md:inline font-bold">Anterior</span>
                                </button>

                                <span class="font-teko text-xl text-white/40">
                                    {currentCategoryIndex + 1} / {categories.length}
                                </span>

                                {isLastCategory ? (
                                    <button
                                        class="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg shadow-lg shadow-yellow-500/20 transition-transform hover:scale-105"
                                        onClick={showMyVotes}
                                    >
                                        Ver votos <LucideList size={18} />
                                    </button>
                                ) : (
                                    <button
                                        class="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
                                        onClick={handleNextCategory}
                                    >
                                        <span class="hidden md:inline font-bold">Siguiente</span>
                                        <LucideChevronRight size={24} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </footer>
                </>
            )}
        </div>
    )
}