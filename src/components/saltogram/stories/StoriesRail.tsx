import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { LucidePlus, LucideLoader2 } from "lucide-preact";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";
import type { Session } from "@auth/core/types";

interface StoriesRailProps {
    user?: Session['user'];
}

export default function StoriesRail({ user }: StoriesRailProps) {
    const [feed, setFeed] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [initialStoryId, setInitialStoryId] = useState<number | undefined>(undefined);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const { data, error } = await actions.stories.getFeed();
            if (data) {
                setFeed(data.feed);

                // Check for story param
                const urlParams = new URLSearchParams(window.location.search);
                const storyIdParam = urlParams.get('story');

                if (storyIdParam) {
                    const storyId = parseInt(storyIdParam);
                    if (!isNaN(storyId)) {
                        const userIndex = data.feed.findIndex((item: any) =>
                            item.stories.some((s: any) => s.id === storyId)
                        );

                        if (userIndex !== -1) {
                            setInitialStoryId(storyId);
                            setSelectedUserIndex(userIndex);

                            // Remove param
                            const newUrl = window.location.pathname;
                            window.history.replaceState({}, '', newUrl);
                        } else {
                            toast.error("Esta historia no está disponible");
                            const newUrl = window.location.pathname;
                            window.history.replaceState({}, '', newUrl);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStoryClick = (index: number) => {
        setSelectedUserIndex(index);
    };

    const handleCloseViewer = () => {
        setSelectedUserIndex(null);
        setInitialStoryId(undefined);
        fetchStories(); // Refresh to update seen status
    };

    const handleStoryCreated = () => {
        setIsCreateModalOpen(false);
        fetchStories();
    };

    if (loading) return (
        <div className="flex gap-4 overflow-x-auto py-4 px-2 no-scrollbar">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-28 h-48 bg-[#242526] rounded-xl animate-pulse" />
            ))}
        </div>
    );

    return (
        <div className="relative mb-6">
            <div className="flex gap-2 overflow-x-auto pb-4 px-0 no-scrollbar snap-x">
                {/* Create Story Card */}
                {user && (
                    <div
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-shrink-0 w-28 h-48 relative rounded-xl overflow-hidden cursor-pointer group snap-start bg-[#242526] border border-white/5"
                    >
                        <div className="h-32 w-full overflow-hidden">
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                alt="Tu historia"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-16 bg-[#242526] flex flex-col items-center justify-end pb-2">
                            <div className="absolute -top-4 p-1 bg-[#242526] rounded-full">
                                <div className="bg-blue-500 p-1.5 rounded-full text-white">
                                    <LucidePlus size={20} />
                                </div>
                            </div>
                            <span className="text-white text-xs font-medium mt-4">Crear historia</span>
                        </div>
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* Stories List */}
                {feed.map((item, index) => (
                    <div
                        key={item.user.id}
                        onClick={() => handleStoryClick(index)}
                        className="flex-shrink-0 w-28 h-48 relative rounded-xl overflow-hidden cursor-pointer group snap-start"
                    >
                        {/* Background Image (Last story thumbnail - Newest) */}
                        {item.stories[item.stories.length - 1].mediaType === 'image' ? (
                            <img
                                src={item.stories[item.stories.length - 1].mediaUrl}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <video
                                src={item.stories[item.stories.length - 1].mediaUrl}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

                        {/* User Avatar Ring */}
                        <div className={`absolute top-3 left-3 p-1 rounded-full ${item.stories.some((s: any) => s.visibility === 'vip' && !s.isSeen) ? 'bg-green-500' : item.hasUnseen ? 'bg-blue-500' : 'bg-white/30'}`}>
                            <img
                                src={item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.displayName}`}
                                className="w-8 h-8 rounded-full border-2 border-[#242526]"
                            />
                        </div>

                        {/* User Name */}
                        <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-xs font-medium truncate text-shadow-sm">
                                {item.user.displayName}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedUserIndex !== null && (
                    <StoryViewer
                        key="story-viewer"
                        feed={feed}
                        initialUserIndex={selectedUserIndex}
                        onClose={handleCloseViewer}
                        currentUser={user}
                        initialStoryId={initialStoryId}
                    />
                )}
            </AnimatePresence>

            {user && (
                <CreateStoryModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={handleStoryCreated}
                />
            )}
        </div>
    );
}
