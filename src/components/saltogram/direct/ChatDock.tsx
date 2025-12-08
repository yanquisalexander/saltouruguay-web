import { h } from 'preact';
import { useChatStore } from '@/stores/chatStore';
import MiniChatWindow from './MiniChatWindow';
import InboxWindow from './InboxWindow';
import { LucideMessageCircle, LucideX } from 'lucide-preact';

export default function ChatDock({ currentUser }: { currentUser: any }) {
    const { openChats, minimizedChats, isInboxOpen, toggleInbox, closeChat, maximizeChat } = useChatStore();

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-0 right-4 z-50 flex-row-reverse items-end gap-4 pointer-events-none hidden md:flex">
            {/* Main Inbox Trigger */}
            <div className="pointer-events-auto flex flex-col items-end">
                {isInboxOpen && (
                    <div className="mb-4 shadow-2xl rounded-t-lg overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                        <InboxWindow onClose={toggleInbox} />
                    </div>
                )}
                <button
                    onClick={toggleInbox}
                    className="h-14 w-14 bg-card text-card-foreground rounded-full shadow-xl border border-border flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                >
                    <LucideMessageCircle className="w-7 h-7" />
                </button>
            </div>

            {/* Open Chats */}
            {openChats.map(chat => {
                const isMinimized = minimizedChats.includes(chat.id);

                if (isMinimized) {
                    return (
                        <div key={chat.id} className="pointer-events-auto relative group animate-in zoom-in duration-200">
                            <button
                                onClick={() => maximizeChat(chat.id)}
                                className="h-12 w-12 rounded-full overflow-hidden border-2 border-border shadow-lg relative hover:ring-2 ring-primary transition-all"
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
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                                <LucideX size={12} />
                            </button>
                        </div>
                    );
                } return (
                    <div key={chat.id} className="pointer-events-auto shadow-2xl rounded-t-xl overflow-hidden">
                        <MiniChatWindow
                            otherUser={chat}
                            currentUser={currentUser}
                        />
                    </div>
                );
            })}
        </div>
    );
}
