import type { Players } from "../admin/streamer-wars/Players";
import type { Session } from "@auth/core/types";

interface WaitingScreenProps {
    players: Players[];
    expectedPlayers: number;
    session?: Session;
}

export const WaitingScreen = ({ players, expectedPlayers = 50 }: WaitingScreenProps) => {
    // Contar solo jugadores no-admin y online si la propiedad online está presente,
    // si no, se cuenta por presencia en el array (es decir, se asume que están conectados)
    const nonAdminPlayers = players.filter((p) => !p.admin);
    const onlineCount = nonAdminPlayers.filter((p: any) => typeof p.online === 'boolean' ? p.online : true).length;


    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-6 z-50 bg-black p-4 absolute inset-0">
            <h3 class="with-glyph flex animate-pulse animate-duration-slower relative w-max text-3xl transform px-2 font-atomic tracking-wider font-bold text-neutral-500"> <span class="flex  transform" >
                Guerra de Streamers
            </span> </h3>
            <h2 className="text-lg font-mono text-neutral-700">Esperando jugadores...</h2>


            <div className="mt-6 text-white/90 font-mono text-2xl">
                {onlineCount}/{expectedPlayers}
            </div>
        </div>
    );
};

export default WaitingScreen;
