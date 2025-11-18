import type { Session } from "@auth/core/types";
import type { Players } from "../admin/streamer-wars/Players";


export default function CurrentPlayer({ session }: { session: Session }) {
    if (!session) return null;
    return (
        <div class="absolute select-none overflow-hidden bottom-2 group hover:cursor-pointer transition hover:scale-105 items-center justify-center flex gap-x-2 left-1/2 transform max-w-xs w-full -translate-x-1/2 bg-black/30 backdrop-blur-sm px-2 rounded-md border border-white/10">
            <div class="relative size-8 group-hover:opacity-0 transition bg-black/50 border border-white/10 rounded-sm overflow-hidden">
                <img
                    src={session.user.image || '/default-avatar.png'}
                    alt={session.user.name || session.user.username}
                    class="w-full h-full object-cover"
                />
            </div>
            <div class="mt-2 text-center group-hover:scale-150 group-hover:-skew-y-6 group-hover:-translate-x-1/2 transition text-white font-atomic text-sm truncate">
                <span class="text-[#b4cd02] font-atomic text-3xl">
                    #{session.user.streamerWarsPlayerNumber?.toString().padStart(3, "0")}</span>

            </div>
        </div>
    );
}