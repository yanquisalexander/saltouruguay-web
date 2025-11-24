import { actions } from "astro:actions";
import { useState } from "preact/hooks";
import { usePusherChannel } from "@/hooks/usePusherChannel";

export const DebateOverlayPinneWidget = () => {
    const [currentOpinion, setCurrentOpinion] = useState<Awaited<ReturnType<typeof actions.getDebateMessageById>> | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    usePusherChannel({
        channelName: "debate",
        events: {
            "pin-debate-message": ({ opinionId }: { opinionId: number }) => {
                actions.getDebateMessageById({ opinionId }).then((opinion) => {
                    setCurrentOpinion(opinion);
                    setIsVisible(true);

                    setTimeout(() => {
                        setIsVisible(false);
                        setTimeout(() => setCurrentOpinion(null), 300); // Tiempo para completar la animación de salida
                    }, 10000);
                });
            }
        }
    });

    return (
        <div class="flex items-center justify-center fixed inset-0 pointer-events-none">
            <div
                class={`p-4 bg-[#0b1422]/95 border-2 border-line rounded-lg text-white min-w-64 max-w-3xl w-max  transition-all duration-300
                ${isVisible ? "animate-fade-in-up" : currentOpinion ? "animate-fade-out-down" : "hidden"}`}
            >
                {currentOpinion && (
                    <div class="flex flex-col gap-1 relative">
                        <h3 class="font-rubik font-bold text-lg">Opinión</h3>
                        <p class="font-rubik font-semibold">{currentOpinion.data?.opinion.message}</p>
                        <img src="/favicon.svg" class="absolute saturate-200 -top-8 -right-6 w-8 h-8" />
                    </div>
                )}
            </div>
        </div>
    );
};
