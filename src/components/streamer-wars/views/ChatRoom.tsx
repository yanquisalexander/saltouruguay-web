import { useEffect, useRef, useState, useMemo } from "preact/hooks";
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
    LucideVerified,
    LucideX,
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import { EMOTES } from "@/consts/Emotes";
import { GLOBAL_CDN_PREFIX } from "@/config";
import { Popover } from "@/components/Popover";
import { Tooltip } from "@/components/Tooltip";

const EmotePicker = ({
    onSelect,
    setSendAsReaction,
    isOpen,
}: {
    onSelect: (emote: keyof typeof EMOTES) => void;
    setSendAsReaction?: (sendAsReaction: boolean) => void;
    isOpen?: boolean;
}) => {
    return (
        <div class="flex flex-col gap-2">
            <div class="grid grid-cols-6 gap-2">
                {Object.keys(EMOTES).map((emote) => (
                    <button
                        class="w-12 h-12 bg-black/20 rounded-md flex items-center justify-center"
                        onClick={() => onSelect(emote as keyof typeof EMOTES)}
                    >
                        <img
                            src={`${GLOBAL_CDN_PREFIX}${EMOTES[emote as keyof typeof EMOTES]}`}
                            alt={emote}
                            class="w-8 h-8"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

interface ChatMessage {
    id: number;
    user?: string;
    admin?: boolean;
    message: string;
    isAnnouncement?: boolean;
    showModeration?: boolean;
    removeMessage?: () => void;
    deleted?: boolean;
}

interface ChatProps {
    session: Session;
    channel: Channel;
}

const parseEmotesToHTML = (text: string) => {
    return text
        .replace(/\n/g, '<br>')
        .replace(/:([a-zA-Z0-9_]+):/g, (match, emote) => {
            const src = EMOTES[emote as keyof typeof EMOTES];
            return src
                ? `<img src="${GLOBAL_CDN_PREFIX}${src}" alt="${emote}" class="inline-block w-6 h-6" />`
                : match;
        });
};

const ChatMessageComponent = ({
    id,
    user,
    message,
    isAnnouncement,
    admin,
    showModeration,
    removeMessage,
}: ChatMessage) => {
    // Función para transformar cadenas tipo ":emote:" en imágenes
    const parsedMessage = parseEmotesToHTML(message);
    return (
        <div class="flex gap-x-2 w-full bg-white/5 p-2 items-start relative">
            {showModeration && (
                <button
                    class="absolute right-2 top-2 text-white bg-red-500 p-1 rounded-md hover:bg-red-600 transition"
                    onClick={removeMessage}
                >
                    <LucideX size={16} />
                </button>
            )}
            <div class="flex flex-col w-full gap-y-2 break-words grow flex-1">
                <span class="font-bold w-max flex items-center gap-x-2">
                    {admin && (
                        <Tooltip tooltipPosition="top" text="Este usuario es un moderador">
                            <LucideSwords size={16} class="text-sky-500" />
                        </Tooltip>
                    )}
                    {user}
                </span>
                <span
                    class="w-full break-words text-wrap overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: parsedMessage }}
                />
            </div>
        </div>
    );
};

const getCaretCharacterOffsetWithin = (element: Node): number => {
    let caretOffset = 0;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
};


const placeCaretAtEnd = (element: HTMLElement) => {
    const range = document.createRange();
    const sel = window.getSelection()!;
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
};



const setCaretPosition = (element: Node, offset: number) => {
    const range = document.createRange();
    let currentOffset = offset;
    let nodeStack: Node[] = [element];
    let found = false;

    while (nodeStack.length && !found) {
        const node = nodeStack.shift()!;
        if (node.nodeType === Node.TEXT_NODE) {
            const textLength = node.textContent?.length || 0;
            if (currentOffset > textLength) {
                currentOffset -= textLength;
            } else {
                range.setStart(node, currentOffset);
                range.collapse(true);
                found = true;
                break;
            }
        } else {
            nodeStack = [...node.childNodes, ...nodeStack];
        }
    }

    if (!found) {
        // Si no se encontró, ubica el caret al final
        range.selectNodeContents(element);
        range.collapse(false);
    }

    const sel = window.getSelection();
    if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

// Función que obtiene el contenido "plano" del editor, convirtiendo imágenes en su código de emote
const getEditableContent = (element: HTMLElement): string => {
    let result = "";
    element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.textContent;
        } else if (node.nodeName === "BR") {
            result += "\n";
        } else if (node.nodeName === "IMG") {
            // Suponemos que el alt contiene el nombre del emote
            const img = node as HTMLImageElement;
            result += `:${img.alt}:`;
        } else if (node instanceof HTMLElement) {
            result += getEditableContent(node);
        }
    });
    return result;
};



export const ChatRoom = ({ session, channel }: ChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState<string>("");
    const [sending, setSending] = useState<boolean>(false);
    const messagesContainer = useRef<HTMLDivElement>(null);
    // Estado que indica si el usuario está en el fondo del chat
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const [emotePickerOpen, setEmotePickerOpen] = useState<boolean>(false);
    const [usersTyping, setUsersTyping] = useState<Set<string>>(new Set());

    const editableRef = useRef<HTMLDivElement>(null);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const [chatLocked, setChatLocked] = useState<boolean>(false);

    const fetchLockStatus = async () => {
        const { data: locked } = await actions.streamerWars.getChatLockStatus();
        if (locked !== undefined) {
            setChatLocked(locked);
        }
    }

    const handleInput = (e: Event) => {
        if (!editableRef.current || chatLocked) return;
        const target = e.currentTarget as HTMLElement;
        let rawText = getEditableContent(target);

        // Validar longitud máxima
        if (rawText.length > 200) {
            rawText = rawText.substring(0, 200);
            // Actualizamos manualmente el contenido si se excede la longitud
            target.innerHTML = parseEmotesToHTML(rawText);
            placeCaretAtEnd(target);
        }

        setMessage(rawText);
        setShowPlaceholder(rawText === '');
    };


    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const userIsAdmin = session.user?.isAdmin;

    // Se utiliza un ref para almacenar el timeout del "typing"
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const SCROLL_THRESHOLD = 50;
    const caretAfterEmoteRef = useRef<boolean>(false);

    useEffect(() => {
        if (!editableRef.current) return;

        // Guarda el offset actual del caret (si no se insertó un emote, se usará este valor)
        const caretOffset = getCaretCharacterOffsetWithin(editableRef.current);
        const parsed = parseEmotesToHTML(message);

        if (editableRef.current.innerHTML !== parsed) {
            editableRef.current.innerHTML = parsed;
        }

        setShowPlaceholder(message === '');

        if (caretAfterEmoteRef.current) {
            // Si se acaba de insertar un emote, forzamos el caret al final
            const range = document.createRange();
            range.selectNodeContents(editableRef.current);
            range.collapse(false);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            caretAfterEmoteRef.current = false;
        } else {
            // Si no, se restaura la posición original
            setCaretPosition(editableRef.current, caretOffset);
        }
    }, [message]);

    // Función para hacer scroll hasta el fondo del contenedor
    const scrollToBottom = () => {
        if (messagesContainer.current) {
            messagesContainer.current.scrollTo({
                top: messagesContainer.current.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    useEffect(() => {
        fetchLockStatus();
    }, []);

    // Función que muestra quién está escribiendo
    const usersTypingMessage = useMemo(() => {
        const typingArray = Array.from(usersTyping);
        if (typingArray.length === 1) {
            return `${typingArray[0]} está escribiendo...`;
        } else if (typingArray.length === 2) {
            return `${typingArray.join(" y ")} están escribiendo...`;
        } else if (typingArray.length > 2) {
            return `${typingArray.slice(0, 2).join(", ")} y otros están escribiendo...`;
        }
        return "&nbsp;";
    }, [usersTyping]);

    const handleRemoveMessage = async (id: number) => {
        await actions.streamerWars.deleteMessage({ messageId: id });
    }

    // Se actualiza el flag según la posición actual del scroll
    const handleScroll = () => {
        const container = messagesContainer.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const atBottom = scrollHeight - (scrollTop + clientHeight) <= SCROLL_THRESHOLD;
        setIsUserAtBottom(atBottom);
    };

    useEffect(() => {
        // Cargar mensajes existentes y hacer scroll inicial
        actions.streamerWars.getAllMessages().then(({ data }) => {
            if (data?.messages) {
                setMessages(data.messages);
            }
            scrollToBottom();
        });

        // Vincular eventos del canal
        channel.bind("clear-chat", () => {
            setMessages([]);
            toast.info("Un moderador ha limpiado el chat");
        });

        channel.bind("unlock-chat", () => {
            setChatLocked(false);
            toast.success("El chat ha sido desbloqueado");
        })

        channel.bind("lock-chat", () => {
            setChatLocked(true);
            toast.error("El chat ha sido bloqueado por un moderador");
        })

        channel.bind("message-deleted", ({ messageId }: { messageId: number }) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.id === messageId) {
                        return { ...msg, deleted: true };
                    }
                    return msg;
                })
            );
        });

        channel.bind("client-typing", ({ user }: { user: string }) => {
            setUsersTyping((prev) => new Set([...prev, user]));
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setUsersTyping((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(user);
                    return newSet;
                });
            }, 2000);
        });

        channel.bind(
            "new-message",
            ({
                id,
                user,
                message,
                type,
                suppressAudio,
                admin,
            }: {
                id: number;
                user: string;
                message: string;
                type: string;
                suppressAudio?: boolean;
                admin?: boolean;
            }) => {
                setMessages((prev) => [
                    ...prev,
                    { id, user, message, isAnnouncement: type === "announcement", admin },
                ]);

                // Reproducir sonidos según el tipo de mensaje
                const emoteOnlyMatch = message.match(/^:([a-zA-Z0-9_]+):$/);
                const isReaction =
                    emoteOnlyMatch && EMOTES[emoteOnlyMatch[1] as keyof typeof EMOTES];

                if (!suppressAudio) {
                    if (type !== "announcement") {
                        playSound({ sound: STREAMER_WARS_SOUNDS.NUEVO_MENSAJE, volume: 0.12 });
                    }
                }
            }
        );

        // Cleanup: Desvincular los eventos al desmontar
        return () => {
            channel.unbind("new-message");
            channel.unbind("client-typing");
            channel.unbind("clear-chat");
        };
    }, [channel]);

    // Auto-scroll solo si el usuario está en el fondo
    useEffect(() => {
        if (isUserAtBottom) {
            scrollToBottom();
        }
    }, [messages, isUserAtBottom]);

    // Función para transformar URLs en enlaces clicables
    const parseLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(
            urlRegex,
            (url) =>
                `<a href="${url}" target="_blank" class="text-lime-500 hover:underline">${url}</a>`
        );
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
        if (message.trim().length > 0) {
            channel.trigger("client-typing", { user: session.user?.name });
        }
    }, [message]);

    const onEmoteSelect = (emote: keyof typeof EMOTES) => {
        if (!editableRef.current) return;

        const emoteCode = `:${emote}:`;

        /* 
            Inserta el emote al final del contenido
            y marca el flag para forzar el caret al final
        */

        editableRef.current.innerHTML += parseEmotesToHTML(emoteCode);
        caretAfterEmoteRef.current = true;
        setMessage(`${message}${emoteCode}`);
        editableRef.current.focus();

    };




    return (
        <div class="flex flex-col w-full h-full bg-neutral-950 border border-lime-500 border-dashed relative rounded-md px-4 py-3">
            <h3 class="text-2xl font-teko py-2">
                <LucideMessageCircle size={24} class="inline-block mr-2" />
                Chat de participantes
            </h3>
            <div
                class="h-[320px] w-full overflow-y-auto flex flex-col gap-2 p-2 relative"
                style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#4B5563 #E5E7EB",
                }}
            >
                {
                    chatLocked && (
                        <div class="bg-neutral-800 z-10 h-full items-center justify-center absolute bottom-0 text-white flex p-2 border border-dashed border-neutral-500">
                            <div class="w-full flex-col flex justify-center items-center gap-y-4">
                                <LucideLock size={24} />
                                <span class="w-full break-words text-wrap text-center overflow-hidden italic">
                                    El chat ha sido bloqueado por un moderador
                                </span>
                            </div>
                        </div>
                    )
                }
                <div
                    onScroll={handleScroll}
                    ref={messagesContainer}
                    class="flex flex-col flex-1 overflow-y-auto gap-y-2 w-full h-full scroll-smooth"
                >
                    {messages.map(({ id, message, user, isAnnouncement, admin, deleted }, index) => {

                        return deleted ? (
                            <div
                                key={index}
                                class="bg-red-500/10 text-white flex p-2 border border-dashed border-red-500"
                            >
                                <div class="w-full flex-col flex gap-x-2">
                                    <span class="font-bold">{user}</span>
                                    <span class="w-full break-words text-wrap overflow-hidden italic">
                                        Mensaje eliminado por un moderador
                                    </span>
                                </div>
                            </div>
                        ) :

                            isAnnouncement ? (
                                <div
                                    key={index}
                                    class="bg-blue-500/30 text-white p-2 border border-dashed border-blue-500"
                                >
                                    <LucideMegaphone size={24} />
                                    <span
                                        class="w-full break-words text-wrap overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: parseLinks(message) }}
                                    />
                                </div>
                            ) : (
                                <ChatMessageComponent
                                    key={index}
                                    id={id}
                                    user={user}
                                    message={message}
                                    admin={admin}
                                    showModeration={userIsAdmin && !admin}
                                    removeMessage={() => handleRemoveMessage(id)}
                                />
                            );
                    })}
                    {/* Se muestra el botón solo si el usuario NO está en el fondo */}
                    {!isUserAtBottom && (
                        <button
                            class="z-[999] sticky mx-auto bottom-4 bg-neutral-700 transition hover:bg-neutral-800 text-white p-2 rounded-md text-center shadow-lg"
                            onClick={() => {
                                scrollToBottom();
                                setIsUserAtBottom(true);
                            }}
                        >
                            Ver mensajes nuevos{" "}
                            <LucideChevronDown size={24} class="inline-block" />
                        </button>
                    )}
                </div>
            </div>

            <div
                class="text-white text-xs opacity-50"
                dangerouslySetInnerHTML={{ __html: usersTypingMessage }}
            />

            <footer class="grid mt-4 grid-cols-8 gap-x-2">
                <div class="relative col-span-5 w-full flex min-h-12 bg-black/20 rounded-md border mr-2 resize-none">
                    <div
                        ref={editableRef}
                        contentEditable={!chatLocked}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={chatLocked}
                        class="p-2 text-white overflow-hidden whitespace-pre-wrap outline-none empty:before:content-[attr(placeholder)] empty:before:text-gray-400 disabled:cursor-not-allowed"
                        placeholder="Escribe un mensaje..."
                    />
                    {showPlaceholder && (
                        <div class="absolute top-2 left-2 text-gray-400 pointer-events-none">
                            Escribe un mensaje...
                        </div>
                    )}
                </div>
                <div class="flex gap-x-2 col-span-3 items-start justify-end">
                    <Popover
                        className="bg-neutral-500 rounded-md p-4"
                        activator={
                            <button
                                disabled={chatLocked}
                                class="bg-neutral-700 px-4 py-2 rounded-md text-white hover:bg-neutral-500 transition disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed">
                                <LucideSmilePlus size={24} />
                            </button>
                        }
                    >
                        <EmotePicker onSelect={onEmoteSelect} isOpen={emotePickerOpen} />
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
        </div >
    );
};
