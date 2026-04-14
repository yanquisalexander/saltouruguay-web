import { useEffect, useRef, useState, useCallback } from "preact/compat";
import { motion, AnimatePresence } from "motion/react";
import { navigate } from "astro:transitions/client";
import { LucideArrowRight, LucideExternalLink, LucideSparkles, LucideChevronLeft, LucideChevronRight, LucidePlay } from "lucide-preact";

// --- PARTICLE INTERFACE ---
interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
    life: number;
    maxLife: number;
    color: string;
}

const NEWS = [
    {
        title: "#SaltoAwards 2025",
        description: `
        Se realizaron las votaciones para elegir a los mejores miembros de la comunidad del año.
    `,
        tags: ["Awards"],
        background: { img: "/images/ads/awards.webp" },
        navImage: "/images/ads/awards.webp",
        ctaLink: { text: "¡Revive la gala!", url: "/awards", newTab: false }
    },
    {
        title: "Nueva Web Oficial",
        description: `
        ¡SaltoUruguayServer tiene una nueva web! 🎉
        Entérate de todas las novedades, eventos y torneos en un solo lugar.
    `,
        tags: ["Web"],
        background: { img: "/og.webp" },
        navImage: "/og.webp",
        ctaLink: { text: "Descubre más", url: "/", newTab: false }
    },
].map((news, index) => ({
    ...news,
    description: news.description.trim(),
    id: index,
}));

// --- VARIANTS ---
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 1.2,
        zIndex: 10
    }),
    center: {
        zIndex: 10,
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.8 },
            scale: { duration: 1.2, ease: "easeOut" }
        }
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 }
        }
    })
};

const contentContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3
        }
    }
};

const contentItemVariants = {
    hidden: { y: 60, opacity: 0, filter: "blur(10px)" },
    visible: {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1] // Cinematic easing
        }
    }
};

const progressBarVariants = {
    hidden: { width: "0%" },
    visible: (duration: number) => ({
        width: "100%",
        transition: { duration: duration / 1000, ease: "linear" }
    })
};

// --- PARTICLE SYSTEM COMPONENT ---
const ParticleSystem = ({ isActive }: { isActive: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    const createParticle = useCallback((): Particle => {
        const colors = [
            "rgba(145, 70, 255, ", // Purple
            "rgba(168, 85, 247, ", // Light purple
            "rgba(192, 132, 252, ", // Soft purple
            "rgba(255, 255, 255, ", // White
        ];

        return {
            id: Math.random(),
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: Math.random() * -0.5 - 0.2,
            opacity: Math.random() * 0.5 + 0.2,
            life: 0,
            maxLife: Math.random() * 200 + 100,
            color: colors[Math.floor(Math.random() * colors.length)]
        };
    }, []);

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const updateCanvasSize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        };

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        // Initialize particles
        particlesRef.current = Array.from({ length: 50 }, () => createParticle());

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        canvas.addEventListener("mousemove", handleMouseMove);

        const animate = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter(particle => {
                particle.life++;

                // Update position
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                // Mouse interaction (repel)
                const dx = particle.x * canvas.width / 100 - mouseRef.current.x;
                const dy = particle.y * canvas.height / 100 - mouseRef.current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    particle.x += (dx / distance) * force * 2;
                    particle.y += (dy / distance) * force * 2;
                }

                // Calculate opacity based on life
                const lifeRatio = particle.life / particle.maxLife;
                const currentOpacity = lifeRatio < 0.1
                    ? particle.opacity * (lifeRatio / 0.1)
                    : lifeRatio > 0.9
                        ? particle.opacity * ((1 - lifeRatio) / 0.1)
                        : particle.opacity;

                // Draw particle
                const gradient = ctx.createRadialGradient(
                    particle.x * canvas.width / 100,
                    particle.y * canvas.height / 100,
                    0,
                    particle.x * canvas.width / 100,
                    particle.y * canvas.height / 100,
                    particle.size * 2
                );
                gradient.addColorStop(0, particle.color + currentOpacity + ")");
                gradient.addColorStop(1, particle.color + "0)");

                ctx.beginPath();
                ctx.arc(
                    particle.x * canvas.width / 100,
                    particle.y * canvas.height / 100,
                    particle.size,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = gradient;
                ctx.fill();

                // Remove dead particles
                return particle.life < particle.maxLife;
            });

            // Create new particles
            if (particlesRef.current.length < 50 && Math.random() < 0.1) {
                particlesRef.current.push(createParticle());
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            canvas.removeEventListener("mousemove", handleMouseMove);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isActive, createParticle]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-5 w-full h-full pointer-events-none"
            style={{ mixBlendMode: "screen" }}
        />
    );
};

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [direction, setDirection] = useState<number>(0);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
    const autoPlayTimerRef = useRef<number | null>(null);
    const scrollContainerRef = useRef<HTMLOListElement | null>(null);

    // --- SCROLL SEGURO ---
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const thumb = container.children[selectedIndex] as HTMLElement;

            if (thumb) {
                const scrollLeft = thumb.offsetLeft - (container.offsetWidth / 2) + (thumb.offsetWidth / 2);
                container.scrollTo({
                    left: scrollLeft,
                    behavior: "smooth"
                });
            }
        }
    }, [selectedIndex]);

    // --- AUTO-PLAY ---
    useEffect(() => {
        if (isAutoPlaying && !isPaused && newsItems.length > 1) {
            autoPlayTimerRef.current = window.setTimeout(() => {
                setDirection(1);
                setSelectedIndex((prev) => (prev + 1) % newsItems.length);
            }, duration);
        }

        return () => {
            if (autoPlayTimerRef.current) {
                clearTimeout(autoPlayTimerRef.current);
            }
        };
    }, [selectedIndex, isAutoPlaying, isPaused, duration, newsItems.length]);

    const handleNextSlide = () => {
        setDirection(1);
        setSelectedIndex((prev) => (prev + 1) % newsItems.length);
    };

    const handlePrevSlide = () => {
        setDirection(-1);
        setSelectedIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length);
    };

    const handleIndexChange = (newIndex: number) => {
        setDirection(newIndex > selectedIndex ? 1 : -1);
        setSelectedIndex(newIndex);
    };

    const handleNavigation = (event: MouseEvent, ctaLink: typeof NEWS[0]["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            navigate(ctaLink.url);
        }
    };

    return (
        <section
            id="featured-news"
            className="w-full relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* --- HERO CONTAINER --- */}
            <div className="relative w-full max-w-7xl mx-auto">

                {/* --- PARTICLE CANVAS (Background) --- */}
                <div className="absolute -top-20 -left-20 -right-20 -bottom-20 z-0 pointer-events-none">
                    <ParticleSystem isActive={true} />
                </div>

                {/* --- MAIN HERO SLIDER --- */}
                <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-[0_0_80px_rgba(145,70,255,0.15)] group z-10">

                    {/* SLIDES */}
                    <div className="absolute inset-0 w-full h-full">
                        <AnimatePresence mode="wait" custom={direction} initial={false}>
                            <motion.div
                                key={selectedIndex}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="absolute inset-0 w-full h-full"
                            >
                                {/* Background Image with Cinematic Zoom */}
                                <div className="absolute inset-0 z-0 overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0 w-full h-full"
                                        initial={{ scale: 1.2 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 8, ease: "easeOut" }}
                                    >
                                        <img
                                            className="w-full h-full object-cover"
                                            src={newsItems[selectedIndex].background.img}
                                            alt={newsItems[selectedIndex].title}
                                            loading={selectedIndex === 0 ? "eager" : "lazy"}
                                            decoding="async"
                                        />
                                    </motion.div>

                                    {/* Multi-layer Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-95" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-purple-900/20" />

                                    {/* Ambient Glow */}
                                    <motion.div
                                        className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]"
                                        animate={{
                                            opacity: [0.3, 0.5, 0.3],
                                            scale: [1, 1.1, 1]
                                        }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </div>

                                {/* CONTENT OVERLAY */}
                                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-16">
                                    <motion.div
                                        variants={contentContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="max-w-3xl"
                                    >
                                        {/* Tags */}
                                        <motion.div variants={contentItemVariants} className="flex flex-wrap gap-2 mb-6">
                                            {newsItems[selectedIndex].tags.map((tag) => (
                                                <motion.span
                                                    key={tag}
                                                    className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md flex items-center gap-2 shadow-[0_0_20px_rgba(145,70,255,0.3)]"
                                                    whileHover={{ scale: 1.05, backgroundColor: "rgba(145,70,255,0.3)" }}
                                                >
                                                    <LucideSparkles size={12} className="text-purple-400" />
                                                    {tag}
                                                </motion.span>
                                            ))}
                                        </motion.div>

                                        {/* Title */}
                                        <motion.h2
                                            variants={contentItemVariants}
                                            className="text-5xl sm:text-6xl lg:text-7xl font-anton text-white uppercase leading-[0.9] mb-6 drop-shadow-2xl text-balance"
                                        >
                                            {newsItems[selectedIndex].title}
                                        </motion.h2>

                                        {/* Description */}
                                        <motion.p
                                            variants={contentItemVariants}
                                            className="text-white/85 font-rubik text-base sm:text-lg lg:text-xl mb-8 max-w-2xl leading-relaxed text-pretty drop-shadow-lg"
                                        >
                                            {newsItems[selectedIndex].description}
                                        </motion.p>

                                        {/* CTA Button */}
                                        <motion.div variants={contentItemVariants}>
                                            <a
                                                {...(newsItems[selectedIndex].ctaLink.newTab && { target: "_blank", rel: "noopener noreferrer" })}
                                                href={newsItems[selectedIndex].ctaLink.url}
                                                onClick={(event) => handleNavigation(event as unknown as MouseEvent, newsItems[selectedIndex].ctaLink)}
                                                className="group/btn inline-flex items-center gap-4 px-10 py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 border border-purple-400/50 rounded-2xl font-teko text-2xl font-bold uppercase tracking-wide transition-all duration-300 shadow-[0_10px40px_rgba(145,70,255,0.4)] hover:shadow-[0_15px60px_rgba(145,70,255,0.6)] hover:scale-105 hover:-translate-y-1"
                                            >
                                                <LucidePlay size={20} className="fill-white/20" />
                                                <span>{newsItems[selectedIndex].ctaLink.text}</span>
                                                {newsItems[selectedIndex].ctaLink.newTab ?
                                                    <LucideExternalLink size={20} className="ml-2 opacity-80" /> :
                                                    <LucideArrowRight size={20} className="ml-2 transition-transform group-hover/btn:translate-x-2" />
                                                }
                                            </a>
                                        </motion.div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* --- NAVIGATION ARROWS --- */}
                    {newsItems.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevSlide}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-purple-600/60 hover:border-purple-400/50 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                aria-label="Noticia anterior"
                            >
                                <LucideChevronLeft size={24} />
                            </button>
                            <button
                                onClick={handleNextSlide}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-purple-600/60 hover:border-purple-400/50 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                aria-label="Siguiente noticia"
                            >
                                <LucideChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* --- AUTO-PLAY INDICATOR --- */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                        <motion.div
                            className={`w-2 h-2 rounded-full ${isAutoPlaying && !isPaused ? 'bg-purple-400' : 'bg-white/40'}`}
                            animate={isAutoPlaying && !isPaused ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-white/60 text-xs font-rubik">
                            {isPaused ? 'PAUSADO' : 'AUTO'}
                        </span>
                    </div>

                    {/* --- PROGRESS BAR --- */}
                    {isAutoPlaying && newsItems.length > 1 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                            <motion.div
                                key={selectedIndex}
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                                variants={progressBarVariants}
                                initial="hidden"
                                animate="visible"
                                custom={duration}
                                onAnimationComplete={() => {
                                    if (!isPaused) handleNextSlide();
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* --- THUMBNAIL NAVIGATION --- */}
                {newsItems.length > 1 && (
                    <nav className="relative w-full mt-6">
                        <ol
                            ref={scrollContainerRef}
                            className="flex gap-4 overflow-x-auto py-3 px-2 scrollbar-hide snap-x snap-mandatory"
                        >
                            {newsItems.map((news, index) => {
                                const isActive = selectedIndex === index;
                                return (
                                    <li key={news.id} className="flex-shrink-0 snap-center">
                                        <button
                                            onClick={() => handleIndexChange(index)}
                                            aria-label={`Ver noticia: ${news.title}`}
                                            aria-current={isActive ? "true" : "false"}
                                            className={`
                                                relative group overflow-hidden rounded-2xl border transition-all duration-500 
                                                ${isActive
                                                    ? 'w-72 border-purple-400/60 shadow-[0_0_30px_rgba(145,70,255,0.3)]'
                                                    : 'w-64 border-white/5 hover:border-white/20 hover:w-72'
                                                }
                                            `}
                                        >
                                            {/* Thumbnail Image */}
                                            <div className="relative aspect-[16/9] overflow-hidden">
                                                <img
                                                    className={`w-full h-full object-cover transition-all duration-700 ${isActive ? 'scale-110' : 'scale-100 group-hover:scale-105'}`}
                                                    src={news.navImage || news.background.img}
                                                    alt={news.title}
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                                                {/* Active Indicator */}
                                                {isActive && (
                                                    <motion.div
                                                        className="absolute inset-0 border-2 border-purple-400/50 rounded-2xl"
                                                        layoutId="activeThumbnail"
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${isActive ? 'text-purple-400' : 'text-white/50'}`}>
                                                    {news.tags[0]}
                                                </span>
                                                <span className={`font-teko text-lg uppercase leading-tight truncate block ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                                    {news.title}
                                                </span>
                                            </div>

                                            {/* Hover Overlay */}
                                            {!isActive && (
                                                <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-all duration-300" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                )}
            </div>
        </section>
    );
};
