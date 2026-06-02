import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { LucidePlus, LucideLoader2 } from "lucide-preact";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";
import type { Session } from "@auth/core/types";

interface StoriesRailProps {
    user?: Session["user"];
}

export default function StoriesRail({ user }: StoriesRailProps) {
    const [feed, setFeed] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [initialStoryId, setInitialStoryId] = useState<number | undefined>(undefined);

    useEffect(() => { fetchStories(); }, []);

    const fetchStories = async () => {
        try {
            const { data } = await actions.stories.getFeed();
            if (data) {
                setFeed(data.feed);
                const urlParams = new URLSearchParams(window.location.search);
                const storyIdParam = urlParams.get("story");
                if (storyIdParam) {
                    const storyId = parseInt(storyIdParam);
                    if (!isNaN(storyId)) {
                        const userIndex = data.feed.findIndex((item: any) =>
                            item.stories.some((s: any) => s.id === storyId)
                        );
                        if (userIndex !== -1) {
                            setInitialStoryId(storyId);
                            setSelectedUserIndex(userIndex);
                        } else {
                            toast.error("Esta historia no está disponible");
                        }
                        window.history.replaceState({}, "", window.location.pathname);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseViewer = () => {
        setSelectedUserIndex(null);
        setInitialStoryId(undefined);
        fetchStories();
    };

    if (loading) return (
        <div class="flex gap-2.5 overflow-x-auto py-1 px-4 no-scrollbar">
            {[1, 2, 3, 5].map(i => (
                <div key={i} class="shrink-0 w-[108px] aspect-[9/16] rounded-[20px] bg-[#2e2f31] animate-pulse" />
            ))}
        </div>
    );

    return (
        <div class="relative mb-6">
            <div class="flex gap-2.5 overflow-x-auto pb-3 px-4 no-scrollbar snap-x">

                {/* Crear historia */}
                {user && (
                    <div
                        onClick={() => setIsCreateModalOpen(true)}
                        class="shrink-0 w-[108px] aspect-[9/16] rounded-[20px] overflow-hidden cursor-pointer
                   flex flex-col bg-[#2e2f31] border border-white/[0.07] snap-start
                   hover:scale-[1.04] active:scale-[0.97] transition-transform duration-200"
                        style={{ transitionTimingFunction: "cubic-bezier(0.2,0,0,1)" }}
                    >
                        {/* Foto del usuario */}
                        <div class="w-full h-[112px] overflow-hidden flex-shrink-0">
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                alt="Tu historia"
                                class="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.07]"
                            />
                        </div>

                        {/* Parte inferior */}
                        <div class="flex-1 bg-[#2e2f31] flex flex-col items-center justify-end pb-2.5 relative">
                            {/* FAB M3 */}
                            <div class="absolute -top-[18px] w-9 h-9 rounded-xl bg-blue-500
                          flex items-center justify-center text-white
                          border-[2.5px] border-[#2e2f31]
                          shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
                                <LucidePlus size={18} />
                            </div>
                            <span class="text-xs font-semibold text-white/90 mt-[22px] tracking-[0.1px]">
                                Crear historia
                            </span>
                        </div>
                    </div>
                )}

                {/* Historias */}
                {feed.map((item, index) => {
                    const lastStory = item.stories[item.stories.length - 1];
                    const isVipUnseen = item.stories.some((s: any) => s.visibility === "vip" && !s.isSeen);
                    const ringColor = isVipUnseen
                        ? "bg-green-500"
                        : item.hasUnseen
                            ? "bg-blue-500"
                            : "bg-white/25";

                    return (
                        <div
                            key={item.user.id}
                            onClick={() => setSelectedUserIndex(index)}
                            class="shrink-0 w-[108px] aspect-[9/16] rounded-[20px] overflow-hidden cursor-pointer
                     relative snap-start
                     hover:scale-[1.04] active:scale-[0.97] transition-transform duration-200"
                            style={{ transitionTimingFunction: "cubic-bezier(0.2,0,0,1)" }}
                        >
                            {/* Fondo */}
                            {lastStory.mediaType === "image" ? (
                                <img
                                    src={lastStory.mediaUrl}
                                    class="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <video
                                    src={lastStory.mediaUrl}
                                    class="absolute inset-0 w-full h-full object-cover"
                                />
                            )}

                            {/* Gradiente */}
                            <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/65" />

                            {/* Avatar con anillo */}
                            <div class={`absolute top-2.5 left-2.5 p-[2.5px] rounded-full ${ringColor}`}>
                                <img
                                    src={item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.displayName}`}
                                    class="w-[30px] h-[30px] rounded-full border-2 border-[#242526]"
                                />
                            </div>

                            {/* Nombre */}
                            <p class="absolute bottom-2.5 left-2 right-2 text-white text-xs font-semibold
                        truncate tracking-[0.1px]"
                                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                                {item.user.displayName}
                            </p>
                        </div>
                    );
                })}
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
                    onCreated={() => { setIsCreateModalOpen(false); fetchStories(); }}
                />
            )}
        </div>
    );
}