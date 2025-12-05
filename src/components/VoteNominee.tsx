import { NOMINEES } from "@/awards/Nominees";
import { MdiTwitch } from "@/icons/MdiTwitch";
import type { Category, CategoryNominee } from "@/types/Awards";
import { LucideTwitch } from "lucide-preact";

export const VoteNominee = ({
    nominee,
    category,
    onVote,
    isVoted,
    index,
    currentVotesCategory
}: {
    nominee: CategoryNominee,
    category: Category,
    index: number,
    onVote: (nomineeId: string, categoryId: string) => void,
    isVoted: boolean,
    currentVotesCategory: { nomineeId: string, categoryId: string }[]
}) => {

    const disabled = currentVotesCategory.length === 2 && !isVoted
    const voteOrder = currentVotesCategory.findIndex(vote => vote.nomineeId === nominee.id) + 1
    const delay = { animationDelay: `${index * 50}ms` };

    const nomineeInConst = Object.values(NOMINEES).find(n => n.username === nominee.id)
    const avatar = `/images/nominees/${nomineeInConst?.username.toLowerCase()}.webp`
    const placeholderAvatar = `https://ui-avatars.com/api/?name=${nomineeInConst?.displayName || nominee.id}&background=random&color=fff`

    return (
        <li
            className={`
                relative list-none animate-fade-in-up w-full
                ${category.isEventsCategory ? 'aspect-video' : 'aspect-square'}
            `}
            style={delay}
        >
            <button
                disabled={disabled}
                onClick={() => onVote(nominee.id, category.id)}
                className={`
                    group relative w-full h-full overflow-hidden rounded-xl border-2 transition-all duration-300
                    flex flex-col items-center justify-end p-4 text-center
                    ${isVoted
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                        : 'border-white/10 bg-gray-900/40 hover:border-blue-500/50 hover:bg-gray-900/80'
                    }
                    ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}
                `}
            >
                {/* FONDO / IMAGEN */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={avatar}
                        alt={nomineeInConst?.displayName}
                        onError={(e) => { e.currentTarget.src = placeholderAvatar }}
                        className={`
                            w-full h-full object-cover transition-transform duration-500
                            ${isVoted ? 'scale-110' : 'group-hover:scale-110'}
                            ${category.isEventsCategory ? 'opacity-60' : 'opacity-80 mask-image-b-fade'}
                        `}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                </div>

                {/* BADGE DE ORDEN (#1, #2) */}
                {isVoted && (
                    <div className="absolute top-2 right-2 z-10 size-8 flex items-center justify-center bg-yellow-500 text-black font-anton text-lg rounded-full shadow-lg animate-bounce-small">
                        #{voteOrder}
                    </div>
                )}

                {/* INFO */}
                <div className="relative z-10 w-full flex flex-col items-center gap-1">
                    <span className={`font-anton text-2xl uppercase leading-none drop-shadow-md ${isVoted ? 'text-yellow-400' : 'text-white'}`}>
                        {nomineeInConst?.displayName || nominee.id}
                    </span>
                    <span className="text-xs font-rubik text-white/60 uppercase tracking-wider truncate max-w-full">
                        {category.name}
                    </span>
                </div>

                {/* BOTÓN TWITCH (Separado para no activar voto) */}
                {!category.isEventsCategory && (
                    <a
                        href={`https://www.twitch.tv/${nominee.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-[#9146FF]/80 text-white hover:bg-[#9146FF] transition-colors hover:scale-110"
                        title={`Ver a ${nominee.id} en Twitch`}
                        onClick={(e) => e.stopPropagation()} // Importante: Detiene el click del voto
                    >
                        <MdiTwitch />
                    </a>
                )}
            </button>
        </li>
    )
}