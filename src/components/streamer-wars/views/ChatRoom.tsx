import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { LucideMegaphone, LucideMessageCircle, LucideSend, LucideSmilePlus, LucideVerified } from "lucide-preact";
import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import { EMOTES } from "@/consts/Emotes";
import { GLOBAL_CDN_PREFIX } from "@/config";
import { Popover } from "@/components/Popover";
import { Tooltip } from "@/components/Tooltip";



const EmotePicker = ({ onSelect, setSendAsReaction, isOpen }: { onSelect: (emote: keyof typeof EMOTES) => void; setSendAsReaction?: (sendAsReaction: boolean) => void; isOpen?: boolean }) => {
    return (
        <div class="flex flex-col gap-2">
            <div class="grid grid-cols-6 gap-2">
                {Object.keys(EMOTES).map((emote) => (
                    <button
                        class="w-12 h-12 bg-black/20 rounded-md flex items-center justify-center"
                        onClick={() => onSelect(emote as keyof typeof EMOTES)}
                    >
                        <img src={`${GLOBAL_CDN_PREFIX}${EMOTES[emote as keyof typeof EMOTES]}`} alt={emote} class="w-8 h-8" />
                    </button>
                ))}
            </div>

        </div>
    );
}

interface ChatMessage {
    user?: string;
    admin?: boolean;
    message: string;
    isAnnouncement?: boolean;
}

interface ChatProps {
    session: Session;
    channel: Channel;
}

const ReactionEmoteMessage = ({ user, emote, admin }: { user: string; emote: keyof typeof EMOTES, admin?: boolean }) => {
    return (
        <div class="flex gap-x-2 w-full bg-white/5 p-2 items-start">
            <span class="font-bold w-max flex items-center gap-x-2">
                {
                    admin && (
                        <Tooltip tooltipPosition="top" text="Este usuario es un moderador">
                            <LucideVerified size={16} class="text-lime-500" />
                        </Tooltip>
                    )}
                {user}</span>
            <span class="w-full break-words text-wrap overflow-hidden">
                <img src={`${GLOBAL_CDN_PREFIX}${EMOTES[emote]}`} alt={emote} class="object-scale-down size-20 inline-block" />
            </span>
        </div>
    );
}

const ChatMessage = ({ user, message, isAnnouncement, admin }: ChatMessage) => {
    const parseEmotes = (message: string) => {
        const emoteRegex = /:([a-zA-Z0-9_]+):/g;
        return message.replace(emoteRegex, (match, emote) => {
            if (EMOTES[emote as keyof typeof EMOTES]) {
                return `<img src="${GLOBAL_CDN_PREFIX}${EMOTES[emote as keyof typeof EMOTES]}" alt="${emote}" class="size-6 inline-block" />`;
            }
            return match;
        });
    }
    const parsedMessage = parseEmotes(message);
    return (
        <div class="flex gap-x-2 w-full bg-white/5 p-2 items-start">
            <span class="font-bold w-max flex items-center gap-x-2">
                {
                    admin && (
                        <Tooltip tooltipPosition="top" text="Este usuario es un moderador">
                            <LucideVerified size={16} class="text-lime-500" />
                        </Tooltip>
                    )}

                {user}</span>
            <span class="w-full break-words text-wrap overflow-hidden" dangerouslySetInnerHTML={{ __html: parsedMessage }} />
        </div>
    );
}

export const ChatRoom = ({ session, channel }: ChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState<string>("");
    const [sending, setSending] = useState<boolean>(false);
    const messagesContainer = useRef<HTMLDivElement>(null);
    const [manuallyScrolled, setManuallyScrolled] = useState<boolean>(false);
    const [emotePickerOpen, setEmotePickerOpen] = useState<boolean>(false);

    const [usersTyping, setUsersTyping] = useState<Set<string>>(new Set());

    let typingTimeout: NodeJS.Timeout | null = null;

    const usersTypingMessage = () => {
        const typingArray = Array.from(usersTyping); // Convertimos el Set a un Array

        if (typingArray.length === 1) {
            return `${typingArray[0]} está escribiendo...`;
        } else if (typingArray.length === 2) {
            return `${typingArray.join(" y ")} están escribiendo...`;
        } else if (typingArray.length > 2) {
            return `${typingArray.slice(0, 2).join(", ")} y otros están escribiendo...`;
        }
        return "&nbsp;";
    };


    useEffect(() => {
        // Obtener los mensajes existentes
        actions.streamerWars.getAllMessages().then(({ data }) => {
            if (data?.messages) {
                setMessages(data.messages);
            }
            // Forzar scroll al fondo después de cargar
            setTimeout(() => {
                messagesContainer.current?.scrollTo({
                    top: messagesContainer.current.scrollHeight
                });
            }, 100);
        });

        channel.bind("clear-chat", () => {
            setMessages([]);
            toast.info("Un moderador ha limpiado el chat");
        });

        channel.bind("client-typing", ({ user }: { user: string }) => {
            console.log(`${user} está escribiendo...`);
            setUsersTyping((prev) => new Set([...prev, user]));
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
            typingTimeout = setTimeout(() => {
                setUsersTyping((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(user);
                    return newSet;
                });
            }, 2000);
        });



        // Escuchar nuevos mensajes vía Pusher
        channel.bind("new-message", ({ user, message, type, suppressAudio, admin }: { user: string; message: string; type: string; suppressAudio?: boolean, admin?: boolean }) => {
            setMessages((prev) => [
                ...prev,
                { user, message, isAnnouncement: type === "announcement", admin }
            ]);

            if (!manuallyScrolled) {
                if (messagesContainer.current) {
                    messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
                }
            }

            const emoteOnlyMatch = message.match(/^:([a-zA-Z0-9_]+):$/);
            const isReaction = emoteOnlyMatch && EMOTES[emoteOnlyMatch[1] as keyof typeof EMOTES];

            if (!suppressAudio) {
                if (type === "announcement") {
                    playSound({ sound: STREAMER_WARS_SOUNDS.ATENCION_JUGADORES, volume: 1 });
                } else if (isReaction) {
                    playSound({ sound: STREAMER_WARS_SOUNDS[emoteOnlyMatch![1] as keyof typeof STREAMER_WARS_SOUNDS], volume: 0.2 });
                } else {
                    playSound({ sound: STREAMER_WARS_SOUNDS.NUEVO_MENSAJE, volume: 0.2 });
                }
            }
        });

        return () => {
            channel.unbind("new-message");
        };
    }, []);

    const handleScroll = () => {
        if (messagesContainer.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainer.current;
            const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 50;
            setManuallyScrolled(!isAtBottom);
        }
    };

    useEffect(() => {
        const container = messagesContainer.current;
        if (container && !manuallyScrolled) {
            // Usar requestAnimationFrame para esperar al renderizado
            requestAnimationFrame(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth"
                });
            });
        }
    }, [messages, manuallyScrolled]);

    const parseLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" class="text-lime-500 hover:underline">${url}</a>`);
    };

    const sendMessage = async () => {
        if (message.trim()) {
            setSending(true);
            setEmotePickerOpen(false);
            const { error } = await actions.streamerWars.sendMessage({ message });
            if (error) {
                toast.error(error.message || "Error al enviar mensaje");
                setSending(false);
                return;
            }
            setMessage("");
            setSending(false);
        }
    };

    useEffect(() => {
        /* 
            Si el mensaje solo contiene un emote, enviarlo como reacción
        */
        const emoteOnlyMatch = message.match(/^:([a-zA-Z0-9_]+):$/);
        if (emoteOnlyMatch && EMOTES[emoteOnlyMatch[1] as keyof typeof EMOTES]) {
            sendMessage();
            return
        }

        if (message.trim().length > 0) {
            channel.trigger("client-typing", { user: session.user?.name });
        }
    }, [message]);


    const onEmoteSelect = (emote: keyof typeof EMOTES) => {
        setMessage((prev) => `${prev}:${emote}:`);
    }

    return (
        <div class="flex flex-col w-full h-full bg-neutral-950 border border-lime-500 border-dashed relative rounded-md px-4 py-3">
            <h3 class="text-2xl  font-teko py-2">
                <LucideMessageCircle size={24} class="inline-block mr-2" />
                Chat de participantes</h3>
            <div
                class="h-[320px] w-full overflow-y-auto flex flex-col gap-2 p-2 relative"
                ref={messagesContainer}
                style="scrollbar-width: thin; scrollbar-color: #4B5563 #E5E7EB; 
               --scrollbar-track-color: #E5E7EB; --scrollbar-thumb-color: #4B5563;
               --scrollbar-thumb-hover-color: #4B5563;"
                onScroll={handleScroll}

            >

                <div class="flex flex-col flex-1 overflow-y-auto gap-y-2 w-full h-full scroll-smooth">

                    {messages.map(({ message, user, isAnnouncement, admin }, index) => {
                        const emoteOnlyMatch = message.match(/^:([a-zA-Z0-9_]+):$/);
                        const isEmoteOnly = emoteOnlyMatch && EMOTES[emoteOnlyMatch[1] as keyof typeof EMOTES];

                        return isAnnouncement ? (
                            <div key={index} class="bg-blue-500/30 text-white p-2 border border-dashed border-blue-500">
                                <LucideMegaphone size={24} />
                                <span
                                    class="w-full break-words text-wrap overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: parseLinks(message) }}
                                />
                            </div>
                        ) : isEmoteOnly ? (
                            <ReactionEmoteMessage key={index} user={user!} emote={emoteOnlyMatch![1] as keyof typeof EMOTES} admin={admin} />
                        ) : (
                            <ChatMessage key={index} user={user} message={message} admin={admin} />
                        );
                    })}
                    {manuallyScrolled && (
                        <button
                            className="z-10 sticky mx-auto bottom-4 bg-lime-500/80 hover:bg-lime-500 text-white p-2 rounded-md text-center shadow-lg"
                            onClick={() => {
                                messagesContainer.current?.scrollTo({
                                    top: messagesContainer.current.scrollHeight,
                                    behavior: "smooth"
                                });
                                setManuallyScrolled(false);
                            }}
                        >
                            Ver mensajes nuevos ↓
                        </button>
                    )}
                </div>
            </div>

            <div class="text-white text-xs opacity-50" dangerouslySetInnerHTML={{ __html: usersTypingMessage() }}>
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
                    class="w-full min-h-12 bg-black/20 rounded-md border mr-2 resize-none"
                    value={message}
                    onInput={(e) => setMessage(e.currentTarget.value)}
                />
                <div class="flex gap-x-2">
                    <Popover
                        className="bg-neutral-500 rounded-md p-4"
                        activator={<button class="bg-neutral-700 px-4 py-2 rounded-md text-white hover:bg-neutral-500 transition">
                            <LucideSmilePlus size={24} />
                        </button>}>
                        <EmotePicker
                            onSelect={onEmoteSelect}
                            isOpen={emotePickerOpen}
                        />
                    </Popover>
                    <button
                        disabled={sending || !message.trim()}
                        class="bg-lime-500 px-4 py-2 transition hover:bg-lime-600 rounded-md disabled:bg-white/20 disabled:text-white/40 text-black disabled:cursor-not-allowed"
                        onClick={sendMessage}
                    >
                        <LucideSend size={24} />
                    </button>
                </div>
            </footer>
        </div>
    );
};
