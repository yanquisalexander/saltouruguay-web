import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideX, LucideHeart, LucideChevronLeft, LucideChevronRight, LucideEye, LucideTrash2, LucideSend, LucideStar, LucideLoader2, LucideChevronUp, LucideExternalLink } from "lucide-preact";
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
    initialStoryId?: number;
}

export default function StoryViewer({ feed, initialUserIndex, onClose, currentUser, initialStoryId }: StoryViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);

    // Initialize with first unseen story or 0
    const [currentStoryIndex, setCurrentStoryIndex] = useState(() => {
        const stories = feed[initialUserIndex].stories;

        if (initialStoryId) {
            const index = stories.findIndex((s: any) => s.id === initialStoryId);
            if (index !== -1) return index;
        }

        const firstUnseenIndex = stories.findIndex((s: any) => !s.isSeen);
        return firstUnseenIndex !== -1 ? firstUnseenIndex : 0;
    });

    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isAudioFetching, setIsAudioFetching] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [replyText, setReplyText] = useState("");
    const [showReactions, setShowReactions] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const [showMusicPopup, setShowMusicPopup] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const progressInterval = useRef<number | null>(null);

    const userStories = feed[currentUserIndex];
    const story = userStories.stories[currentStoryIndex];
    const isOwner = currentUser?.id && Number(currentUser.id) === story.userId;
    const music = story.metadata?.music;
    const isMentioned = story.metadata?.texts?.some((t: any) => {
        if (t.mentionUserId && String(t.mentionUserId) === String(currentUser?.id)) return true;
        if (t.mentions && Array.isArray(t.mentions)) {
            return t.mentions.some((m: any) => String(m.userId) === String(currentUser?.id));
        }
        return false;
    });
    console.log("isMentioned:", isMentioned);
    console.log("currentUser:", currentUser);
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

    // Process viewers list (merge views and likes)
    const viewersList = isOwner ? (story.views || []).map((view: any) => {
        const hasLiked = story.likes?.some((like: any) => like.userId === view.userId);
        return { ...view, hasLiked };
    }).sort((a: any, b: any) => {
        // Sort by liked first, then by view date
        if (a.hasLiked && !b.hasLiked) return -1;
        if (!a.hasLiked && b.hasLiked) return 1;
        return new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime();
    }) : [];

    // Reset state when user changes
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const stories = feed[currentUserIndex].stories;
        const firstUnseenIndex = stories.findIndex((s: any) => !s.isSeen);
        setCurrentStoryIndex(firstUnseenIndex !== -1 ? firstUnseenIndex : 0);
        setProgress(0);
        setIsBuffering(true);
        setShowViewers(false);
    }, [currentUserIndex]);

    // Reset state when story changes
    useEffect(() => {
        setProgress(0);
        setLiked(story.isLiked);
        setLikesCount(story.likesCount);
        setShowViewers(false);
        setShowMusicPopup(false);

        // Smart buffering reset
        if (story.mediaType === 'image') {
            if (imgRef.current?.complete) {
                setIsBuffering(false);
            } else {
                setIsBuffering(true);
            }
        } else {
            setIsBuffering(true);
        }

        // Mark as viewed
        if (!story.isSeen && !isOwner) {
            actions.stories.view({ storyId: story.id });
        }
    }, [story]);

    // Refresh music URL
    useEffect(() => {
        let isMounted = true;

        if (music) {
            setIsAudioFetching(true);
            setAudioUrl(undefined); // Clear previous URL to prevent double load

            if (music.id) {
                fetch(`/api/deezer/track?id=${music.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (!isMounted) return;
                        if (data.preview) {
                            setAudioUrl(data.preview);
                        } else {
                            setAudioUrl(music.preview); // Fallback
                        }
                    })
                    .catch(err => {
                        if (!isMounted) return;
                        console.error("Error refreshing music URL:", err);
                        setAudioUrl(music.preview); // Fallback
                    })
                    .finally(() => {
                        if (isMounted) setIsAudioFetching(false);
                    });
            } else {
                setAudioUrl(music.preview);
                setIsAudioFetching(false);
            }
        } else {
            setAudioUrl(undefined);
            setIsAudioFetching(false);
        }

        return () => {
            isMounted = false;
        };
    }, [music]);

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

    // Control music playback
    useEffect(() => {
        if (music && audioRef.current) {
            audioRef.current.volume = 0.5; // Default volume
            if (isPaused) {
                audioRef.current.pause();
            } else {
                // If starting playback, ensure we start from the configured start time
                // But only if we are just starting (currentTime is 0 or close to it?)
                // Actually, we want to loop the fragment if needed?
                // For now, just play. The initial time is set in another effect.
                audioRef.current.play().catch(() => { });
            }
        }
    }, [isPaused, music, story]);

    // Timer Logic
    useEffect(() => {
        if (isPaused || isBuffering || isAudioFetching || showViewers) return;

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
    }, [story, isPaused, isBuffering, isAudioFetching, showViewers, currentUserIndex, currentStoryIndex]);

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

    const handleReaction = async (emoji: string) => {
        try {
            const { error } = await actions.messages.send({
                receiverId: story.userId,
                reaction: emoji,
                storyId: story.id
            });

            if (error) throw new Error(error.message);

            toast.success(`Reacción enviada: ${emoji}`);
            setIsPaused(false);
            // Optional: Close keyboard/input focus if needed
        } catch (e) {
            toast.error("Error al enviar reacción");
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;

        try {
            const { error } = await actions.messages.send({
                receiverId: story.userId,
                content: replyText,
                storyId: story.id
            });

            if (error) throw new Error(error.message);

            toast.success("Mensaje enviado");
            setReplyText("");
            setIsPaused(false);
        } catch (e) {
            toast.error("Error al enviar mensaje");
        }
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
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 100) {
                        onClose();
                    } else if (info.offset.y < -50 && isOwner) {
                        setShowViewers(true);
                    }
                }}
                className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-[#1a1a1a] flex flex-col"
            >

                {/* Progress Bars */}
                <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
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
                <div className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center gap-3 pt-2">
                        <img
                            src={userStories.user.avatar || `https://ui-avatars.com/api/?name=${userStories.user.displayName}`}
                            className="w-10 h-10 rounded-full border border-white/20"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-white font-semibold text-sm">{userStories.user.displayName}</p>
                                {story.visibility === 'vip' && (
                                    <div className="bg-green-500/20 border border-green-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <LucideStar size={10} className="text-green-400 fill-green-400" />
                                        <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Mejores Amigos</span>
                                    </div>
                                )}
                                {story.visibility === 'friends' && (
                                    <div className="bg-blue-500/20 border border-blue-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Solo Amigos</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-white/60 text-xs">
                                {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                    </div>

                    {/* Buffering Indicator (Top Right) */}
                    {(isBuffering || isAudioFetching) && (
                        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                            <LucideLoader2 className="w-4 h-4 text-white animate-spin" />
                            <span className="text-white/80 text-xs font-medium">Cargando...</span>
                        </div>
                    )}
                </div>

                {/* Media Content */}
                <div
                    className="flex-1 relative bg-black flex items-center justify-center"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {story.mediaType === 'image' ? (
                        <img
                            ref={imgRef}
                            key={story.id}
                            src={story.mediaUrl}
                            className="w-full h-full object-contain"
                            onLoad={() => setIsBuffering(false)}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            key={story.id}
                            src={story.mediaUrl}
                            className="w-full h-full object-contain"
                            autoPlay
                            playsInline
                            muted={!!music} // Mute video if music is present
                            onEnded={handleNext}
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => setIsBuffering(false)}
                            onCanPlay={() => setIsBuffering(false)}
                        />
                    )}

                    {/* Music Player */}
                    {music && audioUrl && (
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            autoPlay
                            onLoadedMetadata={(e) => {
                                if (music?.config?.startTime) {
                                    e.currentTarget.currentTime = music.config.startTime;
                                }
                            }}
                            onTimeUpdate={(e) => {
                                const audio = e.currentTarget;
                                const startTime = music.config?.startTime || 0;
                                const duration = music.config?.duration || 15;

                                // Stop if we exceed the duration (plus a small buffer)
                                // We don't loop here because the story should end
                                if (audio.currentTime >= startTime + duration) {
                                    audio.pause();
                                }
                            }}
                        />
                    )}

                    {/* Music Sticker */}
                    {music && (
                        <div
                            className="absolute bg-white/90 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 shadow-xl z-40 max-w-[80%] cursor-pointer transition-transform active:scale-95"
                            style={{
                                left: music.config ? `${music.config.x}%` : '50%',
                                top: music.config ? `${music.config.y}%` : '50%',
                                transform: `translate(-50%, -50%) scale(${music.config ? music.config.scale : 1}) rotate(${music.config?.rotation || 0}deg)`
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMusicPopup(!showMusicPopup);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >
                            <img src={music.album.cover_medium} className="w-12 h-12 rounded-md shadow-sm pointer-events-none" />
                            <div className="flex-1 min-w-0 pointer-events-none">
                                <p className="font-bold text-black text-sm truncate">{music.title}</p>
                                <p className="text-black/60 text-xs truncate">{music.artist.name}</p>
                            </div>
                            <div className="w-1 h-8 bg-black/10 rounded-full mx-1 pointer-events-none" />
                            <div className="flex gap-0.5 items-end h-4 pointer-events-none">
                                {[1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="w-1 bg-pink-500 rounded-full animate-music-bar"
                                        style={{
                                            height: isPaused ? '20%' : `${Math.random() * 100}%`,
                                            animation: isPaused ? 'none' : `music-bar 0.5s ease-in-out infinite alternate`,
                                            animationDelay: `${i * 0.1}s`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Popup */}
                            {showMusicPopup && (
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#242526] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 border border-white/10 z-50">
                                    <a
                                        href={music.link || `https://www.deezer.com/search/${encodeURIComponent(music.title + " " + music.artist.name)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span>Ver en Deezer</span>
                                        <LucideExternalLink size={14} />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}                    {/* Text Elements */}
                    {story.metadata?.texts?.map((text: any) => (
                        <div
                            key={text.id}
                            className={`absolute ${(text.mentionUserId || (text.mentions && text.mentions.length > 0)) ? 'pointer-events-auto cursor-pointer active:scale-95 transition-transform' : 'pointer-events-none'} ${text.font}`}
                            style={{
                                left: `${text.x}%`,
                                top: `${text.y}%`,
                                transform: `translate(-50%, -50%) scale(${text.scale}) rotate(${text.rotation}deg)`,
                                color: text.color,
                                backgroundColor: text.backgroundColor,
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                zIndex: 30
                            }}
                            onClick={(e) => {
                                if (text.mentionUserId) {
                                    e.stopPropagation();
                                    window.location.href = `/saltogram/u/${text.mentionUsername}`;
                                } else if (text.mentions && text.mentions.length > 0) {
                                    e.stopPropagation();
                                    window.location.href = `/saltogram/u/${text.mentions[0].username}`;
                                }
                            }}
                        >
                            <span className="whitespace-pre-wrap text-2xl font-bold drop-shadow-lg">
                                {text.content}
                            </span>
                        </div>
                    ))}

                    {/* Navigation Zones */}
                    <div className="absolute inset-0 flex">
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                        <div className="w-1/3 h-full" /> {/* Center for pause */}
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                    </div>
                </div>

                {/* Footer / Interactions */}
                <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    {/* Mentioned Repost Button */}
                    {isMentioned && (
                        <div className="flex justify-center mb-4 pointer-events-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info("Función de repostear próximamente");
                                }}
                                className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                            >
                                <LucideSend size={16} className="rotate-45" />
                                Añadir a tu historia
                            </button>
                        </div>
                    )}

                    {/* Swipe Up Indicator (Only for owner) */}
                    {isOwner && !showViewers && (
                        <motion.div
                            className="absolute -top-10 left-0 right-0 flex flex-col items-center justify-center text-white/50 pointer-events-none"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <LucideChevronUp size={20} />
                            <span className="text-[10px] font-medium uppercase tracking-wider">Desliza para ver vistas</span>
                        </motion.div>
                    )}

                    {/* Quick Reactions */}
                    <AnimatePresence>
                        {showReactions && !isOwner && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                className="absolute bottom-20 left-0 right-0 flex justify-center gap-4 pointer-events-auto"
                            >
                                {["😂", "😮", "😍", "😢", "🔥", "👏"].map((emoji, i) => (
                                    <button
                                        key={emoji}
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleReaction(emoji); }}
                                        className="text-4xl hover:scale-125 transition-transform drop-shadow-lg"
                                        style={{ transitionDelay: `${i * 50}ms` }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between gap-3">
                        {/* Reply Input */}
                        {!isOwner && (
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={replyText}
                                    onInput={(e) => setReplyText(e.currentTarget.value)}
                                    placeholder={`Responder a ${userStories.user.displayName}...`}
                                    className="w-full bg-transparent border border-white/30 rounded-full py-2.5 px-4 text-white placeholder-white/70 focus:outline-none focus:border-white/60 text-sm backdrop-blur-sm"
                                    onFocus={() => { setIsPaused(true); setShowReactions(true); }}
                                    onBlur={() => { setIsPaused(false); setShowReactions(false); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-4 ml-auto">
                            {isOwner ? (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
                                        className="flex items-center gap-1 text-white/80 mr-2 hover:text-white transition-colors"
                                        title={`${story.views.length} vistas`}
                                    >
                                        <LucideEye size={20} />
                                        <span className="text-sm font-bold">{story.views.length}</span>
                                    </button>
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
                            ) : (
                                <>
                                    {replyText ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                                            className="text-blue-500 font-semibold text-sm"
                                        >
                                            Enviar
                                        </button>
                                    ) : (
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
                                            <button className="text-white p-2">
                                                <LucideSend size={26} className="-rotate-45 mb-1" />
                                            </button>
                                        </div>
                                    )}
                                </>
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

            {/* Viewers Bottom Sheet */}
            <AnimatePresence>
                {showViewers && isOwner && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowViewers(false)}
                            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#242526] rounded-t-3xl border-t border-white/10 max-h-[70vh] flex flex-col shadow-2xl md:max-w-md md:mx-auto"
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) setShowViewers(false);
                            }}
                        >
                            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-2" />

                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    <LucideEye size={20} />
                                    Vistas ({viewersList.length})
                                </h3>
                                <button onClick={() => setShowViewers(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                                    <LucideX size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {viewersList.length > 0 ? (
                                    <div className="space-y-1">
                                        {viewersList.map((viewer: any) => (
                                            <div key={viewer.userId} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={viewer.user?.avatar || `https://ui-avatars.com/api/?name=${viewer.user?.displayName || 'User'}`}
                                                        className="w-10 h-10 rounded-full border border-white/10"
                                                    />
                                                    <div>
                                                        <p className="text-white font-medium text-sm">{viewer.user?.displayName}</p>
                                                        <p className="text-white/40 text-xs">@{viewer.user?.username}</p>
                                                    </div>
                                                </div>
                                                {viewer.hasLiked && (
                                                    <div className="bg-red-500/10 p-2 rounded-full">
                                                        <LucideHeart size={16} className="text-red-500 fill-red-500" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
                                        <LucideEye size={48} />
                                        <p>Aún no hay vistas</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
