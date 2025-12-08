import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
}

interface ChatState {
    openChats: User[];
    minimizedChats: number[];
    isInboxOpen: boolean;

    openChat: (user: User) => void;
    closeChat: (userId: number) => void;
    minimizeChat: (userId: number) => void;
    maximizeChat: (userId: number) => void;
    toggleInbox: () => void;
    setInboxOpen: (isOpen: boolean) => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            openChats: [],
            minimizedChats: [],
            isInboxOpen: false,

            openChat: (user) => {
                const { openChats, minimizedChats } = get();
                const exists = openChats.find(u => u.id === user.id);

                if (exists) {
                    // If it's minimized, maximize it
                    if (minimizedChats.includes(user.id)) {
                        set({ minimizedChats: minimizedChats.filter(id => id !== user.id) });
                    }
                    return;
                }

                // Limit to 3 open chats to avoid clutter
                const newChats = [...openChats];
                if (newChats.length >= 3) {
                    newChats.shift(); // Remove the oldest one
                }

                set({
                    openChats: [...newChats, user],
                    isInboxOpen: false // Close inbox when opening a chat
                });
            },

            closeChat: (userId) => {
                set({
                    openChats: get().openChats.filter(u => u.id !== userId),
                    minimizedChats: get().minimizedChats.filter(id => id !== userId)
                });
            },

            minimizeChat: (userId) => {
                const { minimizedChats } = get();
                if (!minimizedChats.includes(userId)) {
                    set({ minimizedChats: [...minimizedChats, userId] });
                }
            },

            maximizeChat: (userId) => {
                set({ minimizedChats: get().minimizedChats.filter(id => id !== userId) });
            },

            toggleInbox: () => set({ isInboxOpen: !get().isInboxOpen }),
            setInboxOpen: (isOpen) => set({ isInboxOpen: isOpen }),
        }),
        {
            name: 'saltogram-chat-storage',
        }
    )
);
