import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";

interface DalgonaProps {
    session: Session;
    pusher: Pusher;
}

interface Point {
    x: number;
    y: number;
}

export const Dalgona = ({ session, pusher }: DalgonaProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(2);
    const [isTracing, setIsTracing] = useState(false);
    const [tracePoints, setTracePoints] = useState<Point[]>([]);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Subscribe to streamer-wars channel
    useEffect(() => {
        if (!session.user?.id || !pusher) return;

        const channel = pusher.subscribe('streamer-wars');

        // Listen for game start event
        channel.bind('dalgona:start', (data: { userId: number; imageUrl: string; attemptsLeft: number }) => {
            if (data.userId === session.user.id) {
                setImageUrl(data.imageUrl);
                setAttemptsLeft(data.attemptsLeft);
                setGameStatus('playing');
                setTracePoints([]);
                toast.info('¡Traza la forma con cuidado!', { position: 'bottom-center' });
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
                setTracePoints([]);
                toast.error(`Intento fallido. Intentos restantes: ${data.attemptsLeft}`, {
                    position: 'bottom-center',
                });
            }
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
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

    // Draw on canvas
    useEffect(() => {
        if (!canvasRef.current || !imageRef.current || !imageUrl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imageRef.current;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // Draw trace points
    useEffect(() => {
        if (!canvasRef.current || tracePoints.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Redraw image first
        if (imageRef.current) {
            ctx.drawImage(imageRef.current, 0, 0);
        }

        // Draw trace
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        tracePoints.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    }, [tracePoints]);

    const handleMouseDown = (e: MouseEvent) => {
        if (gameStatus !== 'playing' || isSubmitting) return;
        setIsTracing(true);
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setTracePoints([{ x, y }]);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isTracing || gameStatus !== 'playing' || isSubmitting) return;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setTracePoints(prev => [...prev, { x, y }]);
    };

    const handleMouseUp = () => {
        if (!isTracing) return;
        setIsTracing(false);
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (gameStatus !== 'playing' || isSubmitting) return;
        e.preventDefault();
        setIsTracing(true);
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setTracePoints([{ x, y }]);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isTracing || gameStatus !== 'playing' || isSubmitting) return;
        e.preventDefault();
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setTracePoints(prev => [...prev, { x, y }]);
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (!isTracing) return;
        e.preventDefault();
        setIsTracing(false);
    };

    const submitTrace = async () => {
        if (tracePoints.length === 0) {
            toast.error('Debes trazar algo antes de enviar', { position: 'bottom-center' });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/dalgona?action=submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    traceData: {
                        points: tracePoints,
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
            console.error('Error submitting trace:', error);
            toast.error('Error al enviar el trazado', { position: 'bottom-center' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearTrace = () => {
        setTracePoints([]);
        if (canvasRef.current && imageRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.drawImage(imageRef.current, 0, 0);
            }
        }
    };

    if (showInstructions) {
        return (
            <Instructions duration={12000}>
                <p className="font-mono max-w-2xl text-left">
                    Traza cuidadosamente la forma que aparece en la galleta. Debes seguir el contorno con precisión,
                    manteniendo el tamaño y la posición correctos.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    Tendrás intentos limitados para completar el desafío.
                    Si fallas todos los intentos, serás eliminado del juego.
                </p>
                <p className="font-mono max-w-2xl text-left text-yellow-300">
                    💡 Consejo: Mantén presionado el mouse/botón y traza lentamente para mayor precisión.
                </p>
            </Instructions>
        )
    }

    if (gameStatus === 'waiting') {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                    <h2 className="text-3xl font-squids mb-4 bg-gradient-to-br from-orange-600 to-yellow-200 text-transparent bg-clip-text">Dalgona</h2>
                    <p className="text-xl">Esperando que el juego comience...</p>
                </div>
            </div>
        );
    }

    if (gameStatus === 'completed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-green-950">
                <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">¡Completado! ✓</h2>
                    <p className="text-xl">Has superado el desafío Dalgona</p>
                </div>
            </div>
        );
    }

    if (gameStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-900 to-red-950">
                <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Eliminado ✗</h2>
                    <p className="text-xl">No lograste completar el desafío</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative">
            <h2 className="text-2xl font-squids mb-4 bg-gradient-to-br from-orange-600 to-yellow-200 text-transparent bg-clip-text">Dalgona</h2>
            <div className="text-center text-white mb-6">
                <p className="text-xl mb-2">Traza la forma con cuidado</p>
                <p className="text-lg">
                    Intentos restantes: <span className="font-bold text-yellow-300">{attemptsLeft}</span>
                </p>
            </div>

            <div className="relative bg-white w-max mx-auto mb-6">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="cursor-crosshair touch-none max-w-full h-auto"
                    style={{ touchAction: 'none' }}
                />
                <img ref={imageRef} style={{ display: 'none' }} alt="Dalgona cookie" />
            </div>

            <div className="flex gap-4 absolute top-4 right-4 transform">
                <RetroButton
                    onClick={submitTrace}
                    disabled={isSubmitting || tracePoints.length === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar'}
                </RetroButton>
            </div>
        </div>
    );
};
