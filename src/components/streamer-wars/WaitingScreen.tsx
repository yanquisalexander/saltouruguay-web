import { useState, useEffect } from "preact/hooks";
import type { Players } from "../admin/streamer-wars/Players";
import type { Session } from "@auth/core/types";

interface WaitingScreenProps {
    players: Players[];
    expectedPlayers: number;
    session?: Session;
}

export const WaitingScreen = ({ players, expectedPlayers = 50 }: WaitingScreenProps) => {
    const nonAdminPlayers = players.filter((p) => !p.admin);
    const onlineCount = nonAdminPlayers.filter((p: any) => typeof p.online === 'boolean' ? p.online : true).length;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">

            {/* LÍNEAS DE ESCANEO CASI INVISIBLES (Coherencia con Splash) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

            {/* CONTENIDO CENTRAL */}
            <div className="relative flex flex-col items-center gap-12">

                {/* TÍTULO PRINCIPAL (Estilo refinado) */}
                <div className="relative">
                    <h3 className="font-atomic italic text-4xl text-neutral-600 tracking-tighter select-none">
                        Guerra de Streamers
                    </h3>
                    {/* Glifo sutil decorativo en la esquina */}
                    <span className="absolute -top-6 -right-8 font-atomic-extras text-2xl text-[#b4cd02] opacity-20">
                        &#x0055;
                    </span>
                </div>

                {/* CONTADOR CON GLIFOS */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6">
                        {/* Glifo Izquierdo */}
                        <span className="font-atomic-extras text-3xl text-neutral-800">
                            &#x005B;
                        </span>

                        <div className="flex flex-col items-center">
                            <span className="font-anton text-6xl text-white tracking-widest">
                                {onlineCount.toString().padStart(2, '0')}
                            </span>
                            <div className="h-[2px] w-full bg-neutral-800 mt-1">
                                <div
                                    className="h-full bg-[#b4cd02] transition-all duration-500 ease-out"
                                    style={{ width: `${(onlineCount / expectedPlayers) * 100}%` }}
                                />
                            </div>
                            <span className="font-teko text-xl text-neutral-700 tracking-[0.3em] mt-2 uppercase">
                                / {expectedPlayers}
                            </span>
                        </div>

                        {/* Glifo Derecho */}
                        <span className="font-atomic-extras text-3xl text-neutral-800">
                            &#x005D;
                        </span>
                    </div>
                </div>

                {/* ESTADO INFERIOR */}
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b4cd02] opacity-50 shadow-[0_0_8px_#b4cd02]" />
                    <h2 className="font-teko text-2xl text-neutral-600 tracking-[0.4em] uppercase">
                        Esperando jugadores
                    </h2>
                </div>
            </div>

            {/* DECORACIÓN DE ESQUINAS (Minimalista) */}
            <div className="absolute bottom-10 left-10 opacity-10">
                <span className="font-atomic-extras text-5xl text-white">
                    &#x0050;
                </span>
            </div>
        </div>
    );
};

export default WaitingScreen;