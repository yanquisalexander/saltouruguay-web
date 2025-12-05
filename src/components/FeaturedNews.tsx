import { useEffect, useRef, useState } from "preact/compat";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { navigate } from "astro:transitions/client";
import { LucideArrowRight, LucideExternalLink, LucideClock } from "lucide-preact";

gsap.registerPlugin(ScrollToPlugin);

const NEWS = [
    {
        title: "Nueva Web Oficial",
        description: `Entérate de todas las novedades, eventos y torneos en un solo lugar centralizado.`,
        tags: ["Lanzamiento"],
        background: { img: "/og.webp" },
        navImage: "/og.webp",
        ctaLink: { text: "Ver detalles", url: "/", newTab: false },
        date: "-"
    },
    // Datos dummy para visualizar el diseño de lista

].map((news, index) => ({
    ...news,
    description: news.description.trim(),
    id: index,
}));

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [progress, setProgress] = useState(0);
    const slidesRef = useRef<Array<HTMLDivElement | null>>([]);
    const contentRef = useRef<Array<HTMLDivElement | null>>([]);
    const progressTween = useRef<gsap.core.Tween | null>(null);

    // Animación de Slides (Fade + Scale)
    useEffect(() => {
        if (selectedIndex !== null) {
            // Resetear otros slides
            slidesRef.current.forEach((slide, index) => {
                if (slide && index !== selectedIndex) {
                    gsap.to(slide, {
                        opacity: 0,
                        zIndex: 0,
                        scale: 1.1, // Zoom out effect
                        duration: 0.8,
                        ease: "power2.inOut",
                    });
                }
            });

            // Animar slide activo
            const selectedSlide = slidesRef.current[selectedIndex];
            if (selectedSlide) {
                gsap.set(selectedSlide, { zIndex: 10 });
                gsap.fromTo(selectedSlide,
                    { opacity: 0, scale: 1.05 },
                    { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
                );

                // Animar contenido
                const content = contentRef.current[selectedIndex];
                if (content) {
                    const elements = content.children;
                    gsap.fromTo(elements,
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.2, ease: "power2.out" }
                    );
                }
            }
        }
    }, [selectedIndex]);

    // Timer y Barra de Progreso
    useEffect(() => {
        if (progressTween.current) progressTween.current.kill();
        setProgress(0);

        if (newsItems.length > 1) { // Solo activar autoplay si hay más de una noticia
            progressTween.current = gsap.to({}, {
                duration: duration / 1000,
                ease: "none",
                onUpdate: function () {
                    setProgress(this.progress() * 100);
                },
                onComplete: () => {
                    setSelectedIndex((prev) => (prev + 1) % newsItems.length);
                }
            });
        }

        return () => {
            if (progressTween.current) progressTween.current.kill();
        };
    }, [selectedIndex, newsItems.length, duration]);

    const handleNavigation = (event: MouseEvent, ctaLink: typeof NEWS[0]["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            navigate(ctaLink.url);
        }
    };

    return (
        <section className="w-full max-w-5xl mx-auto p-4">
            {/* Contenedor Grid: Izquierda (Imagen Grande) - Derecha (Lista) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[500px] lg:h-[450px]">

                {/* --- MAIN FEATURED NEWS (2/3 width) --- */}
                <div className="relative lg:col-span-2 h-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900 group shadow-2xl">
                    {newsItems.map((news, index) => (
                        <div
                            key={news.id}
                            ref={(el) => (slidesRef.current[index] = el)}
                            className="absolute inset-0 w-full h-full"
                            style={{ opacity: index === 0 ? 1 : 0 }}
                        >
                            <img
                                className="absolute inset-0 w-full h-full object-cover"
                                src={news.background.img}
                                alt={news.title}
                            />
                            {/* Gradiente más agresivo para legibilidad */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

                            {/* Contenido */}
                            <div className="absolute inset-0 flex items-end p-8">
                                <div ref={(el) => (contentRef.current[index] = el)} className="w-full relative z-20">
                                    <div className="flex gap-2 mb-3">
                                        {news.tags.map((tag) => (
                                            <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 uppercase font-bold tracking-wider backdrop-blur-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <h2 className="text-3xl md:text-5xl font-teko font-bold text-white uppercase leading-none mb-3 drop-shadow-md">
                                        {news.title}
                                    </h2>

                                    <p className="text-gray-300 font-rubik text-sm md:text-base max-w-lg mb-6 line-clamp-2 leading-relaxed">
                                        {news.description}
                                    </p>

                                    <a
                                        href={news.ctaLink.url}
                                        onClick={(e) => handleNavigation(e as unknown as MouseEvent, news.ctaLink)}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 transition-all duration-300 rounded-lg font-teko text-xl font-bold uppercase tracking-wide backdrop-blur-md group/btn"
                                    >
                                        {news.ctaLink.text}
                                        <LucideArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- SIDEBAR LIST (1/3 width) --- */}
                <div className="hidden lg:flex flex-col gap-3 h-full overflow-y-auto pr-1">
                    {newsItems.map((news, index) => {
                        const isActive = selectedIndex === index;
                        return (
                            <button
                                key={news.id}
                                onClick={() => setSelectedIndex(index)}
                                className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300 w-full
                                    ${isActive
                                        ? "bg-white/10 border-white/20 shadow-lg"
                                        : "bg-gray-900/40 border-transparent hover:bg-white/5 hover:border-white/5 opacity-60 hover:opacity-100"
                                    }
                                `}
                            >
                                {/* Thumbnail pequeño */}
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-800">
                                    <img
                                        src={news.navImage}
                                        alt=""
                                        className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'grayscale'}`}
                                    />
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {news.tags[0]}
                                    </span>
                                    <span className="font-teko text-lg text-white leading-tight truncate w-full">
                                        {news.title}
                                    </span>
                                    <div className="flex items-center gap-1 mt-1 text-gray-500">
                                        <LucideClock size={10} />
                                        <span className="text-[10px] font-rubik">{news.date || 'Reciente'}</span>
                                    </div>
                                </div>

                                {/* Progress Bar (Vertical indicator) */}
                                {isActive && (
                                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-yellow-500 rounded-r-full">
                                        {/* Optional: Fill height based on timer logic if desired, or just static indicator */}
                                        <div
                                            className="w-full bg-white absolute bottom-0 left-0 transition-all ease-linear"
                                            style={{ height: `${100 - progress}%`, opacity: 0.5 }}
                                        />
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {/* Botón para ver todas si hay muchas */}
                    <div className="mt-auto pt-2">
                        <a href="/noticias" className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-teko text-lg uppercase">
                            Ver todas las noticias
                        </a>
                    </div>
                </div>

                {/* --- MOBILE INDICATORS (Dots) --- */}
                {/* Solo visible en móvil ya que ocultamos la sidebar */}
                <div className="lg:hidden flex justify-center gap-2 mt-2">
                    {newsItems.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${selectedIndex === index ? "w-6 bg-yellow-400" : "w-1.5 bg-white/20"}`}
                            aria-label={`Ir a noticia ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};