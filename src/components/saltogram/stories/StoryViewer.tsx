import { useState, useEffect, useRef, useCallback, useMemo } from "preact/hooks";
import { actions } from "astro:actions";
import {
    LucideX, LucideHeart, LucideChevronLeft, LucideChevronRight,
    LucideEye, LucideTrash2, LucideSend, LucideStar, LucideLoader2,
    LucideChevronUp, LucideExternalLink
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface StoryViewerProps {
    feed: any[];
    initialUserIndex: number;
    onClose: () => void;
    currentUser?: Session["user"];
    initialStoryId?: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VisibilityBadge({ visibility }: { visibility: string }) {
    if (visibility === "vip") return (
        <div class="bg-green-500/15 border border-green-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <LucideStar size={10} class="text-green-400 fill-green-400" />
            <span class="text-green-400 text-[10px] font-bold uppercase tracking-wider">Mejores amigos</span>
        </div>
    );
    if (visibility === "friends") return (
        <div class="bg-blue-500/15 border border-blue-500/40 px-2 py-0.5 rounded-full">
            <span class="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Solo amigos</span>
        </div>
    );
    return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function refreshMusicUrl(music: any): Promise<string> {
    if (!music?.id) return music?.preview ?? "";
    try {
        const res = await fetch(`/api/deezer/track?id=${music.id}`);
        const data = await res.json();
        return data.preview || music.preview;
    } catch {
        return music.preview ?? "";
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StoryViewer({
    feed, initialUserIndex, onClose, currentUser, initialStoryId
}: StoryViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(() => {
        const stories = feed[initialUserIndex].stories;
        if (initialStoryId) {
            const idx = stories.findIndex((s: any) => s.id === initialStoryId);
            if (idx !== -1) return idx;
        }
        const unseen = stories.findIndex((s: any) => !s.isSeen);
        return unseen !== -1 ? unseen : 0;
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
    const [audioUrl, setAudioUrl] = useState<string | undefined>();

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const timerRef = useRef<number | null>(null);
    const progressRef = useRef(0);       // shadow ref — avoids stale closure in timer
    const isFirstRender = useRef(true);

    const userStories = feed[currentUserIndex];
    const story = userStories.stories[currentStoryIndex];
    const isOwner = currentUser?.id && Number(currentUser.id) === story.userId;
    const music = story.metadata?.music;

    const isMentioned = useMemo(() => story.metadata?.texts?.some((t: any) => {
        if (t.mentionUserId && String(t.mentionUserId) === String(currentUser?.id)) return true;
        return t.mentions?.some((m: any) => String(m.userId) === String(currentUser?.id)) ?? false;
    }), [story, currentUser?.id]);

    const viewersList = useMemo(() => {
        if (!isOwner) return [];
        return (story.views ?? [])
            .map((view: any) => ({
                ...view,
                hasLiked: story.likes?.some((l: any) => l.userId === view.userId) ?? false,
            }))
            .sort((a: any, b: any) => {
                if (a.hasLiked !== b.hasLiked) return a.hasLiked ? -1 : 1;
                return new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime();
            });
    }, [story, isOwner]);

    // ── Navigation ──────────────────────────────────────────────────────────────

    const handleNext = useCallback(() => {
        if (currentStoryIndex < userStories.stories.length - 1) {
            setCurrentStoryIndex(i => i + 1);
        } else if (currentUserIndex < feed.length - 1) {
            setCurrentUserIndex(i => i + 1);
        } else {
            onClose();
        }
    }, [currentStoryIndex, userStories.stories.length, currentUserIndex, feed.length, onClose]);

    const handlePrev = useCallback(() => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(i => i - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(i => i - 1);
        }
    }, [currentStoryIndex, currentUserIndex]);

    // ── Effects ─────────────────────────────────────────────────────────────────

    // Reset on user change
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const unseen = feed[currentUserIndex].stories.findIndex((s: any) => !s.isSeen);
        setCurrentStoryIndex(unseen !== -1 ? unseen : 0);
        setProgress(0);
        setIsBuffering(true);
        setShowViewers(false);
    }, [currentUserIndex]);

    // Reset on story change
    useEffect(() => {
        progressRef.current = 0;
        setProgress(0);
        setLiked(story.isLiked);
        setLikesCount(story.likesCount);
        setShowViewers(false);
        setShowMusicPopup(false);
        setIsBuffering(story.mediaType !== "image" || !imgRef.current?.complete);
        if (!story.isSeen && !isOwner) actions.stories.view({ storyId: story.id });
    }, [story]);

    // Music URL refresh
    useEffect(() => {
        if (!music) { setAudioUrl(undefined); return; }
        let active = true;
        setIsAudioFetching(true);
        setAudioUrl(undefined);
        refreshMusicUrl(music).then(url => {
            if (active) { setAudioUrl(url); setIsAudioFetching(false); }
        });
        return () => { active = false; };
    }, [music]);

    // Music + video pause/play — single unified effect
    useEffect(() => {
        const audio = audioRef.current;
        const video = videoRef.current;
        if (story.mediaType === "video" && video) {
            isPaused ? video.pause() : video.play().catch(() => { });
        }
        if (music && audio) {
            audio.volume = 0.5;
            isPaused ? audio.pause() : audio.play().catch(() => { });
        }
    }, [isPaused, story.mediaType, music]);

    // Progress timer — uses ref shadow to avoid stale closure recreation
    useEffect(() => {
        if (isPaused || isBuffering || isAudioFetching || showViewers) return;
        const duration = story.duration * 1000;
        const step = (50 / duration) * 100;

        timerRef.current = window.setInterval(() => {
            progressRef.current += step;
            if (progressRef.current >= 100) {
                progressRef.current = 0;
                handleNext();
            }
            setProgress(progressRef.current);
        }, 50);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [story, isPaused, isBuffering, isAudioFetching, showViewers, handleNext]);

    // ── Actions ──────────────────────────────────────────────────────────────────

    const toggleLike = async () => {
        setLiked(v => !v);
        setLikesCount(n => liked ? n - 1 : n + 1);
        await actions.stories.toggleLike({ storyId: story.id });
    };

    const handleReaction = async (emoji: string) => {
        try {
            const { error } = await actions.messages.send({ receiverId: story.userId, reaction: emoji, storyId: story.id });
            if (error) throw new Error(error.message);
            toast.success(`Reacción enviada: ${emoji}`);
            setIsPaused(false);
        } catch { toast.error("Error al enviar reacción"); }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        try {
            const { error } = await actions.messages.send({ receiverId: story.userId, content: replyText, storyId: story.id });
            if (error) throw new Error(error.message);
            toast.success("Mensaje enviado");
            setReplyText("");
            setIsPaused(false);
        } catch { toast.error("Error al enviar mensaje"); }
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta historia?")) return;
        setIsPaused(true);
        try {
            const { error } = await actions.stories.delete({ storyId: story.id });
            if (error) throw new Error(error.message);
            toast.success("Historia eliminada");
            onClose();
        } catch { toast.error("Error al eliminar"); setIsPaused(false); }
    };

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        >
            {/* Close */}
            <button
                onClick={onClose}
                class="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
               flex items-center justify-center text-white transition-colors"
            >
                <LucideX size={20} />
            </button>

            {/* Story card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 100) onClose();
                    else if (info.offset.y < -50 && isOwner) setShowViewers(true);
                }}
                class="relative w-full max-w-md h-full md:h-[90vh] md:rounded-[28px] overflow-hidden
               bg-[#111] flex flex-col shadow-2xl"
            >
                {/* Progress bars */}
                <div class="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 pt-3">
                    {userStories.stories.map((s: any, idx: number) => (
                        <div key={s.id} class="h-[3px] flex-1 bg-white/25 rounded-full overflow-hidden">
                            <div
                                class="h-full bg-white rounded-full"
                                style={{
                                    width: idx < currentStoryIndex ? "100%"
                                        : idx === currentStoryIndex ? `${progress}%` : "0%",
                                    transition: idx === currentStoryIndex ? "width 50ms linear" : "none",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div class="absolute top-0 left-0 right-0 z-40 px-4 pt-8 pb-10
                    bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <img
                            src={userStories.user.avatar || `https://ui-avatars.com/api/?name=${userStories.user.displayName}`}
                            class="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
                        />
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-white font-semibold text-sm leading-tight">{userStories.user.displayName}</p>
                                <VisibilityBadge visibility={story.visibility} />
                            </div>
                            <p class="text-white/55 text-xs mt-0.5">
                                {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                    </div>

                    {(isBuffering || isAudioFetching) && (
                        <div class="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <LucideLoader2 class="w-3.5 h-3.5 text-white animate-spin" />
                            <span class="text-white/80 text-xs">Cargando...</span>
                        </div>
                    )}
                </div>

                {/* Media */}
                <div
                    class="flex-1 relative bg-black flex items-center justify-center select-none"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    onContextMenu={e => e.preventDefault()}
                >
                    {story.mediaType === "image" ? (
                        <img
                            ref={imgRef} key={story.id} src={story.mediaUrl}
                            class="w-full h-full object-contain"
                            onLoad={() => setIsBuffering(false)}
                        />
                    ) : (
                        <video
                            ref={videoRef} key={story.id} src={story.mediaUrl}
                            class="w-full h-full object-contain"
                            autoPlay playsInline muted={!!music}
                            onEnded={handleNext}
                            onWaiting={() => setIsBuffering(true)}
                            onCanPlay={() => setIsBuffering(false)}
                        />
                    )}

                    {music && audioUrl && (
                        <audio
                            ref={audioRef} src={audioUrl} autoPlay
                            onLoadedMetadata={e => {
                                if (music?.config?.startTime) e.currentTarget.currentTime = music.config.startTime;
                            }}
                            onTimeUpdate={e => {
                                const { currentTime } = e.currentTarget;
                                const end = (music.config?.startTime ?? 0) + (music.config?.duration ?? 15);
                                if (currentTime >= end) e.currentTarget.pause();
                            }}
                        />
                    )}

                    {/* Music sticker */}
                    {music && (
                        <div
                            class="absolute bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2.5
                     flex items-center gap-3 z-40 max-w-[78%] cursor-pointer
                     border border-white/10 active:scale-95 transition-transform"
                            style={{
                                left: music.config ? `${music.config.x}%` : "50%",
                                top: music.config ? `${music.config.y}%` : "50%",
                                transform: `translate(-50%,-50%) scale(${music.config?.scale ?? 1}) rotate(${music.config?.rotation ?? 0}deg)`,
                            }}
                            onClick={e => { e.stopPropagation(); setShowMusicPopup(v => !v); }}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                        >
                            <img src={music.album.cover_medium} class="w-10 h-10 rounded-xl pointer-events-none shadow-md" />
                            <div class="flex-1 min-w-0 pointer-events-none">
                                <p class="text-white font-semibold text-xs truncate">{music.title}</p>
                                <p class="text-white/55 text-[11px] truncate">{music.artist.name}</p>
                            </div>
                            {/* Animated bars */}
                            <div class="flex gap-0.5 items-end h-3.5 pointer-events-none">
                                {[0, 1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        class="w-[3px] bg-pink-400 rounded-full"
                                        style={{
                                            height: isPaused ? "30%" : `${40 + i * 20}%`,
                                            animation: isPaused ? "none" : `musicBar 0.5s ease-in-out ${i * 0.12}s infinite alternate`,
                                        }}
                                    />
                                ))}
                            </div>

                            {showMusicPopup && (
                                <div class="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                            bg-[#1e1e1e] border border-white/10 text-white text-xs font-semibold
                            py-2 px-4 rounded-xl shadow-2xl flex items-center gap-2 z-50">
                                    <a
                                        href={music.link || `https://www.deezer.com/search/${encodeURIComponent(`${music.title} ${music.artist.name}`)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        class="flex items-center gap-2 hover:text-blue-400 transition-colors"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        Ver en Deezer <LucideExternalLink size={13} />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text overlays */}
                    {story.metadata?.texts?.map((text: any) => {
                        const hasMention = text.mentionUserId || text.mentions?.length > 0;
                        const href = text.mentionUserId
                            ? `/saltogram/u/${text.mentionUsername}`
                            : text.mentions?.[0] ? `/saltogram/u/${text.mentions[0].username}` : null;
                        return (
                            <div
                                key={text.id}
                                class={`absolute ${text.font} ${hasMention ? "cursor-pointer active:scale-95 transition-transform" : "pointer-events-none"}`}
                                style={{
                                    left: `${text.x}%`, top: `${text.y}%`,
                                    transform: `translate(-50%,-50%) scale(${text.scale}) rotate(${text.rotation}deg)`,
                                    color: text.color, backgroundColor: text.backgroundColor,
                                    padding: "0.4rem 0.6rem", borderRadius: "0.5rem", zIndex: 30,
                                }}
                                onClick={e => { if (href) { e.stopPropagation(); window.location.href = href; } }}
                            >
                                <span class="whitespace-pre-wrap text-2xl font-bold drop-shadow-lg">{text.content}</span>
                            </div>
                        );
                    })}

                    {/* Nav zones */}
                    <div class="absolute inset-0 flex pointer-events-none">
                        <div class="w-1/3 h-full pointer-events-auto" onClick={e => { e.stopPropagation(); handlePrev(); }} />
                        <div class="w-1/3 h-full" />
                        <div class="w-1/3 h-full pointer-events-auto" onClick={e => { e.stopPropagation(); handleNext(); }} />
                    </div>
                </div>

                {/* Footer */}
                <div class="absolute bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-16
                    bg-gradient-to-t from-black/80 via-black/40 to-transparent">

                    {/* Repost button for mentioned users */}
                    {isMentioned && (
                        <div class="flex justify-center mb-4">
                            <button
                                onClick={e => { e.stopPropagation(); toast.info("Función de repostear próximamente"); }}
                                class="bg-white hover:bg-white/90 active:scale-95 text-black px-6 py-2.5 rounded-full
                       font-semibold text-sm flex items-center gap-2 transition-all shadow-lg"
                            >
                                <LucideSend size={15} class="rotate-45" />
                                Añadir a tu historia
                            </button>
                        </div>
                    )}

                    {/* Swipe up hint */}
                    {isOwner && !showViewers && (
                        <motion.div
                            class="flex flex-col items-center text-white/40 mb-3 pointer-events-none"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        >
                            <LucideChevronUp size={18} />
                            <span class="text-[10px] uppercase tracking-widest font-medium">Ver vistas</span>
                        </motion.div>
                    )}

                    {/* Reactions tray */}
                    <AnimatePresence>
                        {showReactions && !isOwner && (
                            <motion.div
                                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 16, scale: 0.92 }}
                                class="flex justify-center gap-3 mb-4"
                            >
                                {["😂", "😮", "😍", "😢", "🔥", "👏"].map((emoji, i) => (
                                    <button
                                        key={emoji}
                                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleReaction(emoji); }}
                                        class="text-3xl hover:scale-125 active:scale-110 transition-transform drop-shadow-lg"
                                        style={{ transitionDelay: `${i * 40}ms` }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls row */}
                    <div class="flex items-center gap-3">
                        {isOwner ? (
                            <>
                                <button
                                    onClick={e => { e.stopPropagation(); setShowViewers(true); }}
                                    class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                                >
                                    <LucideEye size={19} />
                                    <span class="text-sm font-semibold">{story.views.length}</span>
                                </button>
                                <div class="flex items-center gap-1.5 text-white/70">
                                    <LucideHeart size={19} />
                                    <span class="text-sm font-semibold">{likesCount}</span>
                                </div>
                                <div class="flex-1" />
                                <button
                                    onClick={e => { e.stopPropagation(); handleDelete(); }}
                                    class="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400
                         flex items-center justify-center text-white/70 transition-colors"
                                >
                                    <LucideTrash2 size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div class="flex-1 relative">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onInput={e => setReplyText(e.currentTarget.value)}
                                        placeholder={`Responder a ${userStories.user.displayName}...`}
                                        class="w-full bg-white/10 border border-white/20 rounded-full py-2.5 px-4
                           text-white placeholder-white/50 focus:outline-none focus:border-white/50
                           text-sm transition-colors"
                                        onFocus={() => { setIsPaused(true); setShowReactions(true); }}
                                        onBlur={() => { setIsPaused(false); setShowReactions(false); }}
                                        onKeyDown={e => e.key === "Enter" && handleSendReply()}
                                    />
                                </div>
                                {replyText ? (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleSendReply(); }}
                                        class="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center
                           justify-center text-white transition-colors active:scale-95"
                                    >
                                        <LucideSend size={16} class="rotate-45" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleLike(); }}
                                        class={`w-10 h-10 rounded-full flex items-center justify-center
                            transition-all active:scale-90
                            ${liked ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/80 hover:text-white"}`}
                                    >
                                        <LucideHeart size={20} fill={liked ? "currentColor" : "none"} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Desktop arrows */}
            <button
                onClick={handlePrev}
                disabled={currentUserIndex === 0 && currentStoryIndex === 0}
                class="hidden md:flex absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20
               items-center justify-center text-white/70 hover:text-white transition-all
               disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <LucideChevronLeft size={24} />
            </button>
            <button
                onClick={handleNext}
                class="hidden md:flex absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20
               items-center justify-center text-white/70 hover:text-white transition-all"
            >
                <LucideChevronRight size={24} />
            </button>

            {/* Viewers bottom sheet */}
            <AnimatePresence>
                {showViewers && isOwner && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowViewers(false)}
                            class="fixed inset-0 bg-black/60 z-60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 26, stiffness: 320 }}
                            drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
                            onDragEnd={(_, info) => { if (info.offset.y > 100) setShowViewers(false); }}
                            class="fixed bottom-0 left-0 right-0 z-70 bg-[#1e1e1e] rounded-t-[28px]
                     border-t border-white/8 max-h-[70vh] flex flex-col shadow-2xl
                     md:max-w-md md:mx-auto"
                        >
                            {/* Handle */}
                            <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

                            {/* Sheet header */}
                            <div class="px-5 py-3 border-b border-white/8 flex items-center justify-between">
                                <div class="flex items-center gap-2 text-white">
                                    <LucideEye size={18} />
                                    <span class="font-semibold text-base">Vistas</span>
                                    <span class="text-white/40 text-sm font-normal">({viewersList.length})</span>
                                </div>
                                <button
                                    onClick={() => setShowViewers(false)}
                                    class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center
                         justify-center text-white/60 hover:text-white transition-colors"
                                >
                                    <LucideX size={16} />
                                </button>
                            </div>

                            {/* Viewer list */}
                            <div class="flex-1 overflow-y-auto p-3">
                                {viewersList.length > 0 ? viewersList.map((viewer: any) => (
                                    <div
                                        key={viewer.userId}
                                        class="flex items-center justify-between px-3 py-2.5 rounded-2xl
                           hover:bg-white/5 transition-colors"
                                    >
                                        <div class="flex items-center gap-3">
                                            <img
                                                src={viewer.user?.avatar || `https://ui-avatars.com/api/?name=${viewer.user?.displayName ?? "U"}`}
                                                class="w-10 h-10 rounded-full border border-white/10 object-cover"
                                            />
                                            <div>
                                                <p class="text-white font-medium text-sm leading-tight">{viewer.user?.displayName}</p>
                                                <p class="text-white/40 text-xs">@{viewer.user?.username}</p>
                                            </div>
                                        </div>
                                        {viewer.hasLiked && (
                                            <div class="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                                                <LucideHeart size={15} class="text-red-400 fill-red-400" />
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div class="flex flex-col items-center justify-center py-16 text-white/25 gap-3">
                                        <LucideEye size={40} />
                                        <p class="text-sm">Aún no hay vistas</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style>{`
        @keyframes musicBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
        </motion.div >
    );
}