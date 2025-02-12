import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideMegaphone, LucidePartyPopper, LucideSend, LucideVenetianMask, LucideVolume2, LucideVolumeOff } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { ChatRoom } from "./ChatRoom";
export const ThreeDotsAnimation = ({ ...props }: any) => (
    <div className={`flex gap-x-2 ${props.className}`}>
        <div className="size-2 bg-white rounded-full animate-bouncing animate-iteration-count-infinite"></div>
        <div className="size-2 animate-delay-150 bg-white rounded-full animate-bouncing animate-iteration-count-infinite"></div>
        <div className="size-2 animate-delay-300 bg-white rounded-full animate-bouncing animate-iteration-count-infinite"></div>
    </div>
);

const HINTS = [
    {
        title: "No intentes hacer trampa",
        icon: LucideVenetianMask,
        description: "Nuestros soldados detectan cualquier trampa. ¡No lo intentes!",
    },

    {
        title: "Sigue las instrucciones",
        icon: LucideSend,
        description: "Te daremos instrucciones. ¡Eliminado si no las sigues!",
    },
    {
        title: "¡Diviértete!",
        icon: LucidePartyPopper,
        description: "¡Disfruta de la experiencia! ¡Diviértete!",
    }
]



export const WaitingRoom = ({ session, channel, bgVolume, setBgVolume, bgAudio }: { session: Session; channel: Channel, bgVolume: number, setBgVolume: (volume: number) => void, bgAudio: HTMLAudioElement }) => {
    /* 
        Sala de chat/ espera de streamer wars
    */







    return (
        <div class="grid p-4 gap-y-6 md:gap-y-0 md:gap-x-4 grid-cols-full md:grid-cols-12">
            <div class="flex w-full h-full col-span-4 ">
                <ChatRoom session={session} channel={channel} />
            </div>
            <div class="col-span-full md:col-span-8 w-full relative flex flex-col items-center justify-center border border-lime-500 border-dashed rounded-md p-4">
                <div id="bg-music-controls" class="absolute top-0 right-0 p-2 flex gap-x-2">
                    {/* 
                    Slider
                    */}
                    <div class="flex gap-x-2 items-center">
                        <button onClick={() => {
                            if (bgVolume === 0) {
                                bgAudio.play();
                                setBgVolume(1);
                            } else {
                                setBgVolume(0);
                            }
                        }} class="bg-black/50 p-2 rounded-full">

                            {bgVolume === 0 ? <LucideVolumeOff size={24} /> : <LucideVolume2 size={24} />}
                        </button>
                        <input type="range" min={0} max={1} step={0.01} value={bgVolume} onInput={(e) => setBgVolume(parseFloat(e.currentTarget.value))} />
                    </div>
                </div>

                <h2 class="text-2xl flex flex-col font-teko justify-center items-center gap-y-3 animate-pulse duration-500">
                    Esperando por el próximo juego <ThreeDotsAnimation />
                </h2>

                <footer class=" grid-cols-3 absolute bottom-0 w-full gap-x-2 p-4 hidden md:grid bg-black/20">
                    {
                        HINTS.map(({ title, icon: Icon, description }) => (
                            <div class="flex text-center px-2 flex-col items-center gap-y-2 opacity-75 border-r border-white/20 last:border-none hover:opacity-100 transition">
                                <Icon size={28} />
                                <span class="text-white text-sm font-bold">{title}</span>
                                <p class="text-white text-xs">{description}</p>
                            </div>
                        ))
                    }



                </footer>

            </div>

        </div>
    );
}
