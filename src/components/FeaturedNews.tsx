import { useEffect, useState } from "preact/hooks";
import { LucideArrowUpRight, LucideChevronLeft, LucideChevronRight, LucidePause, LucidePlay, LucideSparkles } from "lucide-preact";
import "./styles/featured-news.css";

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

export const FeaturedNews = ({ newsItems = NEWS, duration = 8000 }: { newsItems?: NewsItem[]; duration?: number }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(true);
    const total = newsItems.length;
    const activeIndex = Math.min(selectedIndex, Math.max(0, total - 1));
    const current = newsItems[activeIndex];
    const rotating = !paused && !hovered && !focused && !reducedMotion;

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReducedMotion(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (total < 2 || !rotating) return;
        const timer = window.setTimeout(() => setSelectedIndex((activeIndex + 1) % total), Math.max(3000, duration));
        return () => window.clearTimeout(timer);
    }, [activeIndex, total, rotating, duration]);

    const select = (index: number) => {
        if (!total) return;
        setSelectedIndex((index + total) % total);
    };
    if (!current) return null;

    return <section id="featured-news" class="featured-stories" aria-roledescription={total > 1 ? 'carrusel' : undefined} aria-label="Destacados de la comunidad"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusIn={() => setFocused(true)} onFocusOut={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}>
        <header class="stories-heading">
            <span class="stories-badge"><LucideSparkles size={14} /> Para no perdérselo</span>
            <h2>Lo que pasa en <span>Salto</span></h2>
            <p>Las historias y novedades de nuestra comunidad.</p>
        </header>

        <div class="stories-frame">
            <article class="story-feature" aria-roledescription={total > 1 ? 'diapositiva' : undefined} aria-label={(activeIndex + 1) + ' de ' + total}>
                <div class="story-visual"><img key={current.id} src={current.background.img} alt="" decoding="async" /></div>
                <div class="story-copy" aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
                    <div class="story-tags">{current.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                    <h3>{current.title}</h3>
                    <p>{current.description}</p>
                    <a class="story-link" href={current.ctaLink.url} target={current.ctaLink.newTab ? '_blank' : undefined} rel={current.ctaLink.newTab ? 'noopener noreferrer' : undefined}>{current.ctaLink.text}<LucideArrowUpRight size={18} /></a>
                </div>
            </article>

            {total > 1 && <div class="stories-bottom">
                <nav class="story-selector" aria-label="Elegir noticia destacada"><ol>{newsItems.map((news, index) => <li key={news.id}>
                    <button type="button" class="story-option" aria-pressed={index === activeIndex} onClick={() => select(index)}>
                        <img src={news.navImage || news.background.img} alt="" loading="lazy" />
                        <span><span class="story-option-tag">{news.tags[0]}</span><span class="story-option-title">{news.title}</span></span>
                        {index === activeIndex && <span class="story-selected-dot" aria-hidden="true" />}
                    </button>
                </li>)}</ol></nav>
                <div class="story-controls"><span class="story-count">{activeIndex + 1}<span> / {total}</span></span>
                    <button type="button" onClick={() => select(activeIndex - 1)} aria-label="Noticia anterior"><LucideChevronLeft size={18} /></button>
                    <button type="button" onClick={() => select(activeIndex + 1)} aria-label="Siguiente noticia"><LucideChevronRight size={18} /></button>
                    {!reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Reanudar noticias automáticas' : 'Pausar noticias automáticas'} aria-pressed={paused}>{paused ? <LucidePlay size={15} /> : <LucidePause size={15} />}</button>}
                </div>
            </div>}
        </div>
    </section>;
};
