import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useChatStore } from '@/stores/chatStore';
import MiniChatWindow from './MiniChatWindow';
import InboxWindow from './InboxWindow';
import { LucideMessageCircle, LucideX, LucideMinus } from 'lucide-preact';

interface ChatDockProps {
    currentUser: any;
}

export default function ChatDock({ currentUser }: ChatDockProps) {
    const { openChats, minimizedChats, isInboxOpen, toggleInbox, closeChat, maximizeChat, minimizeChat } = useChatStore();
    const storageKey = 'saltogram-chat-storage';

    // ── Sincronización entre pestañas via storage event ──
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === storageKey) {
                useChatStore.getState().syncFromStorage();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-0 right-4 z-50 flex-row-reverse items-end gap-3 pointer-events-none hidden md:flex">
            {/* Open Chats */}
            {openChats.map(chat => {
                const isMinimized = minimizedChats.includes(chat.id);

                if (isMinimized) {
                    return (
                        <div key={chat.id} className="pointer-events-auto relative group">
                            <button
                                onClick={() => maximizeChat(chat.id)}
                                className="h-11 w-11 rounded-full overflow-hidden border-2 border-[#2a2d4a] shadow-lg hover:ring-2 ring-[#b3c8ff]/50 transition-all duration-200 active:scale-95"
                                title={chat.displayName}
                            >
                                <img
                                    src={chat.avatar || `https://ui-avatars.com/api/?name=${chat.displayName}`}
                                    alt={chat.displayName}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                            <button
                                onClick={() => closeChat(chat.id)}
                                className="absolute -top-1.5 -right-1.5 bg-[#ffb4ab] text-[#690005] rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:scale-105 active:scale-90"
                            >
                                <LucideX size={10} />
                            </button>
                        </div>
                    );
                }

                return (
                    <div key={chat.id} className="pointer-events-auto shadow-2xl rounded-t-[28px] overflow-hidden">
                        <MiniChatWindow
                            otherUser={chat}
                            currentUser={currentUser}
                        />
                    </div>
                );
            })}

            {/* Inbox Trigger */}
            <div className="pointer-events-auto flex flex-col items-end">
                {isInboxOpen && (
                    <div className="mb-3 shadow-2xl rounded-t-[28px] overflow-hidden">
                        <InboxWindow onClose={toggleInbox} />
                    </div>
                )}
                <button
                    onClick={toggleInbox}
                    className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
                        isInboxOpen
                            ? 'bg-[#b3c8ff] text-[#001849] hover:bg-[#c5d5ff] border border-[#b3c8ff]'
                            : 'bg-[#0f1124]/80 backdrop-blur-xl text-white/70 hover:text-white hover:bg-[#b3c8ff]/10 border border-white/10 hover:border-[#b3c8ff]/30'
                    }`}
                    title="Mensajes"
                >
                    <LucideMessageCircle size={20} />
                </button>
            </div>
        </div>
    );
}
