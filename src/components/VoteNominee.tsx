import { NOMINEES } from "@/awards/Nominees";
import type { Category, CategoryNominee } from "@/types/Awards";
import { LucideTwitch } from "lucide-preact";

import type { JSX } from 'preact';

const MdiTwitch = (props: JSX.IntrinsicElements['svg']) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
            <path fill="currentColor" d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"></path>
        </svg>
    );
}
export const VoteNominee = ({ nominee, category, onVote, isVoted,
    index,
    currentVotesCategory

}: { nominee: CategoryNominee, category: Category, index: number, onVote: (nomineeId: string, categoryId: string) => void, isVoted: boolean, currentVotesCategory: { nomineeId: string, categoryId: string }[] }) => {

    const disabled = currentVotesCategory.length === 2 && !isVoted

    const voteOrder = currentVotesCategory.findIndex(vote => vote.nomineeId === nominee.id) + 1

    const delay = `animation-delay: ${index * 75}ms`;

    const nomineeInConst = Object.values(NOMINEES).find(n => n.username === nominee.id)

    const avatar = `/images/nominees/${nomineeInConst?.username.toLowerCase()}.webp`

    const placeholderAvatar = `https://ui-avatars.com/api/?name=${nomineeInConst?.displayName}&background=random&color=fff`


    return (
        <li key={nominee.id} class={`overflow-hidden group hover:shadow-lg transition-transform transform  flex w-full h-40 aspect-video animate-fade-in-up ${!disabled && 'hover:scale-110 hover:drop-shadow-[0_0px_30px_rgba(8,_112,_184,1)]'} `} style={delay}>
            <button
                disabled={disabled}
                class={`
    shadow-sm shadow-black/20
    z-0 group relative
    w-full flex flex-col gap-2 justify-center items-center
    transition-all p-1 
    hover:drop-shadow-[0_0px_30px_rgba(8,_112,_184,1)]
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isVoted
                        ? 'bg-yellow-500 text-white'
                        : 'bg-[#1682c7] hover:bg-sky-400 text-white'
                    }
    `} onClick={() => onVote(nominee.id, category.id)}
            >
                {
                    isVoted && (
                        <span class="absolute size-10 rounded-bl-md right-0 top-0 bg-white text-lg text-black font-anton p-1 ">
                            #{voteOrder}
                        </span>
                    )
                }
                <img class={`group-hover:mix-blend-normal object-cover transition-all rounded mix-blend-luminosity
                    ${category.isEventsCategory ? 'aspect-video w-28' : 'aspect-square size-16'}
                    ${isVoted && '!mix-blend-normal'}
                `} src={avatar} alt={nomineeInConst?.displayName} onError={(e) => {
                        e.currentTarget.src = placeholderAvatar
                    }} />
                <span class="text-2xl font-anton">{nomineeInConst?.displayName || nominee.id}</span>
                <span class="text-sm">{category.name}</span>
                {
                    !category.isEventsCategory && (

                        <a href={`https://www.twitch.tv/${nominee.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-disabled={disabled}
                            title={`Ver a ${nomineeInConst?.displayName} en Twitch`}
                            class="absolute bottom-0 hover:bg-white hover:text-electric-violet-600 transition rounded-none rounded-tr-md flex items-center gap-x-2 left-0  bg-electric-violet-500 text-white text-sm p-1.5 text-center">
                            <MdiTwitch class="size-6" />
                        </a>
                    )
                }

            </button>

        </li>
    )
}