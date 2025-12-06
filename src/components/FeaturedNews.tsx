import { useEffect, useRef, useState } from "preact/compat";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { navigate } from "astro:transitions/client";
import { LucideArrowRight, LucideExternalLink, LucideSparkles } from "lucide-preact";

gsap.registerPlugin(ScrollToPlugin);

const NEWS = [
    {
        title: "#SaltoAwards 2025",
        description: `
        Votaciones abiertas! Ayúdanos a elegir a los mejores miembros de la comunidad del año.
    `,
        tags: ["Awards"],
        background: { img: "/images/ads/mc-extremo.webp" },
        navImage: "/images/ads/mc-extremo.webp",
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

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [progress, setProgress] = useState(0);
    const slidesRef = useRef<Array<HTMLLIElement | null>>([]);
    const contentRef = useRef<Array<HTMLDivElement | null>>([]);
    const scrollContainerRef = useRef<HTMLOListElement | null>(null);
    const progressTween = useRef<gsap.core.Tween | null>(null);

    // --- ANIMACIÓN DE CAMBIO DE SLIDE ---
    useEffect(() => {
        if (selectedIndex !== null) {
            // 1. Ocultar los inactivos
            slidesRef.current.forEach((slide, index) => {
                if (slide && index !== selectedIndex) {
                    gsap.to(slide, {
                        opacity: 0,
                        zIndex: 0,
                        duration: 0.5,
                        overwrite: true
                    });
                }
            });

            // 2. Animar el activo
            const selectedSlide = slidesRef.current[selectedIndex];
            if (selectedSlide) {
                gsap.set(selectedSlide, { zIndex: 10, display: 'flex' });

                // Imagen Zoom Effect
                const img = selectedSlide.querySelector('img');
                if (img) {
                    gsap.fromTo(img,
                        { scale: 1.1 },
                        { scale: 1, duration: 1.5, ease: "power2.out", overwrite: true }
                    );
                }

                // Fade In Container
                gsap.fromTo(selectedSlide,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.8, ease: "power2.inOut", overwrite: true }
                );

                // Animar contenido de texto (Entrada desde abajo)
                const content = contentRef.current[selectedIndex];
                if (content) {
                    gsap.fromTo(content.children,
                        { y: 30, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.2, ease: "back.out(1.7)", overwrite: true }
                    );
                }
            }

            // 3. Scroll automático de miniaturas (Tu lógica original mejorada)
            if (scrollContainerRef.current) {
                const thumb = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
                if (thumb) {
                    gsap.to(scrollContainerRef.current, {
                        scrollTo: { x: thumb, offsetX: (scrollContainerRef.current.offsetWidth - thumb.offsetWidth) / 2 },
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
            }
        }
    }, [selectedIndex]);

    // --- AUTOPLAY TIMER ---
    useEffect(() => {
        if (progressTween.current) progressTween.current.kill();
        setProgress(0);

        if (newsItems.length > 1) {
            progressTween.current = gsap.to({}, {
                duration: duration / 1000,
                ease: "none",
                onUpdate: function () { setProgress(this.progress() * 100); },
                onComplete: () => { setSelectedIndex((prev) => (prev + 1) % newsItems.length); }
            });
        }
        return () => { if (progressTween.current) progressTween.current.kill(); };
    }, [selectedIndex, newsItems.length, duration]);

    const handleNavigation = (event: MouseEvent, ctaLink: typeof NEWS[0]["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            navigate(ctaLink.url);
        }
    };

    return (
        <section id="latest-news" className="w-full max-w-6xl mx-auto px-4 flex flex-col gap-6">

            {/* --- MAIN SLIDER --- */}
            <div className="relative w-full aspect-[4/5] md:aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl group">
                <ol className="w-full h-full relative">
                    {newsItems.map((news, index) => (
                        <li
                            key={news.id}
                            ref={(el) => (slidesRef.current[index] = el)}
                            className="absolute inset-0 w-full h-full flex items-end md:items-center p-6 md:p-12 opacity-0"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    className="w-full h-full object-cover"
                                    src={news.background.img}
                                    alt={news.title}
                                    loading={index === 0 ? "eager" : "lazy"}
                                />
                                {/* Gradiente cinemático */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 md:bg-gradient-to-r md:from-black md:via-black/50 md:to-transparent"></div>
                            </div>

                            {/* GLASS CARD CONTENT */}
                            <div
                                ref={(el) => (contentRef.current[index] = el)}
                                className="relative z-10 max-w-2xl w-full"
                            >
                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {news.tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md flex items-center gap-1">
                                            <LucideSparkles size={10} /> {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Title */}
                                <h2 className="text-4xl md:text-6xl font-anton text-white uppercase leading-[0.95] mb-4 drop-shadow-lg text-balance">
                                    {news.title}
                                </h2>

                                {/* Description */}
                                <p className="text-white/80 font-rubik text-base md:text-lg mb-8 max-w-lg leading-relaxed text-pretty drop-shadow-md">
                                    {news.description}
                                </p>

                                {/* CTA Button */}
                                <a
                                    {...(news.ctaLink.newTab && { target: "_blank", rel: "noopener noreferrer" })}
                                    href={news.ctaLink.url}
                                    onClick={(event) => handleNavigation(event as unknown as MouseEvent, news.ctaLink)}
                                    className="inline-flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-yellow-400 border border-white/20 hover:border-yellow-500/50 rounded-xl font-teko text-xl font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:scale-105 group/btn"
                                >
                                    <span>{news.ctaLink.text}</span>
                                    {news.ctaLink.newTab ? <LucideExternalLink size={18} /> : <LucideArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />}
                                </a>
                            </div>
                        </li>
                    ))}
                </ol>
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
                                    className={`
                                        relative group flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all duration-300 w-64 md:w-72
                                        ${isActive
                                            ? "bg-white/10 border-white/30 shadow-lg"
                                            : "bg-gray-900/60 border-white/5 hover:bg-white/5 hover:border-white/10"
                                        }
                                    `}
                                >
                                    {/* Miniatura */}
                                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black">
                                        <img
                                            className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'scale-110 saturate-100' : 'grayscale group-hover:grayscale-0'}`}
                                            src={news.navImage || news.background.img}
                                            alt={news.title}
                                        />
                                    </div>

                                    {/* Texto Info */}
                                    <div className="flex flex-col items-start min-w-0 text-left">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`}>
                                            {news.tags[0]}
                                        </span>
                                        <span className={`font-teko text-lg uppercase leading-none truncate w-full ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                            {news.title}
                                        </span>
                                    </div>

                                    {/* Barra de Progreso (Solo en activo) */}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-500 transition-all ease-linear"
                                                style={{ width: `${progress}%` }}
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