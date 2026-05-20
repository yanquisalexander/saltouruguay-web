import type { Session } from "@auth/core/types";
import { navigate } from "astro:transitions/client";
import { useEffect, useRef, useState } from "preact/hooks";
import * as THREE from "three";

export const PlayerEliminated = ({ playerNumber, session }: { playerNumber: number | number[] | null, session: Session | null }) => {
    const [showing, setShowing] = useState(false);
    const [key, setKey] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const disposeRef = useRef<(() => void) | null>(null);

    const startExplosion = () => {
        if (!canvasRef.current) return;
        disposeRef.current?.();

        const W = window.innerWidth, H = window.innerHeight;
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
        camera.position.z = 8;

        const COUNT = 600;
        const positions = new Float32Array(COUNT * 3);
        const velocities = new Float32Array(COUNT * 3);
        const colors = new Float32Array(COUNT * 3);
        const palette = [0xcc0000, 0x8b0000, 0xff0000, 0xb30000, 0x990000].map(c => new THREE.Color(c));

        for (let i = 0; i < COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const speed = 0.04 + Math.random() * 0.12;
            velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed * 1.4;
            velocities[i * 3 + 2] = Math.cos(phi) * speed * 0.2;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true });
        scene.add(new THREE.Points(geo, mat));

        let frame = 0, rafId: number;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            frame++;
            const pos = geo.attributes.position.array as Float32Array;
            for (let i = 0; i < COUNT; i++) {
                pos[i * 3] += velocities[i * 3];
                pos[i * 3 + 1] += velocities[i * 3 + 1];
                pos[i * 3 + 2] += velocities[i * 3 + 2];
                velocities[i * 3 + 1] -= 0.0018; // gravedad
                velocities[i * 3] *= 0.99;   // fricción
                velocities[i * 3 + 2] *= 0.99;
            }
            geo.attributes.position.needsUpdate = true;
            mat.opacity = Math.max(0, 1 - frame / 160);
            renderer.render(scene, camera);
            if (frame > 200) cancelAnimationFrame(rafId);
        };
        rafId = requestAnimationFrame(animate);

        disposeRef.current = () => {
            cancelAnimationFrame(rafId);
            geo.dispose(); mat.dispose(); renderer.dispose();
        };
    };

    useEffect(() => {
        if (playerNumber !== null) {
            setShowing(true);
            setKey(Math.random());
            // rAF para esperar a que el canvas esté pintado
            requestAnimationFrame(startExplosion);

            if (!Array.isArray(playerNumber) && playerNumber === session?.user.streamerWarsPlayerNumber) {
                setTimeout(() => navigate('/guerra-streamers'), 2000);
                return;
            } else if (Array.isArray(playerNumber) && playerNumber.includes(session?.user.streamerWarsPlayerNumber!)) {
                setTimeout(() => navigate('/guerra-streamers'), 2000);
                return;
            }

            setTimeout(() => setShowing(false), Array.isArray(playerNumber) ? 10000 : 5000);
        }
    }, [playerNumber]);

    useEffect(() => () => { disposeRef.current?.(); }, []);

    return (
        <>
            {/* Canvas fuera del div con key para que no se destruya en cada activación */}
            <canvas
                ref={canvasRef}
                class={`z-[6500] fixed inset-0 w-full h-full pointer-events-none ${showing ? '' : 'hidden'}`}
            />
            <div
                key={key}
                class={`z-[6500] fixed inset-0 bottom-0 left-0 right-0 min-h-screen w-full bg-black/80 p-4 flex items-center justify-center transition animate-duration-[2500ms] ${showing ? "animate-fade-in" : "animate-fade-out pointer-events-none"}`}>
                <div class="relative z-10 text-white p-4 rounded-lg">
                    <span
                        class="relative flex flex-col justify-center text-center animate-duration-[4000ms] animate-scale">
                        <span class="font-squids text-lg text-center mb-8 font-bold text-neutral-400">
                            Gracias por participar
                        </span>
                        <div class="relative">
                            <h2 class="text-6xl font-bold font-atomic text-red-500 -rotate-6 skew-x-12">
                                Eliminado{Array.isArray(playerNumber) ? 's' : ''}
                            </h2>
                            <span class="absolute -bottom-14 text-red-500 inset-x-0 text-7xl font-bold font-atomic-extras -rotate-6 skew-x-12">
                                a
                            </span>
                        </div>
                        <p class={`text-3xl font-teko pt-16 mx-auto text-center text-white ${Array.isArray(playerNumber) ? 'max-w-[90%]' : ''}`}>
                            {Array.isArray(playerNumber)
                                ? playerNumber.includes(session?.user.streamerWarsPlayerNumber!)
                                    ? "¡Has sido eliminado!"
                                    : `Los jugadores ${new Intl.ListFormat("es-ES").format(
                                        playerNumber.map((n: number) => `#${n.toString().padStart(3, "0")}`)
                                    )} han sido eliminados`
                                : playerNumber === session?.user.streamerWarsPlayerNumber
                                    ? "¡Has sido eliminado!"
                                    : `El jugador #${playerNumber?.toString().padStart(3, "0")} ha sido eliminado`
                            }
                        </p>
                    </span>
                </div>
                <h2 className="text-2xl fixed bottom-16 font-atomic text-neutral-500 select-none -skew-y-6">
                    <span className="tracking-wider">Guerra de Streamers</span>
                </h2>
                <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                    &#x0055;
                </span>
                <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                    &#x0050;
                </span>
            </div>
        </>
    );
}