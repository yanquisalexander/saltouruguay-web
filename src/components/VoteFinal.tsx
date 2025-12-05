import { NOMINEES } from "@/awards/Nominees";
import type { Category, Vote } from "@/types/Awards";
import type { Session } from "@auth/core/types";
import { ActionError, actions, type ActionReturnType, type Actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import confetti from "canvas-confetti";
import { LucideLoader, LucideCheckCircle, LucideEdit2, LucideSend, LucideTrophy } from "lucide-preact";
import { useRef, useState } from "preact/hooks";
import { toast } from "sonner";

export const VoteFinal = ({ user, categories, votes, onReturn }: { user: Session['user'] | null, categories: Category[], votes: { [key: string]: Vote[] }, onReturn: () => void }) => {
    const [loading, setLoading] = useState(false)
    const [allowBack, setAllowBack] = useState(true)
    const [votesSent, setVotesSent] = useState(false)
    const successMesageRef = useRef<HTMLDivElement>(null)

    const back = () => {
        navigate("/awards")
    }

    const sendVotes = async () => {
        setLoading(true)
        setAllowBack(false)
        try {
            toast.promise(actions.sendVotes({ votes }), {
                loading: "Enviando votos al servidor...",
                success: (data: ActionReturnType<Actions["sendVotes"]>) => {
                    if (data.error) {
                        setLoading(false)
                        throw new Error(data.error.message)
                    }
                    setLoading(false)
                    setVotesSent(true)
                    localStorage.removeItem(`saltoawards-${new Date().getFullYear()}`)

                    setTimeout(() => {
                        successMesageRef.current?.scrollIntoView({ behavior: "smooth" })
                        confetti({
                            particleCount: 150,
                            spread: 100,
                            origin: { y: 0.6 },
                            colors: ['#EAB308', '#FFFFFF', '#000000'] // Gold, White, Black
                        })
                    }, 100)

                    return "¡Votos registrados con éxito!"
                },
                error: (e: ActionError) => {
                    setLoading(false)
                    setAllowBack(true)
                    return e.message
                }
            })
        } catch (error) {
            console.error("Error al enviar votos", error)
            setLoading(false)
            setAllowBack(true)
        }
    }

    // Calcular totales para mostrar stats
    const totalCategoriesVoted = categories.filter(c => votes[c.id]?.length > 0).length;
    const totalVotesCast = Object.values(votes).flat().length;

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in-up">

            {votesSent ? (
                /* --- PANTALLA DE ÉXITO --- */
                <div
                    ref={successMesageRef}
                    className="flex flex-col items-center justify-center text-center p-8 md:p-16 rounded-3xl border border-green-500/30 bg-gradient-to-b from-green-900/10 to-black/60 backdrop-blur-md shadow-2xl"
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
                        <div className="relative bg-green-500 text-black p-4 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                            <LucideCheckCircle size={64} />
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-anton text-white uppercase tracking-wide mb-4">
                        ¡Misión Cumplida!
                    </h2>

                    <p className="text-white/70 font-rubik text-lg max-w-lg mx-auto mb-8">
                        Tus votos han sido encriptados y enviados al servidor. <br />
                        Gracias por formar parte de la historia de los <span className="text-yellow-500 font-bold">SaltoAwards</span>.
                    </p>

                    <div className="flex gap-4">
                        <button
                            className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl transition-all border border-white/5 uppercase tracking-wider"
                            onClick={back}
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>

            ) : (
                /* --- PANTALLA DE RESUMEN --- */
                <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-10 shadow-2xl">

                    {/* Header Resumen */}
                    <header className="text-center mb-10 border-b border-white/10 pb-8">
                        <h2 className="text-3xl md:text-4xl font-anton text-white uppercase tracking-wide mb-2">
                            Confirma tu Selección
                        </h2>
                        <p className="text-white/50 font-rubik text-sm">
                            Estás a punto de enviar <strong>{totalVotesCast} votos</strong> en <strong>{totalCategoriesVoted} categorías</strong>. <br />
                            Revisa cuidadosamente, una vez enviados no se pueden cambiar.
                        </p>
                    </header>

                    {/* Grid de Categorías */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {categories.map(category => {
                            const categoryVotes = votes[category.id] || []
                            if (categoryVotes.length === 0) return null

                            return (
                                <div key={category.id} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                    <h3 className="text-yellow-500 font-anton text-lg uppercase mb-3 flex items-center gap-2">
                                        <LucideTrophy size={14} /> {category.name}
                                    </h3>

                                    <div className="space-y-2">
                                        {categoryVotes.map(vote => {
                                            const nomineeFromConst = Object.values(NOMINEES).find(n => n.username === vote.nomineeId)
                                            const displayName = nomineeFromConst?.displayName || vote.nomineeId
                                            const avatar = `/images/nominees/${nomineeFromConst?.username.toLowerCase()}.webp`
                                            const placeholderAvatar = `https://ui-avatars.com/api/?name=${displayName}&background=random&color=fff`

                                            return (
                                                <div key={vote.nomineeId} className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                                                    <img
                                                        src={avatar}
                                                        alt={displayName}
                                                        className="size-8 rounded-md object-cover bg-black"
                                                        onError={(e) => { e.currentTarget.src = placeholderAvatar }}
                                                    />
                                                    <span className="text-white font-rubik text-sm font-medium truncate">
                                                        {displayName}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer Actions */}
                    <footer className="flex flex-col md:flex-row gap-4 justify-between items-center pt-6 border-t border-white/10">
                        <button
                            disabled={loading}
                            onClick={onReturn}
                            className="w-full md:w-auto flex items-center justify-center gap-2 text-white/50 hover:text-white px-6 py-3 rounded-xl transition-colors font-bold uppercase text-sm disabled:opacity-50"
                        >
                            <LucideEdit2 size={16} /> Corregir Votos
                        </button>

                        <button
                            disabled={loading}
                            onClick={sendVotes}
                            className={`
                                w-full md:w-auto flex items-center justify-center gap-2 
                                bg-yellow-500 hover:bg-yellow-400 text-black 
                                font-anton text-xl uppercase tracking-wide py-3 px-8 rounded-xl 
                                transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)]
                                disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
                            `}
                        >
                            {loading ? (
                                <><LucideLoader className="animate-spin" /> Enviando...</>
                            ) : (
                                <><LucideSend size={20} /> Confirmar y Enviar</>
                            )}
                        </button>
                    </footer>
                </div>
            )}
        </div>
    )
}