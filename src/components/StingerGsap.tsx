import { useEffect, useRef, useCallback } from "preact/compat";
import gsap from "gsap";

export default function StingerGsap() {
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const spinnerRef = useRef<HTMLDivElement>(null);
    const tlRef = useRef<gsap.core.Timeline>();

    // Handler para mostrar la transición
    const showStinger = useCallback(() => {
        const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            onComplete: () => {
                window.dispatchEvent(new CustomEvent("app:stinger-ended"));
            },
        });
        tlRef.current = tl;
        tl.set(containerRef.current, { display: "flex" });
        tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        tl.fromTo(
            logoRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5 },
            "-=0.3"
        );
        tl.fromTo(
            spinnerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.4 },
            "-=0.4"
        );
        tl.to({}, { duration: 1.2 });
        tl.to(containerRef.current, { opacity: 0, duration: 0.5 });
        tl.set(containerRef.current, { display: "none" });
    }, []);

    useEffect(() => {
        window.addEventListener("app:show-stinger-transition", showStinger);
        return () => {
            window.removeEventListener("app:show-stinger-transition", showStinger);
        };
    }, [showStinger]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[99999] bg-black flex items-center justify-center opacity-0 pointer-events-none"
        >
            {/* Logo y loader */}
            <div className="flex flex-col items-center gap-4 z-10">
                <img
                    ref={logoRef}
                    src="/favicon.svg"
                    alt="logo"
                    className="w-32 h-20 opacity-0"
                />
                <span className="text-white text-2xl font-anton uppercase">
                    salto uruguay server
                </span>



                <div
                    ref={spinnerRef}
                    className="size-8 border-4 border-t-transparent border-white rounded-full animate-spin-clockwise animate-iteration-count-infinite opacity-0"
                />
            </div>
        </div>
    );
}
