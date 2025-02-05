import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface InstructionsProps {
    duration?: number;
    children: ComponentChildren;
}

export const Instructions = ({ duration = 10000, children }: InstructionsProps) => {
    const [show, setShow] = useState(true);
    const [timeLeft, setTimeLeft] = useState(duration / 1000);

    useEffect(() => {
        const timer = setTimeout(() => setShow(false), duration);
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // @ts-ignore
                    clearInterval(interval);
                    return 0;
                }

                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 1 });
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimeout(timer);
            // @ts-ignore
            clearInterval(interval);
        };
    }, [duration]);

    return show ? (
        <>
            <div className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[8000] transition-opacity duration-500 ${show ? 'opacity-100 animate-fade-in' : 'opacity-0 animate-fade-out'}`}>
                <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-300">
                    00:{timeLeft.toString().padStart(2, "0")}
                </div>
                <div className=" p-8 rounded-xl backdrop-blur-sm text-white text-center">
                    <header>
                        <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                            Instrucciones
                        </h1>
                    </header>
                    <div className="mt-6 space-y-4">
                        {children}
                    </div>


                </div>
                <h2 class="text-2xl fixed bottom-16 font-atomic text-neutral-500 select-none -skew-y-6">
                    <span class="tracking-wider">Guerra de Streamers</span>
                </h2>

                <span class="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                    &#x0055;
                </span>

                <span class="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                    &#x0050;
                </span>
            </div>
        </>
    ) : null;
};

