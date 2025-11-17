import type { Session } from "@auth/core/types";
import type { Players } from "../admin/streamer-wars/Players";


export default function CurrentPlayer({ session }: { session: Session }) {
    if (!session) return null;
    return (
        <div class="absolute bottom-4 items-center justify-center flex gap-x-2 left-1/2 transform max-w-xs w-full -translate-x-1/2 bg-black/30 backdrop-blur-sm px-2 rounded-md border border-white/10">
            <div class="relative size-8 bg-black/50 border border-white/10 rounded-sm overflow-hidden">
                <img
                    src={session.user.image || '/default-avatar.png'}
                    alt={session.user.name || session.user.username}
                    class="w-full h-full object-cover"
                />
            </div>
            <div class="mt-2 text-center">
                <span class="text-[#b4cd02] font-atomic text-3xl">
                    #{session.user.streamerWarsPlayerNumber?.toString().padStart(3, "0")}</span>

            </div>
        </div>
    );
}