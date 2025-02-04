import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideMegaphone, LucidePartyPopper, LucideSend, LucideVenetianMask } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";
import { toast } from "sonner";
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



export const WaitingRoom = ({ session, channel }: { session: Session; channel: Channel }) => {
    /* 
        Sala de chat/ espera de streamer wars
    */

    const [messages, setMessages] = useState<{ user?: string; message: string, isAnnouncement?: boolean }[]>([]);
    const [message, setMessage] = useState<string>("");
    const [sending, setSending] = useState<boolean>(false);
    const messagesContainer = useRef<HTMLDivElement>(null);
    const [manuallyScrolled, setManuallyScrolled] = useState<boolean>(false);

    useEffect(() => {
        const messages = actions.streamerWars.getAllMessages();
        messages.then(({ error, data }) => {
            if (error) {
                toast.error("Error al cargar mensajes");
                return
            }
            setMessages(data.messages);
            if (!manuallyScrolled) {
                const container = messagesContainer.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        })

        channel.bind('tech-difficulties', () => {
            playSound({ sound: STREAMER_WARS_SOUNDS.PROBLEMAS_TECNICOS, volume: 1 });
        })

        channel.bind("new-message", ({ user, message, type, suppressAudio }: { user: string; message: string, type?: string, suppressAudio?: boolean }) => {
            setMessages((prev) => [...prev, { user, message, isAnnouncement: type === "announcement" }]);
            if (!manuallyScrolled) {
                const container = messagesContainer.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }

            if (suppressAudio) return;
            if (type === "announcement") {
                playSound({ sound: STREAMER_WARS_SOUNDS.ATENCION_JUGADORES, volume: 1 });
            } else {
                playSound({ sound: STREAMER_WARS_SOUNDS.NUEVO_MENSAJE, volume: 0.2 });
            }

        });

        return () => {
            channel.unbind("new-message");
        };
    }, []);

    const parseLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" class="text-lime-500 hover:underline">${url}</a>`);
    }

    const sendMessage = async () => {
        if (message) {
            setSending(true);
            const { error, data } = await actions.streamerWars.sendMessage({ message });
            if (error) {
                toast.error(error.message || "Error al enviar mensaje");
                setSending(false);
                return
            }
            setMessage("");
            setSending(false);
        }
    }

    return (
        <div class="grid p-4 gap-x-4 grid-cols-12">
            <div class="flex w-full h-full col-span-4 ">
                <div class="flex flex-col w-max h-full bg-neutral-950 border border-lime-500 border-dashed rounded-md px-4 py-3">
                    <h3 class="text-xl font-bold py-2">Chat de participantes</h3>
                    <div class="h-[320px] overflow-y-scroll px-2"
                        ref={messagesContainer}
                        style="scrollbar-width: thin; scrollbar-color: #4B5563 #E5E7EB; 
                    --scrollbar-track-color: #E5E7EB; --scrollbar-thumb-color: #4B5563;
                    --scrollbar-thumb-hover-color: #4B5563;"
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            setManuallyScrolled(target.scrollHeight - target.scrollTop === target.clientHeight);

                        }}
                    >
                        <div class="flex flex-col gap-y-2 mt-4  w-full min-h-full h-full grow">
                            {messages.map(({ message, user, isAnnouncement }) => (
                                isAnnouncement ? <div class="bg-blue-500/30 text-white p-2 border border-dashed border-blue-500">
                                    <LucideMegaphone size={24} />
                                    <span class="w-full break-words text-wrap overflow-hidden" dangerouslySetInnerHTML={{ __html: parseLinks(message) }}>
                                    </span>
                                </div> :
                                    <div class="flex gap-x-2 w-full">
                                        <span class="font-bold w-max">{user}</span>
                                        <span class="w-full break-words text-wrap overflow-hidden">{message}</span>
                                    </div>
                            ))}
                        </div>
                    </div>
                    <footer class="flex w-full mt-4">
                        <textarea
                            onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();

                                }
                            }}
                            maxlength={200}
                            type="text" class="w-full transform min-h-12 bg-black/20 rounded-md border mr-2" value={message} onInput={(e) => setMessage(e.currentTarget.value)} />
                        <button
                            disabled={sending || !message.trim()}
                            class="bg-lime-500 px-4 py-2 transition hover:bg-lime-600 rounded-md disabled:bg-white/20 disabled:text-white/40 text-black disabled:cursor-not-allowed"
                            onClick={sendMessage}>
                            <LucideSend size={24} />
                        </button>
                    </footer>
                </div>
            </div>
            <div class="col-span-8 relative flex flex-col items-center justify-center border border-lime-500 border-dashed rounded-md p-4">
                <h2 class="text-2xl flex flex-col font-teko justify-center items-center gap-y-3 animate-pulse duration-500">
                    Esperando por el próximo juego <ThreeDotsAnimation />
                </h2>

                <footer class="grid grid-cols-3 absolute bottom-0 w-full gap-x-2 p-4 bg-black/20">
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
