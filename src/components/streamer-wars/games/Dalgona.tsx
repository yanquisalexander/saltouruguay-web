import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";

interface DalgonaProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

export const Dalgona = ({ session, pusher, channel }: DalgonaProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [damageLevel, setDamageLevel] = useState(0); // 0, 1, or 2 (number of failures)

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const particlesRef = useRef<Particle[]>([]);

    // Fetch initial game state on component mount
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const response = await fetch('/api/dalgona?action=player-state');
                const result = await response.json();

                console.log('Dalgona fetchInitialState result:', result);

                if (result.success && result.gameStatus === 'active' && result.playerState) {
                    console.log('Setting player state:', result.playerState);
                    setImageUrl(result.playerState.imageUrl);
                    setAttemptsLeft(result.playerState.attemptsLeft);
                    setDamageLevel(3 - result.playerState.attemptsLeft);
                    setGameStatus(result.playerState.status === 'completed' ? 'completed' :
                        result.playerState.status === 'failed' ? 'failed' : 'playing');
                } else {
                    console.log('Not setting player state, conditions not met:', {
                        success: result.success,
                        gameStatus: result.gameStatus,
                        hasPlayerState: !!result.playerState
                    });
                }
            } catch (error) {
                console.error('Error fetching initial game state:', error);
            }
        };

        if (session.user?.id) {
            fetchInitialState();
        }
    }, [session.user?.id]);

    // Subscribe to streamer-wars channel
    useEffect(() => {
        if (!session.user?.id || !pusher) return;

        // Listen for game start event
        channel.bind('dalgona:start', (data: { userId: number; imageUrl: string; attemptsLeft: number }) => {
            console.log('Received dalgona:start event:', data);
            if (data.userId === session.user.id) {
                console.log('Setting game to playing state');
                setImageUrl(data.imageUrl);
                setAttemptsLeft(data.attemptsLeft);
                setDamageLevel(0);
                setGameStatus('playing');
                setParticles([]);
                toast.info('¡Cuidado con la galleta!', { position: 'bottom-center' });
            }
        });

        // Listen for game started event (broadcast to all)
        channel.bind('dalgona:game-started', (data: { totalPlayers: number }) => {
            console.log('Received dalgona:game-started event:', data);
            // Only reset if not already playing (to avoid resetting after individual start event)
            if (gameStatus === 'waiting') {
                console.log('Resetting to waiting state');
                setImageUrl(null);
                setAttemptsLeft(3);
                setDamageLevel(0);
                setGameStatus('waiting');
                setParticles([]);
                setIsSubmitting(false);
            }
        });

        // Listen for success event
        channel.bind('dalgona:success', (data: { userId: number }) => {
            if (data.userId === session.user.id) {
                setGameStatus('completed');
                toast.success('¡Has completado el desafío Dalgona!', {
                    position: 'bottom-center',
                    duration: 5000,
                });
            }
        });

        // Listen for attempt failed event
        channel.bind('dalgona:attempt-failed', (data: { userId: number; attemptsLeft: number }) => {
            if (data.userId === session.user.id) {
                setAttemptsLeft(data.attemptsLeft);
                setDamageLevel(3 - data.attemptsLeft);
                triggerCookieFragmentation();
                toast.error(`¡La galleta se rompió! Intentos restantes: ${data.attemptsLeft}`, {
                    position: 'bottom-center',
                });
            }
        });

        // Escucha el evento de fin del juego
        channel.bind('dalgona:game-ended', (data: { completedPlayers: number[], eliminatedPlayers: number[] }) => {
            if (data.eliminatedPlayers.includes(session.user.streamerWarsPlayerNumber!)) {
                setGameStatus('failed');
                toast.error('Has sido eliminado del juego', {
                    position: 'bottom-center',
                    duration: 5000,
                });
            }
        });

        return () => {
            channel.unbind('dalgona:start');
            channel.unbind('dalgona:game-started');
            channel.unbind('dalgona:success');
            channel.unbind('dalgona:attempt-failed');
            channel.unbind('dalgona:game-ended');
        };
    }, [session.user?.id, pusher]);

    // Listen for instructions ended event
    useEffect(() => {
        const handleInstructionsEnded = () => {
            setShowInstructions(false);
        };

        document.addEventListener('instructions-ended', handleInstructionsEnded);

        return () => {
            document.removeEventListener('instructions-ended', handleInstructionsEnded);
        };
    }, []);

    // Particle animation system
    useEffect(() => {
        if (particles.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const animate = () => {
            particlesRef.current = particlesRef.current.map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vy: p.vy + 0.5, // gravity
                life: p.life - 1
            })).filter(p => p.life > 0);

            setParticles([...particlesRef.current]);

            if (particlesRef.current.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [particles.length]);

    // Trigger cookie fragmentation animation
    const triggerCookieFragmentation = () => {
        const newParticles: Particle[] = [];
        const colors = ['#d4a574', '#a67c52', '#8b5a3c'];
        
        // Create particles around the center of the cookie
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            newParticles.push({
                x: 200, // center
                y: 200, // center
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 60,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        
        particlesRef.current = newParticles;
        setParticles(newParticles);
    };

    // Draw the cookie with damage effects
    useEffect(() => {
        if (!canvasRef.current || !imageRef.current || !imageUrl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imageRef.current;
        
        const drawCookie = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the base cookie
            ctx.drawImage(img, 0, 0);

            // Apply damage overlay based on damage level
            if (damageLevel > 0) {
                ctx.fillStyle = 'rgba(139, 90, 60, 0.3)';
                const numCracks = damageLevel * 5;
                for (let i = 0; i < numCracks; i++) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const width = 2 + Math.random() * 4;
                    const height = 10 + Math.random() * 20;
                    ctx.fillRect(x, y, width, height);
                }
            }

            // Draw particles
            particlesRef.current.forEach(particle => {
                ctx.fillStyle = particle.color;
                ctx.fillRect(particle.x - 4, particle.y - 4, 8, 8);
            });
        };
        
        if (img.complete) {
            drawCookie();
        } else {
            img.onload = drawCookie;
            img.src = imageUrl;
        }
    }, [imageUrl, damageLevel, particles]);

    const attemptRemovePixels = async () => {
        if (gameStatus !== 'playing' || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/dalgona?action=submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    traceData: {
                        // TODO: This is simplified for the pixel-removal mechanic.
                        // The server now uses random success based on shape difficulty.
                        // In the future, we might add more interactive mechanics here.
                        timestamp: Date.now(),
                    },
                }),
            });

            const result = await response.json();

            if (result.success) {
                setGameStatus('completed');
            } else if (result.eliminated) {
                setGameStatus('failed');
                toast.error('Has sido eliminado', {
                    position: 'bottom-center',
                    duration: 5000,
                });
            }
        } catch (error) {
            console.error('Error submitting attempt:', error);
            toast.error('Error al procesar intento', { position: 'bottom-center' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showInstructions) {
        return (
            <Instructions duration={12000}>
                <p className="font-mono max-w-2xl text-left">
                    Debes extraer cuidadosamente la forma de la galleta Dalgona sin romperla.
                    Haz clic en "Intentar" para probar tu suerte.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    Tienes 3 intentos (representados por corazones).
                    Si la galleta se rompe 3 veces, serás eliminado del juego.
                </p>
                <p className="font-mono max-w-2xl text-left text-yellow-300">
                    💡 Consejo: ¡Ten cuidado! Cada error hace que la galleta se fragmente más.
                </p>
            </Instructions>
        )
    }

    if (gameStatus === 'waiting') {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-b from-slate-900 to-slate-800">
                <div className="text-center text-white" style={{
                    fontFamily: "'Press Start 2P', monospace"
                }}>
                    <h2 className="text-3xl mb-6" style={{
                        color: '#d4a574',
                        textShadow: '4px 4px 0px #8b5a3c'
                    }}>
                        DALGONA
                    </h2>
                    <p className="text-sm">Esperando inicio...</p>
                </div>
            </div>
        );
    }

    if (gameStatus === 'completed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-green-950">
                <div className="text-center text-white" style={{
                    fontFamily: "'Press Start 2P', monospace"
                }}>
                    <h2 className="text-3xl mb-6" style={{
                        color: '#00ff00',
                        textShadow: '4px 4px 0px #006400'
                    }}>
                        COMPLETADO!
                    </h2>
                    <p className="text-base">Has superado el desafío Dalgona</p>
                </div>
            </div>
        );
    }

    if (gameStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-900 to-red-950">
                <div className="text-center text-white" style={{
                    fontFamily: "'Press Start 2P', monospace"
                }}>
                    <h2 className="text-3xl mb-6" style={{
                        color: '#ff0000',
                        textShadow: '4px 4px 0px #8b0000'
                    }}>
                        ELIMINADO
                    </h2>
                    <p className="text-base">No lograste completar el desafío</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative p-5 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
            {/* 8-bit styled title */}
            <h2 className="text-3xl font-squids mb-6 text-center retro" style={{ 
                fontFamily: "'Press Start 2P', monospace",
                color: '#d4a574',
                textShadow: '4px 4px 0px #8b5a3c'
            }}>
                DALGONA
            </h2>

            {/* Hearts display - 8-bit style */}
            <div className="flex gap-4 mb-6 justify-center">
                {[1, 2, 3].map((heart) => (
                    <div 
                        key={heart}
                        className="relative"
                        style={{
                            width: '32px',
                            height: '32px',
                            imageRendering: 'pixelated'
                        }}
                    >
                        {heart <= attemptsLeft ? (
                            // Full heart (8-bit pixel art style)
                            <div className="w-full h-full" style={{
                                background: `
                                    conic-gradient(from 0deg at 8px 8px, #ff0000 0deg, #ff0000 360deg),
                                    conic-gradient(from 0deg at 24px 8px, #ff0000 0deg, #ff0000 360deg)
                                `,
                                clipPath: 'polygon(0 25%, 50% 100%, 100% 25%, 100% 0, 75% 0, 50% 25%, 25% 0, 0 0)'
                            }}>
                                <svg viewBox="0 0 32 32" className="w-full h-full">
                                    <rect x="8" y="8" width="8" height="8" fill="#ff0000"/>
                                    <rect x="16" y="8" width="8" height="8" fill="#ff0000"/>
                                    <rect x="4" y="12" width="24" height="8" fill="#ff0000"/>
                                    <rect x="8" y="20" width="16" height="4" fill="#ff0000"/>
                                    <rect x="12" y="24" width="8" height="4" fill="#ff0000"/>
                                </svg>
                            </div>
                        ) : (
                            // Empty heart
                            <div className="w-full h-full opacity-30">
                                <svg viewBox="0 0 32 32" className="w-full h-full">
                                    <rect x="8" y="8" width="8" height="8" fill="#444"/>
                                    <rect x="16" y="8" width="8" height="8" fill="#444"/>
                                    <rect x="4" y="12" width="24" height="8" fill="#444"/>
                                    <rect x="8" y="20" width="16" height="4" fill="#444"/>
                                    <rect x="12" y="24" width="8" height="4" fill="#444"/>
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Cookie display with 8-bit border */}
            <div className="relative mb-6" style={{
                border: '4px solid #d4a574',
                boxShadow: '8px 8px 0px #8b5a3c',
                background: '#2d1810',
                padding: '8px',
                imageRendering: 'pixelated'
            }}>
                <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto"
                    style={{ 
                        imageRendering: 'pixelated'
                    } as React.CSSProperties}
                />
                <img ref={imageRef} style={{ display: 'none' }} alt="Dalgona cookie" />
            </div>

            {/* 8-bit styled button */}
            <RetroButton
                onClick={attemptRemovePixels}
                disabled={isSubmitting}
                className="px-8 py-4 text-lg"
                style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '14px'
                }}
            >
                {isSubmitting ? 'PROCESANDO...' : 'INTENTAR'}
            </RetroButton>
        </div>
    );
};
