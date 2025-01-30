import { navigate } from "astro:transitions/client";
import { useEffect, useRef, useState } from "preact/hooks";

const NEWS = [
    {
        title: "Guerra de Streamers",
        description: `
        Se viene la Edición Extrema de la Guerra de Streamers. ¡Prepárate para la batalla!
    `,
        tags: ["Comunidad"],
        background: {
            img: "/images/ads/stream-wars.webp",
        },
        navImage: "/images/ads/stream-wars.webp",
        ctaLink: {
            text: "🎮 ¡Inscríbete ya!",
            url: "/guerra-streamers/inscripcion",
            newTab: false,
        },
    },
    {
        title: "SaltoCraft III",
        description: `
        ¡Se acerca la tercera edición de SaltoCraft! ¿Estás listo para la aventura?
    `,
        tags: ["Minecraft"],
        background: {
            img: "/images/ads/saltocraft.webp",
        },
        navImage: "/images/ads/saltocraft.webp",
        ctaLink: {
            text: "Próximamente",
            url: "#",
            newTab: false,
        }
    },
    {
        title: "Bienvenido a la nueva web",
        description: `
        ¡SaltoUruguayServer tiene una nueva web! 🎉
        Entérate de todas las novedades, eventos y torneos en un solo lugar.
    `,
        tags: ["Web"],
        background: {
            img: "/og.webp",
        },
        navImage: "/og.webp",
        ctaLink: {
            text: "🎉 Descubre más",
            url: "/",
            newTab: false,
        },
    },


].map((news, index) => {
    return {
        ...news,
        description: news.description.trim(),
        id: index,
    };
});

export const FeaturedNews = ({ newsItems = NEWS, duration = 10000 }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [intervalId, setIntervalId] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLOListElement | null>(null);


    useEffect(() => {
        // Scroll to the selected slide
        if (scrollContainerRef.current && selectedIndex !== null) {
            const scrollContainer = scrollContainerRef.current;
            const selectedSlide = scrollContainer.children[selectedIndex] as HTMLElement;
            const scrollLeft = selectedSlide.offsetLeft - (scrollContainer.offsetWidth - selectedSlide.offsetWidth) / 2;
            scrollContainer.scrollTo({
                left: scrollLeft,
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);

    // Manejador del cambio de slide
    const handleChangeSlide = (index: number) => {
        setSelectedIndex(index);
        resetAutoSlide();
    };

    // Función para iniciar el auto-slide
    const startAutoSlide = () => {
        const id = window.setInterval(() => {
            setSelectedIndex((prevIndex) => {
                if (prevIndex === null || prevIndex === newsItems.length - 1) {
                    return 0;
                }
                return prevIndex + 1;

            })
        }, duration);
        setIntervalId(id);
    };

    // Función para detener el auto-slide
    const stopAutoSlide = () => {
        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }
    };

    // Función para resetear el auto-slide
    const resetAutoSlide = () => {
        stopAutoSlide();
        startAutoSlide();
    };

    // Efecto para iniciar el auto-slide cuando el componente se monta
    useEffect(() => {
        setSelectedIndex(0);
        startAutoSlide();
        return () => stopAutoSlide(); // Limpiar el intervalo al desmontar el componente
    }, [newsItems.length, duration]);

    const handleNavigation = (
        event: Event,
        ctaLink: (typeof NEWS)[0]["ctaLink"],
    ) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            if (ctaLink.url.startsWith("#")) {
                document
                    .querySelector(ctaLink.url)
                    ?.scrollIntoView({ behavior: "smooth" });
            } else {
                navigate(ctaLink.url);
            }
        }
    };

    return (
        <section id="latest-news" className="max-w-screen-lg mx-auto">
            <ol>
                {newsItems.map((news, index) => (
                    <li
                        key={news.id}
                        className={`relative w-full min-h-[400px] aspect-[9/12] lg:aspect-[20/9] flex items-end rounded-[40px] overflow-hidden group transition-all duration-500 ${index !== selectedIndex && "hidden"}`}
                    >
                        <div
                            className="w-full h-full bg-black/80 absolute inset-0 select-none pointer-events-none"
                            style={{
                                maskImage:
                                    "radial-gradient(ellipse at bottom left, black 30%, transparent 70%)",
                            }}
                        ></div>
                        <a
                            {...(news.ctaLink.newTab && {
                                target: "_blank",
                                rel: "noopener noreferrer",
                            })}
                            href={news.ctaLink.url}
                            onClick={(event) => handleNavigation(event, news.ctaLink)}
                            className="cursor-pointer w-full h-full flex items-end"
                        >
                            <img
                                className={`absolute inset-0 w-full h-full object-cover -z-10 ${index % 2 === 0 ? "slide-zoom-animation-zoom-out" : "slide-zoom-animation-zoom-in"}`}
                                src={news.background.img}
                                alt={news.title}
                                width="1920"
                                height="1080"
                                loading={index === selectedIndex ? "eager" : "lazy"}
                            />
                            <div className="px-6 py-10 lg:px-20 lg:py-16 animate-fade-in animate-duration-250 duration-75">
                                <ol className="flex items-center gap-4 mb-5 overflow-x-auto">
                                    {news.tags.map((tag) => (
                                        <li
                                            key={tag}
                                            className="w-max font-rubik border border-white/20 rounded-2xl px-4 py-1 text-sm md:text-base font-semibold text-white bg-blue-900/20 backdrop-blur-xl"
                                        >
                                            {tag}
                                        </li>
                                    ))}
                                </ol>
                                <h2 className="font-bold font-rubik text-2xl md:text-4xl [text-shadow:_0_1px_0_rgb(0_0_0_/_40%)]">
                                    {news.title}
                                </h2>
                                <p className="text-base font-rubik md:text-lg max-w-[42ch] [text-shadow:_0_1px_0_rgb(0_0_0_/_40%)]">
                                    {news.description}
                                </p>
                                <span className="px-8 py-3 font-rubik inline-flex mt-4 rounded-2xl border border-white/20 transition-all duration-500 text-base w-max md:text-lg font-semibold text-white bg-white/10 backdrop-blur-xl hover:bg-white/20 hover:border-white/30 hover:scale-105 group-hover:bg-white/20 group-hover:border-white/30 group-hover:scale-105">
                                    {news.ctaLink.text}
                                </span>
                            </div>
                        </a>
                    </li>
                ))}
            </ol>
            <nav className="w-full mt-10">
                <ol
                    className="flex gap-2 overflow-x-scroll w-full justify-center scrollbar-hide"
                    ref={scrollContainerRef}
                >
                    {newsItems.map((news, index) => (
                        <li key={news.id} className="contents">
                            <button
                                style={{
                                    "--slider-timeout": `${duration}ms`,
                                }}
                                className={`h-32 rounded-xl p-0.5 relative transition-all duration-500 group ${selectedIndex === index
                                    ? "w-[calc(0.6_*_100vw)] md:w-[calc(0.23_*_100%)] slider-border"
                                    : "w-[calc(0.4_*_100vw)] md:w-[calc(0.2_*_100%)]"
                                    }`}
                                aria-label={news.ctaLink.text}
                                title={news.ctaLink.text}
                                onClick={() => handleChangeSlide(index)}
                            >
                                <img
                                    className={`w-full h-full object-cover rounded-xl border-[4px] transition-all ${selectedIndex === index
                                        ? "border-[#020617]"
                                        : "border-transparent"
                                        }`}
                                    src={news.navImage}
                                    alt={news.title}
                                    width="1920"
                                    height="1080"
                                />
                                <img
                                    className={`w-full h-full object-cover absolute inset-0 rounded-[40px] blur-lg -z-10 transition-all translate-y-0 opacity-10 duration-500 ${selectedIndex !== index &&
                                        "group-hover:opacity-40 group-hover:translate-y-2"
                                        }`}
                                    src={news.navImage}
                                    alt={news.title}
                                    width="1920"
                                    height="1080"
                                />
                            </button>
                        </li>
                    ))}
                </ol>
            </nav>

        </section>
    );
};