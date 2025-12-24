import { useEffect, useRef, useState } from "preact/compat";
import { motion, AnimatePresence } from "motion/react";
import { navigate } from "astro:transitions/client";
import { LucideArrowRight, LucideExternalLink, LucideSparkles } from "lucide-preact";

const NEWS = [
    {
        title: "#SaltoAwards 2025",
        description: `
        Votaciones abiertas! Ayúdanos a elegir a los mejores miembros de la comunidad del año.
    `,
        tags: ["Awards"],
        background: { img: "/images/ads/awards.webp" },
        navImage: "/images/ads/awards.webp",
        ctaLink: { text: "¡Vota ahora!", url: "/awards", newTab: false }
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
    // El estado 'initial' lo usaremos solo para las ENTRADAS de nuevos slides,
    // no para el render inicial del servidor.
    enter: { opacity: 0, zIndex: 10 },
    center: {
        opacity: 1,
        zIndex: 10,
        transition: { duration: 0.8, ease: "easeInOut" }
    },
    exit: {
        opacity: 0,
        zIndex: 0,
        transition: { duration: 0.5, ease: "easeInOut" }
    }
};

const contentContainerVariants = {
    center: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const contentItemVariants = {
    enter: { y: 30, opacity: 0 },
    center: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
    }
};

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    // Inicializamos en 0. Esto coincide con lo que el servidor renderizará por defecto.
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const scrollContainerRef = useRef<HTMLOListElement | null>(null);

    // --- SCROLL SEGURO (Solo cliente) ---
    useEffect(() => {
        // Verificamos que container.current exista para evitar errores en tests o entornos raros
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const thumb = container.children[selectedIndex] as HTMLElement;

            if (thumb) {
                const scrollLeft = thumb.offsetLeft - (container.offsetWidth / 2) + (thumb.offsetWidth / 2);
                // Usamos 'scrollTo' nativo que es seguro en useEffect
                container.scrollTo({
                    left: scrollLeft,
                    behavior: "smooth"
                });
            }
        }
    }, [selectedIndex]);

    const handleNextSlide = () => {
        setSelectedIndex((prev) => (prev + 1) % newsItems.length);
    };

    const handleNavigation = (event: MouseEvent, ctaLink: typeof NEWS[0]["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            // navigate es seguro invocarlo aquí porque es un evento de usuario
            navigate(ctaLink.url);
        }
    };

    return (
        <section id="latest-news" className="w-full max-w-6xl mx-auto px-4 flex flex-col gap-6">

            {/* --- MAIN SLIDER --- */}
            <div className="relative w-full aspect-[4/5] md:aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl group">
                <div className="w-full h-full relative">
                    {/* SSR KEY: initial={false} 
                        Esto le dice a Framer Motion: "Si el componente ya está montado (porque vino del servidor),
                        no ejecutes la animación de entrada inicial (opacity 0 -> 1)".
                        Muestra el estado 'center' directamente.
                    */}
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={selectedIndex}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute inset-0 w-full h-full flex items-end md:items-center p-6 md:p-12"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <motion.img
                                    // Eliminamos variants complejas en la imagen para evitar repaints pesados,
                                    // o usamos una transición simple de escala.
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="w-full h-full object-cover"
                                    src={newsItems[selectedIndex].background.img}
                                    alt={newsItems[selectedIndex].title}
                                    // Eager solo para la primera imagen para LCP rápido
                                    loading={selectedIndex === 0 ? "eager" : "lazy"}
                                    decoding="async"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 md:bg-gradient-to-r md:from-black md:via-black/50 md:to-transparent"></div>
                            </div>

                            {/* CONTENT */}
                            <motion.div
                                variants={contentContainerVariants}
                                className="relative z-10 max-w-2xl w-full"
                            >
                                <motion.div variants={contentItemVariants} className="flex flex-wrap gap-2 mb-4">
                                    {newsItems[selectedIndex].tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md flex items-center gap-1">
                                            <LucideSparkles size={10} /> {tag}
                                        </span>
                                    ))}
                                </motion.div>

                                <motion.h2 variants={contentItemVariants} className="text-4xl md:text-6xl font-anton text-white uppercase leading-[0.95] mb-4 drop-shadow-lg text-balance">
                                    {newsItems[selectedIndex].title}
                                </motion.h2>

                                <motion.p variants={contentItemVariants} className="text-white/80 font-rubik text-base md:text-lg mb-8 max-w-lg leading-relaxed text-pretty drop-shadow-md">
                                    {newsItems[selectedIndex].description}
                                </motion.p>

                                <motion.div variants={contentItemVariants}>
                                    <a
                                        {...(newsItems[selectedIndex].ctaLink.newTab && { target: "_blank", rel: "noopener noreferrer" })}
                                        href={newsItems[selectedIndex].ctaLink.url}
                                        onClick={(event) => handleNavigation(event as unknown as MouseEvent, newsItems[selectedIndex].ctaLink)}
                                        className="inline-flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-yellow-400 border border-white/20 hover:border-yellow-500/50 rounded-xl font-teko text-xl font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:scale-105 group/btn"
                                    >
                                        <span>{newsItems[selectedIndex].ctaLink.text}</span>
                                        {newsItems[selectedIndex].ctaLink.newTab ? <LucideExternalLink size={18} /> : <LucideArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />}
                                    </a>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* --- THUMBNAILS NAVIGATION --- */}
            <nav className="relative w-full">
                <ol
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-hide snap-x snap-mandatory"
                >
                    {newsItems.map((news, index) => {
                        const isActive = selectedIndex === index;
                        return (
                            <li key={news.id} className="flex-shrink-0 snap-center">
                                <button
                                    onClick={() => setSelectedIndex(index)}
                                    aria-label={`Ver noticia: ${news.title}`}
                                    aria-current={isActive ? "true" : "false"}
                                    className={`
                                        relative group flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all duration-300 w-64 md:w-72
                                        ${isActive
                                            ? "bg-white/10 border-white/30 shadow-lg"
                                            : "bg-gray-900/60 border-white/5 hover:bg-white/5 hover:border-white/10"
                                        }
                                    `}
                                >
                                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black">
                                        <img
                                            className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'scale-110 saturate-100' : 'grayscale group-hover:grayscale-0'}`}
                                            src={news.navImage || news.background.img}
                                            alt={news.title}
                                            loading="lazy"
                                        />
                                    </div>

                                    <div className="flex flex-col items-start min-w-0 text-left">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`}>
                                            {news.tags[0]}
                                        </span>
                                        <span className={`font-teko text-lg uppercase leading-none truncate w-full ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                            {news.title}
                                        </span>
                                    </div>

                                    {/* Barra de Progreso */}
                                    {isActive && newsItems.length > 1 && (
                                        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-yellow-500"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{
                                                    duration: duration / 1000,
                                                    ease: "linear"
                                                }}
                                                onAnimationComplete={handleNextSlide}
                                            />
                                        </div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </section>
    );
};