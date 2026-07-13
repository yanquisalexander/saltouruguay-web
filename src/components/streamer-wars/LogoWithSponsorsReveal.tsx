import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { LucideSwords } from "lucide-preact";
import { Fragment } from "preact/jsx-runtime";
import { playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

const CatEyeIcon = () => (

  <svg viewBox="0 0 100 125">
    <path fill="currentColor" d="M91 50.7s0-.1 0 0v-.3c-.1-.6-.4-1.2-.8-1.7-2.6-3.1-5.7-5.8-8.8-8.3C74.7 35 67 30.5 58.5 28.7c-4.9-1-9.9-1.1-14.8-.2-4.5.8-8.8 2.5-12.9 4.5-6.3 3.2-12.1 7.7-17.2 12.7-.9.9-1.9 1.9-2.7 2.9-1.1 1.3-1.1 2.9 0 4.3 2.6 3.1 5.7 5.8 8.8 8.3 6.7 5.4 14.4 9.9 22.9 11.7 4.9 1 9.9 1.1 14.8.2 4.5-.8 8.8-2.5 12.9-4.5 6.3-3.2 12.1-7.7 17.2-12.7.9-.9 1.9-1.9 2.7-2.9.5-.5.7-1 .8-1.7v-.6c0-.1 0 0 0 0M50.5 66.4c-8.6 0-15.6-7-15.6-15.6s7-15.6 15.6-15.6 15.6 7 15.6 15.6-7 15.6-15.6 15.6" />
    <ellipse cx="50.5" cy="51" rx="5.2" ry="17" fill="currentColor" />

  </svg>);

const StreamerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -10 110 135">
    <path fill="currentColor" d="M96.875 84.375a4.69 4.69 0 0 1-4.687 4.688H7.813c-2.586 0-4.688-2.102-4.688-4.688s2.102-4.687 4.688-4.687h84.375a4.69 4.69 0 0 1 4.687 4.687m-18.75-67.188c-2.586 0-4.687 2.102-4.687 4.687s2.101 4.688 4.687 4.688 4.688-2.102 4.688-4.688-2.102-4.687-4.688-4.687m11.734 14.832c5.594-5.594 5.594-14.695 0-20.289a1.565 1.565 0 0 0-2.21 0c-.61.61-.61 1.598 0 2.21 4.374 4.376 4.374 11.497 0 15.868-.61.61-.61 1.598 0 2.21a1.562 1.562 0 0 0 2.211 0zm-3.941-3.613c3.601-3.598 3.601-9.457 0-13.06a1.565 1.565 0 0 0-2.211 0c-.61.61-.61 1.598 0 2.212a6.116 6.116 0 0 1 0 8.64c-.61.61-.61 1.598 0 2.211a1.562 1.562 0 0 0 2.211 0zm-17.316 3.613c.609-.61.609-1.598 0-2.21-4.375-4.376-4.375-11.497 0-15.868.609-.61.609-1.598 0-2.21a1.565 1.565 0 0 0-2.211 0c-5.594 5.593-5.594 14.694 0 20.288a1.562 1.562 0 0 0 2.211 0zm3.941-3.613c.61-.61.61-1.598 0-2.211a6.116 6.116 0 0 1 0-8.64c.61-.61.61-1.598 0-2.212a1.565 1.565 0 0 0-2.21 0c-3.603 3.598-3.603 9.457 0 13.06.304.304.702.456 1.105.456.398 0 .8-.152 1.105-.457zm8.29 48.16-.892-9.801a4.664 4.664 0 0 0-4.668-4.262h-2.105a4.664 4.664 0 0 0-4.668 4.262l-.89 9.8zm11.354-32.812H56.25a4.69 4.69 0 0 0-4.687 4.687v20.312a4.69 4.69 0 0 0 4.687 4.688h8.504l.633-6.957a7.78 7.78 0 0 1 7.781-7.106h2.106a7.78 7.78 0 0 1 7.78 7.106l.634 6.957h8.503a4.69 4.69 0 0 0 4.688-4.688V48.441a4.69 4.69 0 0 0-4.688-4.687zM56.25 76.566l-48.438-.004c-.031 0-.062.008-.098.012l3.832-11.496a7.8 7.8 0 0 1 5.172-5l11.406-3.438v-3.45a17.9 17.9 0 0 1-4.972-4.91 17.1 17.1 0 0 1-1.852-4.175c-2.285-1.895-3.754-4.73-3.754-7.918v-7.758q-.001-.106.016-.207c.418-3.117 1.926-5.531 4.476-7.176 7.965-5.133 23.863-.789 26.016-.168 4.82.074 7.383 2.5 7.832 7.41l.008 7.899a10.2 10.2 0 0 1-1.094 4.59c-3.613.683-6.359 3.855-6.359 7.664v2.172c-.176.191-.328.398-.512.582a16.7 16.7 0 0 1-2.613 2.12v3.329l3.125.941v11.168c0 4.309 3.504 7.813 7.812 7.813zM36.792 52.765c3.3 0 6.516-1.371 8.922-3.778 2.45-2.449 3.82-5.742 3.77-9.027v-.016a12.76 12.76 0 0 0-1.352-5.668c-3.023.743-9.414 1.747-12.438 2.204-.914.14-1.79-.618-1.797-1.543v-.797l-9.082.828c-1.668 3.633-1.316 7.937.992 11.676 2.574 3.781 6.57 6.101 10.984 6.12zm5.395 2.14c-1.774.672-3.649 1.028-5.532.985-1.87-.02-3.691-.403-5.406-1.067v6.903a3.91 3.91 0 0 0 3.906 3.906h3.125a3.91 3.91 0 0 0 3.907-3.906z" />
  </svg>
);

const MedalIcon = () => (
  <svg viewBox="-5 -10 110 135">
    <path fill="currentColor" d="M72.125 6.25h-44.25a8.497 8.497 0 0 0-8.484 8.484V73.75a8.45 8.45 0 0 0 4.562 7.5l22.125 11.531a8.58 8.58 0 0 0 7.813 0l22.156-11.53a8.46 8.46 0 0 0 4.562-7.516v-59a8.497 8.497 0 0 0-8.484-8.485zm.203 59.875c0 1.68-.84 3.25-2.234 4.188l-17.312 11.53a5.01 5.01 0 0 1-5.563 0l-17.312-11.53a5.05 5.05 0 0 1-2.234-4.188V48.328a4.172 4.172 0 0 1 6.469-3.453l14.812 9.812a1.89 1.89 0 0 0 2.093 0l14.812-9.875a4.172 4.172 0 0 1 6.469 3.454zM59.703 39.687a3.43 3.43 0 0 1-1.371 3.3 3.42 3.42 0 0 1-3.566.278l-4.688-2.437a.24.24 0 0 0-.25 0c-1.094.453-5.015 3-6.25 2.828a3.42 3.42 0 0 1-3.36-3.969l.891-5.172a.28.28 0 0 0-.078-.25l-3.75-3.656a3.43 3.43 0 0 1-.836-3.473 3.42 3.42 0 0 1 2.711-2.324l5.188-.75a.24.24 0 0 0 .203-.156l2.328-4.688a3.391 3.391 0 0 1 6.094 0l2.328 4.688c.031.086.11.148.203.156l5.187.75a3.42 3.42 0 0 1 2.711 2.324 3.43 3.43 0 0 1-.836 3.473l-3.75 3.656a.28.28 0 0 0 0 .25z" />
    <path fill="currentColor" d="M50 70.438a5 5 0 0 1-2.781-.844L30.797 58.656v7.485c0 .629.316 1.214.844 1.562l17.312 11.531a1.83 1.83 0 0 0 2.093 0l17.312-11.53a1.87 1.87 0 0 0 .844-1.563v-7.5L52.78 69.579c-.82.554-1.789.855-2.781.859z" />
    <path fill="currentColor" d="M68.656 47.422a1.06 1.06 0 0 0-1.062 0l-14.812 9.922a4.95 4.95 0 0 1-5.563 0l-14.812-9.875a1.04 1.04 0 0 0-1.027-.02 1.02 1.02 0 0 0-.535.88v6.562L49 67a1.89 1.89 0 0 0 2.093 0L69.25 54.89v-6.562a1.05 1.05 0 0 0-.593-.906zM60.531 28.125a.23.23 0 0 0-.219-.187c-7.984-1.157-6.5-.11-10.062-7.313-.047-.094-.144-.152-.25-.152s-.203.058-.25.152c-3.562 7.25-2.11 6.156-10.062 7.313a.29.29 0 0 0-.218.187.28.28 0 0 0 .062.281l3.766 3.656a3.42 3.42 0 0 1 .968 3.016l-.89 5.156a.33.33 0 0 0 .11.281.29.29 0 0 0 .296 0l4.687-2.437a3.33 3.33 0 0 1 3.125 0l4.688 2.437a.29.29 0 0 0 .297 0 .33.33 0 0 0 .11-.28l-.891-5.157a3.39 3.39 0 0 1 .984-3.016l3.75-3.656a.234.234 0 0 0 0-.281z" />
  </svg>
);

const SPONSORS = ["SaltoUruguayServer", "Alexitoo.DEV"];

export const LogoWithSponsorsReveal = () => {
  const logoGroupRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const sponsorRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const icons = iconRefs.current.filter(Boolean);
    const sponsors = sponsorRefs.current.filter(Boolean);

    const tl = gsap.timeline();

    // Phase 1 — Logo Entrance
    tl.fromTo(icons,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 1.0, stagger: 0.15, ease: "power2.out" }
    );

    // Phase 2 — Hold
    tl.to({}, { duration: 1.0 });

    // Phase 3a — Scale down whole group (keeps centered)
    tl.to(
      logoGroupRef.current,
      {
        scale: 0.7,
        duration: 1.0,
        ease: "power3.inOut",
      },
      "+=0",
    );

    tl.call(() => {
      playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SWOOSH, volume: 0.5 });
    }, null, "-=0.8");

    // Phase 3b — Fade in sponsors (already in the group, just ensure visible)
    tl.from(
      sponsors,
      {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
      },
      "-=0.6",
    );

    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, []);

  return (
    <div class="fixed inset-0 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black z-[10001]">
      <div
        ref={logoGroupRef}
        class="flex flex-col items-center"
        style={{ transformOrigin: "center" }}
      >
        <div class="flex items-center gap-4 sm:gap-8 md:gap-12 lg:gap-16 mb-8 sm:mb-12 md:mb-16 icons-row">
          <div ref={(el) => { iconRefs.current[0] = el; }} class="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 opacity-0">
            <CatEyeIcon />
          </div>
          <div ref={(el) => { iconRefs.current[1] = el; }} class="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 opacity-0">
            <StreamerIcon />
          </div>
          <div ref={(el) => { iconRefs.current[2] = el; }} class="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 opacity-0">
            <MedalIcon />
          </div>
        </div>

        <div class="flex items-center gap-4 sm:gap-6 md:gap-8 flex-wrap justify-center px-4 sponsors-row">
          {SPONSORS.map((name, i) => (
            <Fragment key={name}>
              <div
                ref={(el) => { sponsorRefs.current[i * 2] = el; }}
                class="flex items-center text-sm sm:text-base md:text-xl font-semibold text-white/80 tracking-wider"
              >
                {name}
              </div>
              {i < SPONSORS.length - 1 && (
                <span
                  ref={(el) => { sponsorRefs.current[i * 2 + 1] = el; }}
                  class="font-atomic leading-none flex items-center text-white/80"
                >x</span>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};