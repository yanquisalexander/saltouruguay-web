import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideSend } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";

export const WaitingRoom = ({ session, pusher }: { session: Session; pusher: Pusher }) => {
    /* 
        Sala de chat/ espera de streamer wars
    */

    const [messages, setMessages] = useState<{ user: string; message: string }[]>([]);
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

        const channel = pusher.subscribe("streamer-wars");
        channel.bind("new-message", ({ user, message }: { user: string; message: string }) => {
            setMessages((prev) => [...prev, { user, message }]);
            playSound({ sound: STREAMER_WARS_SOUNDS.NUEVO_MENSAJE, volume: 0.2 });
            if (!manuallyScrolled) {
                const container = messagesContainer.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        });

        return () => {
            channel.unbind("new-message");
            pusher.unsubscribe("streamer-wars");
        };
    }, []);

    const sendMessage = async () => {
        if (message) {
            setSending(true);
            const { error, data } = await actions.streamerWars.sendMessage({ message });
            if (error) {
                toast.error("Error al enviar mensaje");
                setSending(false);
                return
            }
            setMessage("");
            setSending(false);
        }
    }

    return (
        <div class="flex h-full flex-col gap-y-4 p-4">
            <header class="flex w-full justify-between">
                <h2 class="text-xl font-rubik">
                    Esperando por el próximo juego
                </h2>
            </header>
            <div class="flex w-full h-full">
                <div class="flex flex-col w-max h-full">
                    <h3 class="text-xl font-bold">Chat de participantes</h3>
                    <div class="max-h-[400px] overflow-y-scroll px-2"
                        ref={messagesContainer}
                        style="scrollbar-width: thin; scrollbar-color: #4B5563 #E5E7EB; 
                    --scrollbar-track-color: #E5E7EB; --scrollbar-thumb-color: #4B5563;
                    --scrollbar-thumb-hover-color: #4B5563;"
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop === target.clientHeight) {
                                setManuallyScrolled(false);
                            } else {
                                setManuallyScrolled(true);
                            }
                        }}
                    >
                        <div class="flex flex-col gap-y-2 mt-4 max-w-md">
                            {messages.map(({ message, user }) => (
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
                            type="text" class="w-full transform min-h-12 bg-black/20 rounded-md border border-dashed mr-2" value={message} onInput={(e) => setMessage(e.currentTarget.value)} />
                        <button
                            disabled={sending || !message.trim()}
                            class="bg-lime-500 px-4 py-2 transition hover:bg-lime-600 rounded-md disabled:bg-white/20 disabled:text-white/40 text-black disabled:cursor-not-allowed"
                            onClick={sendMessage}>
                            <LucideSend size={24} />
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}
