import { useEffect, useRef, useState } from "preact/compat";
import { gsap } from "gsap";
import { navigate } from "astro:transitions/client";

const NEWS = [
    {
        title: "SaltoCraft Extremo III",
        description: `
        ¿Estás listo para el desafío definitivo? SaltoCraft Extremo III está por comenzar. Prepárate para una experiencia de juego intensa y llena de aventuras.
    `,
        tags: ["Minecraft"],
        background: {
            img: "/images/ads/mc-extremo.webp",
        },
        navImage: "/images/ads/mc-extremo.webp",
        ctaLink: {
            text: "¡Inscríbete ahora!",
            url: "/mc-extremo/inscripcion",
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

export const FeaturedNews = ({ newsItems = NEWS, duration = 10000 }: { newsItems?: typeof NEWS, duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [intervalId, setIntervalId] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLOListElement | null>(null);
    const slidesRef = useRef<Array<HTMLLIElement | null>>([]);
    const contentRef = useRef<Array<HTMLDivElement | null>>([]);

    useEffect(() => {
        // Scroll to the selected slide con GSAP
        if (scrollContainerRef.current && selectedIndex !== null) {
            const scrollContainer = scrollContainerRef.current;
            const selectedSlide = scrollContainer.children[selectedIndex] as HTMLElement;
            const containerWidth = scrollContainer.offsetWidth;
            const slideWidth = selectedSlide.offsetWidth;
            const scrollLeft = selectedSlide.offsetLeft - (containerWidth - slideWidth) / 2;

            gsap.to(scrollContainer, {
                scrollLeft: Math.max(0, scrollLeft),
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }, [selectedIndex]);

    // Animate slide transitions
    useEffect(() => {
        if (selectedIndex !== null) {
            // Hide all slides first
            slidesRef.current.forEach((slide, index) => {
                if (slide && index !== selectedIndex) {
                    gsap.to(slide, {
                        opacity: 0,
                        scale: 0.95,
                        duration: 0.3,
                        ease: "power2.out",
                        onComplete: () => {
                            if (slide) slide.style.display = 'none';
                        }
                    });
                }
            });

            // Show and animate selected slide
            const selectedSlide = slidesRef.current[selectedIndex];
            if (selectedSlide) {
                selectedSlide.style.display = 'flex';

                gsap.fromTo(selectedSlide,
                    {
                        opacity: 0,
                        scale: 0.95,
                    },
                    {
                        opacity: 1,
                        scale: 1,
                        duration: 0.5,
                        ease: "power2.out"
                    }
                );

                // Animate content
                const content = contentRef.current[selectedIndex];
                if (content) {
                    gsap.fromTo(Array.from(content.children),
                        {
                            y: 30,
                            opacity: 0
                        },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.6,
                            stagger: 0.1,
                            ease: "power2.out",
                            delay: 0.2
                        }
                    );
                }

                // Animate background image
                const img = selectedSlide.querySelector('img') as HTMLImageElement | null;
                if (img) {
                    gsap.fromTo(img,
                        {
                            scale: selectedIndex % 2 === 0 ? 1.1 : 0.9,
                        },
                        {
                            scale: 1,
                            duration: 8,
                            ease: "power1.inOut"
                        }
                    );
                }
            }
        }
    }, [selectedIndex]);

    const handleChangeSlide = (index: number) => {
        setSelectedIndex(index);
        resetAutoSlide();
    };

    const startAutoSlide = () => {
        const id = window.setInterval(() => {
            setSelectedIndex((prevIndex) => {
                if (prevIndex === null || prevIndex === newsItems.length - 1) {
                    return 0;
                }
                return prevIndex + 1;
            });
        }, duration);
        setIntervalId(id);
    };

    const stopAutoSlide = () => {
        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }
    };

    const resetAutoSlide = () => {
        stopAutoSlide();
        startAutoSlide();
    };

    useEffect(() => {
        setSelectedIndex(0);
        startAutoSlide();
        return () => stopAutoSlide();
    }, [newsItems.length, duration]);

    const handleNavigation = (event: MouseEvent, ctaLink: typeof NEWS[0]["ctaLink"]) => {
        if (!ctaLink.newTab) {
            event.preventDefault();
            if (ctaLink.url.startsWith("#")) {
                const target = document.querySelector(ctaLink.url);
                if (target) {
                    gsap.to(window, {
                        duration: 1,
                        scrollTo: target,
                        ease: "power2.inOut"
                    });
                }
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
                        ref={(el) => (slidesRef.current[index] = el)}
                        className="relative w-full min-h-[400px] aspect-[9/12] lg:aspect-[20/9] flex items-end rounded-[40px] overflow-hidden group"
                        style={{ display: index !== selectedIndex ? 'none' : 'flex' }}
                    >
                        <div
                            className="w-full h-full bg-black/80 absolute inset-0 select-none pointer-events-none"
                            style={{
                                maskImage: "radial-gradient(ellipse at bottom left, black 30%, transparent 70%)",
                            }}
                        />
                        <a
                            {...(news.ctaLink.newTab && {
                                target: "_blank",
                                rel: "noopener noreferrer",
                            })}
                            href={news.ctaLink.url}
                            onClick={(event) => handleNavigation(event as unknown as MouseEvent, news.ctaLink)}
                            className="cursor-pointer w-full h-full flex items-end"
                        >
                            <img
                                className={`absolute inset-0 w-full h-full object-cover -z-10 ${index % 2 === 0 ? "slide-zoom-animation-zoom-out" : "slide-zoom-animation-zoom-in"}`}
                                src={news.background.img || "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=1920&h=1080&fit=crop"}
                                alt={news.title}
                                width="1920"
                                height="1080"
                                loading={index === selectedIndex ? "eager" : "lazy"}
                                style={{ '--slider-timeout': `${duration}ms` } as any}
                            />
                            <div
                                ref={(el) => (contentRef.current[index] = el)}
                                className="px-6 py-10 lg:px-20 lg:py-16"
                            >
                                <ol className="flex items-center gap-4 mb-5 overflow-x-auto">
                                    {news.tags.map((tag) => (
                                        <li
                                            key={tag}
                                            className="w-max font-sans border border-white/20 rounded-2xl px-4 py-1 text-sm md:text-base font-semibold text-white bg-blue-900/20 backdrop-blur-xl"
                                        >
                                            {tag}
                                        </li>
                                    ))}
                                </ol>
                                <h2 className="font-bold font-sans text-2xl md:text-4xl text-white mb-4" style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}>
                                    {news.title}
                                </h2>
                                <p className="text-base font-sans md:text-lg max-w-[42ch] text-white mb-6" style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}>
                                    {news.description}
                                </p>
                                <span className="px-8 py-3 font-sans inline-flex rounded-2xl border border-white/20 text-base w-max md:text-lg font-semibold text-white bg-white/10 backdrop-blur-xl hover:bg-white/20 hover:border-white/30 hover:scale-105 transition-all duration-300">
                                    {news.ctaLink.text}
                                </span>
                            </div>
                        </a>
                    </li>
                ))}
            </ol>
            <nav className="relative w-full mt-10">

                <ol
                    className="flex gap-3 overflow-x-auto w-full py-2 justify-center scrollbar-hide snap-x snap-mandatory px-8"
                    ref={scrollContainerRef}
                    style={{
                        scrollPaddingLeft: '2rem',
                        scrollPaddingRight: '2rem',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {newsItems.map((news, index) => (
                        <li key={news.id} className="flex-shrink-0 snap-center">
                            <button
                                style={{
                                    '--slider-timeout': `${duration}ms`,
                                } as any}
                                className={`h-24 aspect-[16/9] rounded-xl p-0.5 relative group transition-all duration-500 ${selectedIndex === index
                                    ? "scale-110 slider-border"
                                    : "scale-100"
                                    } flex-shrink-0`}
                                aria-label={news.ctaLink.text}
                                title={news.ctaLink.text}
                                onClick={() => handleChangeSlide(index)}

                            >
                                <img
                                    className={`w-full h-full object-cover rounded-xl border-[4px] transition-all ${selectedIndex === index
                                        ? "border-[#020617]"
                                        : "border-transparent"
                                        }`}
                                    src={news.navImage || "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=300&fit=crop"}
                                    alt={news.title}
                                    width="400"
                                    height="300"
                                />
                            </button>
                        </li>
                    ))}
                </ol>
            </nav>
        </section>
    );
};