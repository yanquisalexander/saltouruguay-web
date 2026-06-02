import * as THREE from "three";
import { useEffect, useRef, useState } from "preact/hooks";
import pusherClient from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "@/consts/pusher";
import { CINEMATIC_3D_REGISTRY } from "./3d-cinematics";

export const Inmersive3dCinematic = ({ playerNumber }: { playerNumber?: number | null }) => {
  const [cinematicId, setCinematicId] = useState<string | null>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playerNumber) return;
    const channel = pusherClient.subscribe(PUSHER_CHANNELS.GLOBAL);
    const handler = (data: { id: string }) => {
      setCinematicId(data.id);
      setFadingOut(false);
    };
    channel.bind(PUSHER_EVENTS.INMERSIVE_3D_CINEMATIC, handler);
    return () => {
      channel.unbind(PUSHER_EVENTS.INMERSIVE_3D_CINEMATIC, handler);
    };
  }, [playerNumber]);

  useEffect(() => {
    if (!cinematicId || !canvasRef.current || !overlayRef.current || !numberRef.current || !playerNumber) return;

    const definition = CINEMATIC_3D_REGISTRY[cinematicId];
    if (!definition) {
      console.warn(`Cinemática 3D no encontrada: ${cinematicId}`);
      setCinematicId(null);
      return;
    }

    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 3.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 80);

    const htmlRefs = {
      overlayEl: overlayRef.current,
      numberEl: numberRef.current,
      canvas,
      subtitleEl: subtitleRef.current,
    };

    // Apply initial canvas blur
    canvas.style.filter = "blur(10px)";

    const { state, timeline } = definition.setup(scene, camera, renderer, htmlRefs, playerNumber);

    const clock = new THREE.Clock();
    let rafId: number;
    let time = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;
      definition.animate(dt, time, state, scene, camera);
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);
    state._rafId = rafId;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    timeline.eventCallback("onComplete", () => {
      document.dispatchEvent(new CustomEvent("inmersive-3d-cinematic-ended", { detail: { id: cinematicId } }));
      setFadingOut(true);
      setTimeout(() => {
        setCinematicId(null);
        setFadingOut(false);
      }, 1000);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      definition.cleanup(state);
    };
  }, [cinematicId, playerNumber]);

  if (!cinematicId || !playerNumber) return null;

  return (
    <div
      class="fixed inset-0 z-9500"
      style={`opacity:${fadingOut ? 0 : 1};transition:opacity 0.8s ease-out;pointer-events:none`}
    >
      <canvas
        ref={canvasRef}
        class="fixed inset-0 z-9500 w-full h-full"
        style="display:block"
      />
      <div
        ref={overlayRef}
        class="fixed inset-0 z-9600 bg-black pointer-events-none"
        style="opacity:1"
      />
      <div
        class="fixed inset-0 z-9550 pointer-events-none"
        style="background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.82) 100%)"
      />
      <div
        class="fixed inset-0 z-9560 pointer-events-none opacity-20"
        style="background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)"
      />
      <div
        class="fixed inset-0 z-9555 pointer-events-none opacity-[0.04] grain-overlay"
      />
      <div
        ref={numberRef}
        class="fixed bottom-[55px] left-1/2 -translate-x-1/2 z-9700 pointer-events-none"
        style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:9px;color:rgba(255,60,60,0);text-transform:uppercase"
      />
      <div
        ref={subtitleRef}
        class="fixed bottom-48 left-1/2 -translate-x-1/2 z-9700 pointer-events-none font-mono text-center text-white text-lg bg-black/70 px-5 py-2.5 max-w-[65ch]"
        style="opacity:0"
      />
      <div
        class="fixed inset-0 z-9570 pointer-events-none"
        style="mix-blend-mode:screen;opacity:0;background:transparent"
      />
      <style>{`
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  );
};
