import { useEffect, useRef, useState } from "preact/compat";
import { motion, AnimatePresence } from "motion/react";
import { navigate } from "astro:transitions/client";
import {
    LucideArrowRight,
    LucideArrowUpRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucidePause,
    LucidePlay,
    LucideSparkles,
} from "lucide-preact";

const NEWS = [
    {
        title: "#SaltoAwards 2025",
        description: `Se realizaron las votaciones para elegir a los mejores miembros de la comunidad del año.`,
        tags: ["Awards"],
        background: { img: "/images/ads/awards.webp" },
        navImage: "/images/ads/awards.webp",
        ctaLink: { text: "¡Revive la gala!", url: "/awards", newTab: false }
    },
    {
        title: "Nueva Web Oficial",
        description: `¡SaltoUruguayServer tiene una nueva web! 🎉 Entérate de todas las novedades, eventos y torneos en un solo lugar.`,
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

type NewsItem = (typeof NEWS)[number];

const pad = (n: number) => String(n).padStart(2, "0");

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<number | null>(null);

    const total = newsItems.length;
    const current: NewsItem = newsItems[selectedIndex] ?? newsItems[0];
    const single = total <= 1;

    // --- Autoplay (único mecanismo: timeout) ---
    useEffect(() => {
        if (single || isPaused) return;
        timerRef.current = window.setTimeout(() => {
            setDirection(1);
            setSelectedIndex((prev) => (prev + 1) % total);
        }, duration);
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [selectedIndex, isPaused, duration, total, single]);

    // --- Mantener visible el item activo en la lista (solo desktop: en móvil haría saltar la página) ---
    useEffect(() => {
        if (window.innerWidth < 1024) return;
        document
            .getElementById(`featured-item-${selectedIndex}`)
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedIndex]);

    const goTo = (index: number) => {
        if (index === selectedIndex) return;
        setDirection(index > selectedIndex ? 1 : -1);
        setSelectedIndex((index + total) % total);
    };
    const next = () => goTo(selectedIndex + 1);
    const prev = () => goTo(selectedIndex - 1);

    const handleCta = (event: MouseEvent, ctaLink: NewsItem["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            navigate(ctaLink.url);
        }
    };

    return (
        <section
            id="featured-news"
            aria-roledescription="carousel"
            aria-label="Noticias destacadas"
            className="w-full max-w-7xl mx-auto overflow-x-clip"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusIn={() => setIsPaused(true)}
            onFocusOut={() => setIsPaused(false)}
        >
            <style>{`@keyframes featured-progress { from { width: 0% } to { width: 100% } }`}</style>

            {/* Header de sección */}
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-4 px-1">
                <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/80 mb-1">
                        <LucideSparkles size={12} /> Destacados
                    </p>
                    <h2 className="font-anton text-2xl sm:text-3xl text-white uppercase leading-none">
                        Lo último de la comunidad
                    </h2>
                </div>

                {!single && (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="hidden min-[420px]:block text-xs font-mono text-white/40 tabular-nums" aria-live="polite">
                            {pad(selectedIndex + 1)} / {pad(total)}
                        </span>
                        <button
                            onClick={prev}
                            aria-label="Noticia anterior"
                            className="size-8 sm:size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer"
                        >
                            <LucideChevronLeft size={17} />
                        </button>
                        <button
                            onClick={next}
                            aria-label="Siguiente noticia"
                            className="size-8 sm:size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer"
                        >
                            <LucideChevronRight size={17} />
                        </button>
                        <button
                            onClick={() => setIsPaused((p) => !p)}
                            aria-label={isPaused ? "Reanudar autoplay" : "Pausar autoplay"}
                            aria-pressed={isPaused}
                            className="size-8 sm:size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer"
                        >
                            {isPaused ? <LucidePlay size={15} /> : <LucidePause size={15} />}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                {/* ── HERO PRINCIPAL ── */}
                <div className="relative min-w-0 h-[440px] sm:h-auto sm:aspect-[16/8] sm:min-h-[380px] rounded-3xl overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_0_60px_-15px_rgba(145,70,255,0.35)]">
                    <AnimatePresence custom={direction} initial={false}>
                        <motion.article
                            key={current.id}
                            custom={direction}
                            initial={{ x: direction >= 0 ? "60px" : "-60px", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: direction >= 0 ? "-60px" : "60px", opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0"
                            aria-roledescription="slide"
                            aria-label={`${selectedIndex + 1} de ${total}: ${current.title}`}
                        >
                            <img
                                src={current.background.img}
                                alt=""
                                aria-hidden="true"
                                loading={selectedIndex === 0 ? "eager" : "lazy"}
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-transparent to-transparent" />

                            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8">
                                <motion.div
                                    key={`content-${current.id}`}
                                    initial="hidden"
                                    animate="visible"
                                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
                                >
                                    <motion.div
                                        variants={{ hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } }}
                                        className="flex flex-wrap gap-1.5 mb-3"
                                    >
                                        {current.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-300/30 text-violet-200 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md"
                                            >
                                                <LucideSparkles size={11} /> {tag}
                                            </span>
                                        ))}
                                    </motion.div>

                                    <motion.h3
                                        variants={{ hidden: { y: 28, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: "easeOut" } } }}
                                        className="font-anton text-[26px] sm:text-5xl text-white uppercase leading-[0.95] mb-2 text-balance max-w-2xl"
                                    >
                                        {current.title}
                                    </motion.h3>

                                    <motion.p
                                        variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } } }}
                                        className="text-white/70 text-[13px] sm:text-base leading-relaxed max-w-xl line-clamp-2 mb-4 sm:mb-5"
                                    >
                                        {current.description}
                                    </motion.p>

                                    <motion.div
                                        variants={{ hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } } }}
                                    >
                                        <a
                                            {...(current.ctaLink.newTab && { target: "_blank", rel: "noopener noreferrer" })}
                                            href={current.ctaLink.url}
                                            onClick={(e) => handleCta(e as unknown as MouseEvent, current.ctaLink)}
                                            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-200 transition-all shadow-xl"
                                        >
                                            {current.ctaLink.text}
                                            {current.ctaLink.newTab
                                                ? <LucideArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                : <LucideArrowRight size={15} className="transition-transform group-hover:translate-x-1" />}
                                        </a>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.article>
                    </AnimatePresence>

                    {/* Barra de progreso (solo CSS, pausable, sin doble-avance) */}
                    {!single && (
                        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10 z-10">
                            <div
                                key={selectedIndex}
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                                style={{
                                    animation: `featured-progress ${duration}ms linear forwards`,
                                    animationPlayState: isPaused ? "paused" : "running",
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* ── LISTA LATERAL (escala a N noticias) ── */}
                {!single && (
                    <nav aria-label="Elegir noticia destacada" className="min-w-0 min-h-0">
                        <ol className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[430px] snap-x lg:snap-none pb-1 lg:pb-0 lg:pr-1 scrollbar-hide">
                            {newsItems.map((news, index) => {
                                const isActive = index === selectedIndex;
                                return (
                                    <li key={news.id} id={`featured-item-${index}`} className="snap-start shrink-0 w-[220px] sm:w-[240px] lg:w-auto">
                                        <button
                                            onClick={() => goTo(index)}
                                            aria-current={isActive}
                                            aria-label={`Ver: ${news.title}`}
                                            className={`
                                                group relative w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden
                                                ${isActive
                                                    ? "bg-violet-500/10 border-violet-300/30 shadow-[0_0_24px_-8px_rgba(145,70,255,0.5)]"
                                                    : "bg-white/[0.03] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.06]"
                                                }
                                            `}
                                        >
                                            <span
                                                className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all ${isActive ? "bg-violet-400" : "bg-transparent group-hover:bg-white/15"}`}
                                            />
                                            <span className="relative size-16 sm:size-[68px] rounded-xl overflow-hidden shrink-0 bg-zinc-900">
                                                <img
                                                    src={news.navImage || news.background.img}
                                                    alt=""
                                                    aria-hidden="true"
                                                    loading="lazy"
                                                    className={`w-full h-full object-cover transition-all duration-500 ${isActive ? "scale-105" : "opacity-70 group-hover:opacity-100 group-hover:scale-105"}`}
                                                />
                                            </span>
                                            <span className="flex-1 min-w-0 py-0.5">
                                                <span className={`block text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? "text-violet-300" : "text-white/35"}`}>
                                                    {news.tags[0]} · {pad(index + 1)}
                                                </span>
                                                <span className={`block font-bold text-[13px] leading-snug line-clamp-2 ${isActive ? "text-white" : "text-white/65 group-hover:text-white"}`}>
                                                    {news.title}
                                                </span>
                                            </span>
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
