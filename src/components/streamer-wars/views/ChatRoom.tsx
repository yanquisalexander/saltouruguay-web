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
const RETRO_BOX = "border-2 border-white bg-neutral-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]";
const RETRO_BTN = "active:translate-y-1 active:shadow-none transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

const parseLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
        urlRegex,
        (url) => `<a href="${url}" target="_blank" class="text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors underline decoration-dashed decoration-2">${url}</a>`
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
        <div class={`grid grid-cols-5 gap-2 p-2 bg-neutral-800 w-64 max-h-64 overflow-y-auto ${RETRO_BOX}`}>
            {Object.keys(EMOTES).map((emote) => (
                <button
                    key={emote}
                    class="w-10 h-10 bg-black/40 hover:bg-lime-500/20 border border-transparent hover:border-lime-500 flex items-center justify-center image-pixelated"
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
            <div class="bg-blue-900/80 text-cyan-300 p-3 border-2 border-cyan-500 shadow-[4px_4px_0px_0px_#06b6d4] mb-2 font-mono text-sm">
                <div class="flex items-center gap-2 mb-1 border-b border-cyan-500/50 pb-1">
                    <LucideMegaphone size={16} />
                    <span class="font-bold uppercase tracking-widest">Sistema</span>
                </div>
                <span dangerouslySetInnerHTML={{ __html: parsedMessage }} />
            </div>
        );
    }

    return (
        <div class="group relative flex gap-x-3 w-full hover:bg-white/5 p-2 items-start font-mono text-sm transition-colors border-l-2 border-transparent hover:border-lime-500/50">
            {showModeration && (
                <button
                    class="absolute right-2 -top-2 opacity-0 group-hover:opacity-100 text-white bg-red-600 border-2 border-black p-1 hover:bg-red-500 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10"
                    onClick={removeMessage}
                    title="Eliminar Mensaje"
                >
                    <LucideX size={12} />
                </button>
            )}
            <div class="flex flex-col w-full break-words min-w-0">
                <span class={`font-bold w-max flex items-center gap-x-2 text-xs uppercase tracking-wide ${admin ? 'text-yellow-400 drop-shadow-md' : 'text-lime-400'}`}>
                    {admin && (
                        <Tooltip tooltipPosition="top" text="ADMIN / MOD">
                            <LucideSwords size={14} class="text-yellow-400 animate-pulse" />
                        </Tooltip>
                    )}
                    {user}
                    <span class="text-neutral-600 text-[10px] select-none">
                        {admin ? " MOD" : "Jugador"}
                    </span>
                </span>
                <span
                    class="text-neutral-200 leading-relaxed break-words"
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
        <div class={`flex flex-col w-full h-full bg-neutral-950 relative p-1 ${RETRO_BOX}`}>
            {/* HEADER RETRO */}
            <div class="bg-neutral-800 border-b-2 border-white/20 p-2 flex items-center justify-between select-none">
                <h3 class="text-lg font-bold text-white flex items-center gap-2 tracking-wider">
                    <LucideMessageCircle class="text-lime-500" size={20} />
                    CHAT_ROOM_V1
                </h3>
                <div class="flex gap-1">
                    <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
            </div>

            {/* AREA DE MENSAJES */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                class="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-y-1 relative scrollbar-retro"
                style={{ imageRendering: "pixelated" }}
            >
                {/* Overlay de Bloqueo */}
                {chatLocked && (
                    <div class="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-red-500 font-mono p-4 text-center backdrop-blur-sm">
                        <LucideLock size={48} class="mb-2 animate-bounce" />
                        <span class="text-xl font-bold border-2 border-red-500 p-2 bg-black uppercase">
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
                <div class="absolute bottom-20 left-0 right-0 flex justify-center z-10">
                    <button
                        onClick={scrollToBottom}
                        class={`bg-lime-500 text-black font-bold px-4 py-1 text-xs uppercase flex items-center gap-2 animate-bounce ${RETRO_BTN}`}
                    >
                        New Msg <LucideChevronDown size={16} />
                    </button>
                </div>
            )}

            {/* AREA DE ESCRITURA */}
            <div class="bg-neutral-900 p-2 border-t-2 border-white/20">
                <div
                    class="text-lime-500 text-[10px] font-mono h-4 overflow-hidden mb-1 animate-pulse"
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
                            class="w-full h-12 bg-black text-white font-mono text-sm p-2 pr-10 resize-none outline-none border-2 border-neutral-700 focus:border-lime-500 transition-colors placeholder:text-neutral-700"
                            placeholder={chatLocked ? "TRANSMISIÓN DE DATOS DETENIDA..." : "Insertar comando..."}
                        />
                        <span class={`absolute right-2 bottom-2 text-[10px] ${textInput.length > 180 ? 'text-red-500' : 'text-neutral-600'}`}>
                            {textInput.length}/200
                        </span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <Popover
                            activator={
                                <button
                                    disabled={chatLocked}
                                    class={`bg-neutral-700 text-white p-2 h-full flex items-center justify-center hover:bg-neutral-600 disabled:opacity-50 ${RETRO_BTN}`}
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
                        class={`bg-lime-600 text-white p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-500 ${RETRO_BTN}`}
                    >
                        <LucideSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};