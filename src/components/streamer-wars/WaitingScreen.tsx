import type { Players } from "../admin/streamer-wars/Players";
import type { Session } from "@auth/core/types";

interface WaitingScreenProps {
    players: Players[];
    expectedPlayers: number;
    session?: Session;
}

export const WaitingScreen = ({ players, expectedPlayers }: WaitingScreenProps) => {
    // Contar solo jugadores no-admin y online si la propiedad online está presente,
    // si no, se cuenta por presencia en el array (es decir, se asume que están conectados)
    const nonAdminPlayers = players.filter((p) => !p.admin);
    const onlineCount = nonAdminPlayers.filter((p: any) => typeof p.online === 'boolean' ? p.online : true).length;

    const progress = Math.min(100, Math.round((onlineCount / Math.max(1, expectedPlayers)) * 100));

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-6">
            <h1 className="text-4xl font-atomic text-[#b4cd02]">Esperando jugadores...</h1>

            <div className="text-sm text-neutral-300">No se contabilizan administradores</div>

            <div className="w-3/4 max-w-2xl mt-6">
                <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
                    <div className="h-full bg-[#b4cd02] transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-3 flex items-center justify-between text-white/90 font-mono">
                    <div className="text-lg">{onlineCount}/{expectedPlayers}</div>
                    <div className="text-sm text-neutral-400">Jugadores conectados</div>
                </div>
            </div>

            <div className="mt-6 text-neutral-400 max-w-xl px-4">
                Comparte el enlace del evento con tus jugadores para que se unan. Cuando el contador llegue al número esperado, se podrá comenzar.
            </div>
        </div>
    );
};

export default WaitingScreen;
