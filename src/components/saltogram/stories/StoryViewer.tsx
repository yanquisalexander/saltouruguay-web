import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideX, LucideHeart, LucideChevronLeft, LucideChevronRight, LucideEye, LucideTrash2 } from "lucide-preact";
import type { Session } from "@auth/core/types";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface StoryViewerProps {
    feed: any[];
    initialUserIndex: number;
    onClose: () => void;
    currentUser?: Session['user'];
}

export default function StoryViewer({ feed, initialUserIndex, onClose, currentUser }: StoryViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);

    // Initialize with first unseen story or 0
    const [currentStoryIndex, setCurrentStoryIndex] = useState(() => {
        const stories = feed[initialUserIndex].stories;
        const firstUnseenIndex = stories.findIndex((s: any) => !s.isSeen);
        return firstUnseenIndex !== -1 ? firstUnseenIndex : 0;
    });

    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const progressInterval = useRef<number | null>(null);

    const userStories = feed[currentUserIndex];
    const story = userStories.stories[currentStoryIndex];
    const isOwner = currentUser?.id && Number(currentUser.id) === story.userId;

    // Reset state when user changes
    useEffect(() => {
        const stories = feed[currentUserIndex].stories;
        const firstUnseenIndex = stories.findIndex((s: any) => !s.isSeen);
        setCurrentStoryIndex(firstUnseenIndex !== -1 ? firstUnseenIndex : 0);
        setProgress(0);
    }, [currentUserIndex]);

    // Reset state when story changes
    useEffect(() => {
        setProgress(0);
        setLiked(story.isLiked);
        setLikesCount(story.likesCount);

        // Mark as viewed
        if (!story.isSeen && !isOwner) {
            actions.stories.view({ storyId: story.id });
        }
    }, [story]);

    // Control video playback
    useEffect(() => {
        if (story.mediaType === 'video' && videoRef.current) {
            if (isPaused) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(() => { });
            }
        }
    }, [isPaused, story.mediaType]);

    // Timer Logic
    useEffect(() => {
        if (isPaused) return;

        const duration = story.duration * 1000;
        const intervalTime = 50;
        const step = (intervalTime / duration) * 100;

        progressInterval.current = window.setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, intervalTime);

        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [story, isPaused, currentUserIndex, currentStoryIndex]);

    const handleNext = useCallback(() => {
        if (currentStoryIndex < userStories.stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentUserIndex < feed.length - 1) {
            setCurrentUserIndex(prev => prev + 1);
        } else {
            onClose();
        }
    }, [currentStoryIndex, userStories, currentUserIndex, feed]);

    const handlePrev = useCallback(() => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            // Go to last story of previous user
            // This logic is a bit complex because we need to know the length of prev user stories immediately
            // For simplicity, we just go to the first story of prev user or handle it in effect
        }
    }, [currentStoryIndex, currentUserIndex]);

    const toggleLike = async () => {
        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
        await actions.stories.toggleLike({ storyId: story.id });
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta historia?")) return;
        setIsPaused(true);
        try {
            const { error } = await actions.stories.delete({ storyId: story.id });
            if (error) throw new Error(error.message);

            toast.success("Historia eliminada");

            // If it was the only story, close viewer
            if (userStories.stories.length === 1) {
                onClose();
            } else {
                // Move to next or prev
                if (currentStoryIndex < userStories.stories.length - 1) {
                    // Has next story
                    // We need to refresh the feed in parent, but for now let's just close to be safe or try to navigate
                    // Ideally we should update the local state 'feed' but it's passed as prop.
                    // Simplest is to close and let parent refresh.
                    onClose();
                } else {
                    onClose();
                }
            }
        } catch (e) {
            toast.error("Error al eliminar");
            setIsPaused(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2"
            >
                <LucideX size={32} />
            </button>

            {/* Main Container */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-[#1a1a1a] flex flex-col"
            >

                {/* Progress Bars */}
                <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
                    {userStories.stories.map((s: any, idx: number) => (
                        <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{
                                    width: idx < currentStoryIndex ? '100%' :
                                        idx === currentStoryIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-6 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center gap-3">
                        <img
                            src={userStories.user.avatar || `https://ui-avatars.com/api/?name=${userStories.user.displayName}`}
                            className="w-10 h-10 rounded-full border border-white/20"
                        />
                        <div>
                            <p className="text-white font-semibold text-sm">{userStories.user.displayName}</p>
                            <p className="text-white/60 text-xs">
                                {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Media Content */}
                <div
                    className="flex-1 relative bg-black flex items-center justify-center"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                >
                    {story.mediaType === 'image' ? (
                        <img
                            src={story.mediaUrl}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={story.mediaUrl}
                            className="w-full h-full object-contain"
                            autoPlay
                            playsInline
                            onEnded={handleNext}
                        />
                    )}

                    {/* Navigation Zones */}
                    <div className="absolute inset-0 flex">
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                        <div className="w-1/3 h-full" /> {/* Center for pause */}
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                    </div>
                </div>

                {/* Footer / Interactions */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                        {/* Reply Input (Placeholder) */}
                        {!isOwner && (
                            <input
                                type="text"
                                placeholder="Enviar mensaje..."
                                className="bg-transparent border border-white/30 rounded-full px-4 py-2 text-white text-sm w-full mr-4 focus:outline-none focus:border-white/60 placeholder:text-white/50"
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                            />
                        )}

                        <div className="flex items-center gap-4 ml-auto">
                            {isOwner && (
                                <>
                                    <div className="flex items-center gap-1 text-white/80 mr-2" title={`${story.views.length} vistas`}>
                                        <LucideEye size={20} />
                                        <span className="text-sm font-bold">{story.views.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-white/80 mr-2" title={`${likesCount} me gusta`}>
                                        <LucideHeart size={20} />
                                        <span className="text-sm font-bold">{likesCount}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                        className="p-2 rounded-full text-white/80 hover:text-red-500 hover:bg-white/10 transition-colors"
                                        title="Eliminar historia"
                                    >
                                        <LucideTrash2 size={24} />
                                    </button>
                                </>
                            )}

                            {!isOwner && (
                                <div className="flex items-center gap-2">
                                    {likesCount > 0 && (
                                        <span className="text-white text-sm font-medium">{likesCount}</span>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                                        className={`p-2 rounded-full transition-transform active:scale-90 ${liked ? 'text-red-500' : 'text-white'}`}
                                    >
                                        <LucideHeart size={28} fill={liked ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Desktop Navigation Arrows */}
            <button
                onClick={handlePrev}
                className="hidden md:block absolute left-4 text-white/50 hover:text-white transition-colors"
                disabled={currentUserIndex === 0 && currentStoryIndex === 0}
            >
                <LucideChevronLeft size={48} />
            </button>
            <button
                onClick={handleNext}
                className="hidden md:block absolute right-4 text-white/50 hover:text-white transition-colors"
            >
                <LucideChevronRight size={48} />
            </button>
        </motion.div>
    );
}
