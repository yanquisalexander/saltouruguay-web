import type { Category, CategoryNominee } from "@/types/Awards";

export const VoteNominee = ({ nominee, category, onVote, isVoted,
    index,
    currentVotesCategory

}: { nominee: CategoryNominee, category: Category, index: number, onVote: (nomineeId: string, categoryId: string) => void, isVoted: boolean, currentVotesCategory: { nomineeId: string, categoryId: string }[] }) => {

    const disabled = currentVotesCategory.length === 2 && !isVoted

    const delay = `animation-delay: ${index * 75}ms`;

    return (
        <li key={nominee.id} class={`overflow-hidden group hover:shadow-lg transition-transform transform  flex w-full h-40 aspect-video animate-fade-in-up ${!disabled && 'hover:scale-105'} `} style={delay}>
            <button
                disabled={disabled}
                class={`
    shadow-sm shadow-black/20
    z-0 group relative
    w-full flex flex-col gap-2 justify-center items-center
    transition-all p-1 
    md:hover:scale-105
    hover:drop-shadow-[0_0px_20px_rgba(8,_112,_184,_0.9)]
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isVoted
                        ? 'bg-yellow-500 text-white'
                        : 'bg-[#1682c7] hover:bg-sky-400 text-white'
                    }
    `} onClick={() => onVote(nominee.id, category.id)}
            >
                <span class="text-2xl font-anton">{nominee.id}</span>
                <span class="text-sm">{category.name}</span>
            </button>

        </li>
    )
}