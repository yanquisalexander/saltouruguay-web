import { useEffect, useRef, useState, useMemo, useCallback } from "preact/hooks";
import { memo } from "preact/compat";
import { toast } from "sonner";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import {
    LucideChevronDown,
    LucideLock,
    LucideMegaphone,
    LucideMessageCircle,
    LucideSend,
    LucideSmilePlus,
    LucideSwords,
    LucideX,
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import { EMOTES } from "@/consts/Emotes";
import { GLOBAL_CDN_PREFIX } from "@/config";
import { Popover } from "@/components/Popover";
import { Tooltip } from "@/components/Tooltip";

// --- CONSTANTES Y UTILIDADES ---
const MAX_MESSAGES = 100; // Límite para evitar lag en el DOM

// Estilos reutilizables estilo 8-bit
const MODERN_BOX = "bg-black border border-neutral-800 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]";
const MODERN_BTN = "active:scale-95 transition-all duration-300 border border-neutral-800 bg-neutral-900/50 hover:border-pink-500/50 hover:bg-neutral-800";

const parseLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
        urlRegex,
        (url) => `<a href="${url}" target="_blank" class="text-pink-400 hover:text-pink-300 transition-colors underline decoration-dashed decoration-1">${url}</a>`
    );
};

const parseEmotesToHTML = (text: string) => {
    return text
        .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Sanitize basic HTML
        .replace(/\n/g, '<br>')
        .replace(/:([a-zA-Z0-9_]+):/g, (match, emote) => {
            const src = EMOTES[emote as keyof typeof EMOTES];
            return src
                ? `<img src="${GLOBAL_CDN_PREFIX}${src}" alt="${emote}" class="inline-block w-6 h-6 align-middle hover:scale-125 transition-transform" />`
                : match;
        });
};

// --- COMPONENTES ---

const EmotePicker = ({ onSelect }: { onSelect: (emote: keyof typeof EMOTES) => void }) => {
    return (
        <div class={`grid grid-cols-5 gap-2 p-2 bg-black/90 backdrop-blur-md w-64 max-h-64 overflow-y-auto ${MODERN_BOX}`}>
            {Object.keys(EMOTES).map((emote) => (
                <button
                    key={emote}
                    class="w-10 h-10 bg-black/40 hover:bg-pink-500/20 border border-transparent hover:border-pink-500 flex items-center justify-center transition-all duration-300 rounded"
                    onClick={() => onSelect(emote as keyof typeof EMOTES)}
                    title={`:${emote}:`}
                >
                    <img
                        src={`${GLOBAL_CDN_PREFIX}${EMOTES[emote as keyof typeof EMOTES]}`}
                        alt={emote}
                        class="w-6 h-6"
                    />
                </button>
            ))}
        </div>
    );
};

interface ChatMessageProps {
    id: number;
    user?: string;
    admin?: boolean;
    message: string;
    isAnnouncement?: boolean;
    showModeration?: boolean;
    removeMessage: () => void;
}

// Define a type for stored messages (server data without UI props)
interface StoredChatMessage {
    id: number;
    user?: string;
    admin?: boolean;
    message: string;
    isAnnouncement?: boolean;
    deleted?: boolean;
}

// Memoizamos el mensaje para evitar re-renders masivos
const ChatMessageItem = memo(({
    user,
    message,
    isAnnouncement,
    admin,
    showModeration,
    removeMessage,
}: ChatMessageProps) => {
    const parsedMessage = useMemo(() => {
        const withLinks = parseLinks(message);
        return parseEmotesToHTML(withLinks);
    }, [message]);

    if (isAnnouncement) {
        return (
            <div class="bg-pink-900/20 text-pink-300 p-3 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)] mb-2 text-sm backdrop-blur-sm rounded">
                <div class="flex items-center gap-2 mb-1 border-b border-pink-500/30 pb-1">
                    <LucideMegaphone size={16} />
                    <span class="font-atomic uppercase tracking-widest text-pink-400">Sistema</span>
                </div>
                <span dangerouslySetInnerHTML={{ __html: parsedMessage }} />
            </div>
        );
    }

    return (
        <div class="group relative flex gap-x-3 w-full hover:bg-white/5 p-2 items-start text-sm transition-all duration-300 border-l-[3px] border-transparent hover:border-pink-500/50 hover:pl-3">
            {showModeration && (
                <button
                    class="absolute right-2 -top-2 opacity-0 group-hover:opacity-100 text-white bg-red-600 border border-red-800 rounded p-1 hover:bg-red-500 transition shadow-[0_0_10px_rgba(220,38,38,0.5)] z-10"
                    onClick={removeMessage}
                    title="Eliminar Mensaje"
                >
                    <LucideX size={12} />
                </button>
            )}
            <div class="flex flex-col w-full break-words min-w-0">
                <span class={`font-atomic w-max flex items-center gap-x-2 text-xs uppercase tracking-wider ${admin ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'text-neutral-400'}`}>
                    {admin && (
                        <Tooltip tooltipPosition="top" text="ADMIN / MOD">
                            <LucideSwords size={14} class="text-pink-400 animate-pulse" />
                        </Tooltip>
                    )}
                    {user}
                    <span class="text-neutral-600 text-[10px] select-none tracking-normal">
                        {admin ? " MOD" : "JUGADOR"}
                    </span>
                </span>
                <span
                    class="text-neutral-300 leading-relaxed break-words mt-1"
                    dangerouslySetInnerHTML={{ __html: parsedMessage }}
                />
            </div>
        </div>
    );
});

interface ChatProps {
    session: Session;
    channel: Channel;
}

export const ChatRoom = ({ session, channel }: ChatProps) => {
    const [messages, setMessages] = useState<StoredChatMessage[]>([]);
    const [textInput, setTextInput] = useState("");
    const [sending, setSending] = useState(false);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const [usersTyping, setUsersTyping] = useState<Set<string>>(new Set());
    const [chatLocked, setChatLocked] = useState(false);
    const [emotePickerOpen, setEmotePickerOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const userIsAdmin = session.user?.isAdmin;

    // --- LÓGICA DE SCROLL Y CARGA ---

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (isUserAtBottom) scrollToBottom();
    }, [messages, isUserAtBottom, scrollToBottom]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Tolerancia de 50px
        setIsUserAtBottom(scrollHeight - scrollTop - clientHeight <= 50);
    };

    // --- LÓGICA DE SOCKETS ---

    useEffect(() => {
        actions.streamerWars.getChatLockStatus().then(({ data }) => setChatLocked(!!data));

        actions.streamerWars.getAllMessages().then(({ data }) => {
            if (data?.messages) setMessages(data.messages.slice(-MAX_MESSAGES)); // Carga inicial limitada
            setTimeout(scrollToBottom, 100);
        });

        const handleNewMessage = (data: any) => {
            setMessages((prev) => {
                const next = [...prev, { ...data, isAnnouncement: data.type === "announcement" }];
                return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
            });

            if (!data.suppressAudio && data.type !== "announcement") {
                playSound({ sound: STREAMER_WARS_SOUNDS.NUEVO_MENSAJE, volume: 0.12 });
            }
        };

        channel.bind("new-message", handleNewMessage);
        channel.bind("clear-chat", () => {
            setMessages([]);
            toast.info("CHAT LIMPIADO");
        });
        channel.bind("lock-chat", () => {
            setChatLocked(true);
        });
        channel.bind("unlock-chat", () => setChatLocked(false));
        channel.bind("message-deleted", ({ messageId }: { messageId: number }) => {
            setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true } : m));
        });
        channel.bind("client-typing", ({ user }: { user: string }) => {
            setUsersTyping((prev) => new Set(prev).add(user));
            // Limpieza automática
            setTimeout(() => {
                setUsersTyping((prev) => {
                    const next = new Set(prev);
                    next.delete(user);
                    return next;
                });
            }, 2000);
        });

        return () => {
            channel.unbind_all();
        };
    }, [channel, scrollToBottom]);

    // --- HANDLERS DE INPUT ---

    const handleTyping = (e: any) => {
        const val = e.target.value;
        if (val.length > 200) return; // Límite duro de caracteres
        setTextInput(val);

        if (val.length > 0 && !typingTimeoutRef.current) {
            channel.trigger("client-typing", { user: session.user?.name });
            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000);
        }
    };

    const sendMessage = async () => {
        if (!textInput.trim() || sending) return;
        setSending(true);
        setEmotePickerOpen(false);

        const { error } = await actions.streamerWars.sendMessage({ message: textInput });

        if (error) toast.error("ERROR: SEND_FAILED");
        else {
            setTextInput("");
            // Re-focus textarea
            if (!/Mobi|Android/i.test(navigator.userAgent)) {
                textareaRef.current?.focus();
            }
        }
        setSending(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Inserta el emote en la posición del cursor del textarea
    const insertEmote = (emote: keyof typeof EMOTES) => {
        const code = `:${emote}:`;
        const input = textareaRef.current;
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;

        const newText = text.substring(0, start) + code + text.substring(end);

        if (newText.length <= 200) {
            setTextInput(newText);
            // Defer focus update
            requestAnimationFrame(() => {
                input.selectionStart = input.selectionEnd = start + code.length;
                input.focus();
            });
        }
    };

    const usersTypingText = useMemo(() => {
        const arr = Array.from(usersTyping);
        if (arr.length === 0) return "&nbsp;";
        if (arr.length < 3) return `${arr.join(" y ")} escribiendo...`;
        return "Varios usuarios escribiendo...";
    }, [usersTyping]);

    return (
        <div class={`flex flex-col w-full h-full bg-neutral-950/80 backdrop-blur-md relative p-0 ${MODERN_BOX} rounded-lg`}>
            {/* HEADER MODERN */}
            <div class="bg-gradient-to-b from-neutral-900 to-black border-b border-neutral-800 p-3 flex items-center justify-between select-none">
                <h3 class="text-lg font-atomic text-white flex items-center gap-2 tracking-widest">
                    <LucideMessageCircle class="text-pink-500" size={20} />
                    COMUNICACIONES
                </h3>
                <div class="flex gap-2">
                    <div class="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
                    <div class="w-2 h-2 bg-neutral-600 rounded-full"></div>
                    <div class="w-2 h-2 bg-neutral-600 rounded-full"></div>
                </div>
            </div>

            {/* AREA DE MENSAJES */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                class="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-y-2 relative scrollbar-squid"
            >
                {/* Overlay de Bloqueo */}
                {chatLocked && (
                    <div class="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-red-500 font-anton p-4 text-center backdrop-blur-md">
                        <LucideLock size={48} class="mb-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] rounded-full" />
                        <span class="text-xl font-atomic tracking-widest border border-red-500/50 p-3 bg-red-950/30 uppercase rounded">
                            SYSTEM_LOCK: ACTIVO
                        </span>
                    </div>
                )}

                {messages.map((msg) => (
                    msg.deleted ? (
                        <div key={msg.id} class="opacity-50 text-xs text-red-400 font-mono pl-2 border-l-2 border-red-900 italic py-1">
                            &lt;Mensaje eliminado por protocolo de seguridad&gt;
                        </div>
                    ) : (
                        <ChatMessageItem
                            key={msg.id}
                            {...msg}
                            showModeration={userIsAdmin && !msg.admin}
                            removeMessage={() => actions.streamerWars.deleteMessage({ messageId: msg.id })}
                        />
                    )
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* BOTÓN DE NUEVOS MENSAJES */}
            {!isUserAtBottom && (
                <div class="absolute bottom-20 left-0 right-0 flex justify-center z-10 transition-all duration-300">
                    <button
                        onClick={scrollToBottom}
                        class={`bg-pink-600/90 text-white font-anton tracking-wide px-4 py-2 text-xs uppercase flex items-center gap-2 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)] ${MODERN_BTN}`}
                    >
                        Nuevos Mensajes <LucideChevronDown size={16} />
                    </button>
                </div>
            )}

            {/* AREA DE ESCRITURA */}
            <div class="bg-black/50 p-3 border-t border-neutral-800">
                <div
                    class="text-pink-500/70 text-[10px] font-anton h-4 overflow-hidden mb-1 animate-pulse tracking-widest uppercase"
                    dangerouslySetInnerHTML={{ __html: usersTypingText }}
                />

                <div class="flex gap-2 items-stretch">
                    <div class="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={textInput}
                            onInput={handleTyping}
                            onKeyDown={handleKeyDown}
                            disabled={chatLocked}
                            maxLength={200}
                            rows={1}
                            class="w-full h-12 bg-neutral-900/50 text-white text-sm p-3 pr-10 resize-none outline-none border border-neutral-800 focus:border-pink-500/50 transition-colors placeholder:text-neutral-600 rounded"
                            placeholder={chatLocked ? "TRANSMISIÓN DETENIDA..." : "Mensaje al sistema..."}
                        />
                        <span class={`absolute right-2 bottom-3 text-[10px] font-anton tracking-wide ${textInput.length > 180 ? 'text-red-500' : 'text-neutral-600'}`}>
                            {textInput.length}/200
                        </span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <Popover
                            activator={
                                <button
                                    disabled={chatLocked}
                                    class={`text-neutral-400 p-2 h-full flex items-center justify-center disabled:opacity-50 rounded ${MODERN_BTN}`}
                                >
                                    <LucideSmilePlus size={20} />
                                </button>
                            }
                            className="mb-2"
                        >
                            <EmotePicker onSelect={insertEmote} />
                        </Popover>
                    </div>

                    <button
                        disabled={sending || !textInput.trim() || chatLocked}
                        onClick={sendMessage}
                        class={`text-white p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed rounded bg-pink-600/80 shadow-[0_0_10px_rgba(236,72,153,0.3)] ${MODERN_BTN}`}
                    >
                        <LucideSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};