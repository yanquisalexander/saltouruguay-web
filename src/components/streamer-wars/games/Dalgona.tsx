import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { PUSHER_EVENTS_DALGONA } from "@/consts/pusher";

const DAMAGE_THROTTLE_MS = 500;
const SHAPE_BRIGHTNESS_THRESHOLD = 170;
const BRUSH_SIZE = 8;

interface DalgonaProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
}

// ---------------------------------------------------------------------------
// Estilos CSS inyectados
// ---------------------------------------------------------------------------

const customStyles = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80% { transform: translateX(8px); }
}
.animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
.dalgona-container-shaking {
    box-shadow: inset 0 0 60px rgba(217,119,6,.8), 0 0 30px rgba(217,119,6,.5) !important;
    border-color: rgb(217,119,6) !important;
}
.bg-stripes-amber-black {
    background-image: linear-gradient(135deg, #451a03 25%, #000 25%, #000 50%, #451a03 50%, #451a03 75%, #000 75%, #000 100%);
    background-size: 28.28px 28.28px;
}`;

// ---------------------------------------------------------------------------
// Subcomponentes (fuera de Dalgona para evitar remounts)
// ---------------------------------------------------------------------------

const BaseContainer = ({ isShaking, children }: { isShaking: boolean; children: preact.ComponentChildren }) => (
    <div className={`w-full h-full text-white overflow-hidden relative flex flex-col
        bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-amber-800/50 via-amber-950 to-neutral-950
        border-4 border-amber-700/60 shadow-[inset_0_0_30px_rgba(180,83,9,0.3)]
        transition-all duration-200
        ${isShaking ? 'animate-shake dalgona-container-shaking' : ''}`}>
        <style>{customStyles}</style>
        <div className="absolute top-0 left-0 w-full h-3 bg-stripes-amber-black opacity-30 z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-3 bg-stripes-amber-black opacity-30 z-0 pointer-events-none" />
        {children}
    </div>
);

const StatusScreen = ({ status }: { status: 'waiting' | 'completed' | 'failed' }) => {
    if (status === 'waiting') return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center z-20 relative">
            <h2 className="text-xl md:text-2xl font-bold mb-3 font-squids animate-pulse text-amber-400 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]">ESPERANDO...</h2>
            <div className="text-5xl md:text-6xl mb-6 drop-shadow-lg">🍪</div>
            <p className="text-gray-300 font-mono">El juego comenzará pronto</p>
        </div>
    );
    if (status === 'completed') return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-green-900/30 z-20 relative backdrop-blur-xs">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-green-400 font-squids drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">¡EXITO!</h2>
            <div className="text-6xl md:text-7xl mb-3 drop-shadow-lg">✅</div>
            <p className="text-base md:text-lg font-mono text-green-200">Has superado el desafío Dalgona</p>
        </div>
    );
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-red-950/50 z-20 relative backdrop-blur-xs">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-red-500 font-squids drop-shadow-[0_0_20px_rgba(239,68,68,1)]">ELIMINADO</h2>
            <div className="text-6xl md:text-7xl mb-3 drop-shadow-lg">💀</div>
            <p className="text-base md:text-lg font-mono text-red-300">No completaste el desafío</p>
        </div>
    );
};

const DalgonaHeader = ({ lives, percentageRemoved }: { lives: number; percentageRemoved: number }) => (
    <div className="flex-none px-3 py-2 w-full bg-neutral-900/80 border-b-2 border-amber-700/50 z-10 flex justify-between items-center backdrop-blur-md shadow-lg relative">
        <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-amber-400/80 font-mono uppercase tracking-widest">Vidas</span>
            <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={`text-base md:text-lg ${i >= lives ? 'opacity-20 grayscale' : ''}`}>❤️</span>
                ))}
            </div>
        </div>
        <h2 className="text-lg md:text-2xl font-bold font-squids tracking-[0.2em] drop-shadow-[0_0_10px_rgba(217,119,6,0.8)] text-amber-400">
            DALGONA
        </h2>
        <div className="text-right">
            <p className="text-[10px] md:text-xs text-amber-400/80 font-mono uppercase tracking-widest">Progreso</p>
            <p className="text-base md:text-lg font-bold font-squids text-amber-300">{percentageRemoved.toFixed(1)}%</p>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const Dalgona = ({ session, pusher, channel }: DalgonaProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [lives, setLives] = useState(3);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [showInstructions, setShowInstructions] = useState(true);
    const [pixelsRemoved, setPixelsRemoved] = useState(0);
    const [totalRemovablePixels, setTotalRemovablePixels] = useState(0);
    const [cracks, setCracks] = useState<Array<{ x: number; y: number; rotation: number }>>([]);
    const [isShaking, setIsShaking] = useState(false);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [canvasDisplayRect, setCanvasDisplayRect] = useState<DOMRect | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const shapeCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const isCarving = useRef(false);
    const lastDamageTime = useRef(0);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    }, []);

    // Fetch initial game state
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const response = await fetch('/api/dalgona?action=player-state');
                const result = await response.json();
                if (result.success && result.gameStatus === 'active' && result.playerState) {
                    setImageUrl(result.playerState.imageUrl);
                    setLives(result.playerState.lives);
                    setGameStatus(result.playerState.status === 'completed' ? 'completed' :
                        result.playerState.status === 'failed' ? 'failed' : 'playing');
                }
            } catch (error) {
                console.error('Error fetching initial game state:', error);
            }
        };
        if (session.user?.id) fetchInitialState();
    }, [session.user?.id]);

    // Subscribe to Pusher events
    useEffect(() => {
        if (!session.user?.id || !pusher) return;

        channel.bind(PUSHER_EVENTS_DALGONA.START, (data: { userId: number; imageUrl: string; lives: number }) => {
            if (data.userId === session.user.id) {
                setImageUrl(data.imageUrl);
                setLives(data.lives);
                setGameStatus('playing');
                setPixelsRemoved(0);
                setCracks([]);
                setShowInstructions(false);
                toast.info('¡Talla la galleta con cuidado!', { position: 'bottom-center' });
            }
        });

        channel.bind(PUSHER_EVENTS_DALGONA.GAME_STARTED, () => {
            if (gameStatus === 'waiting') {
                setImageUrl(null);
                setLives(3);
                setGameStatus('waiting');
                setPixelsRemoved(0);
                setCracks([]);
            }
        });

        channel.bind(PUSHER_EVENTS_DALGONA.SUCCESS, (data: { userId: number }) => {
            if (data.userId === session.user.id) {
                setGameStatus('completed');
                toast.success('¡Has completado el desafío Dalgona!', { position: 'bottom-center', duration: 5000 });
            }
        });

        channel.bind(PUSHER_EVENTS_DALGONA.DAMAGE, (data: { userId: number; lives: number }) => {
            if (data.userId === session.user.id) {
                setLives(data.lives);
                toast.error(`¡Cuidado! Vidas restantes: ${data.lives}`, { position: 'bottom-center' });
            }
        });

        channel.bind(PUSHER_EVENTS_DALGONA.GAME_ENDED, (data: { completedPlayers: number[], eliminatedPlayers: number[] }) => {
            if (data.eliminatedPlayers.includes(session.user.streamerWarsPlayerNumber!)) {
                setGameStatus('failed');
                toast.error('Has sido eliminado del juego', { position: 'bottom-center', duration: 5000 });
            }
        });

        return () => {
            channel.unbind(PUSHER_EVENTS_DALGONA.START);
            channel.unbind(PUSHER_EVENTS_DALGONA.GAME_STARTED);
            channel.unbind(PUSHER_EVENTS_DALGONA.SUCCESS);
            channel.unbind(PUSHER_EVENTS_DALGONA.DAMAGE);
            channel.unbind(PUSHER_EVENTS_DALGONA.GAME_ENDED);
        };
    }, [session.user?.id, pusher, gameStatus]);

    // Listen for instructions ended event
    useEffect(() => {
        const handleInstructionsEnded = () => setShowInstructions(false);
        document.addEventListener('instructions-ended', handleInstructionsEnded);
        return () => document.removeEventListener('instructions-ended', handleInstructionsEnded);
    }, []);

    // Initialize canvas layers when image loads
    useEffect(() => {
        if (!canvasRef.current || !maskCanvasRef.current || !shapeCanvasRef.current || !imageUrl) return;

        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const shapeCanvas = shapeCanvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const shapeCtx = shapeCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || !maskCtx || !shapeCtx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            shapeCanvas.width = img.width;
            shapeCanvas.height = img.height;

            // Draw the actual SVG image onto the canvas (this renders shape + cookie)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Create mask - full cookie color base
            maskCtx.fillStyle = '#D2691E';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

            // Process all pixels synchronously (fast enough for 400x400 SVG)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let removableCount = 0;

            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                if (a < 10) continue;
                const brightness = (r + g + b) / 3;
                if (brightness < SHAPE_BRIGHTNESS_THRESHOLD) {
                    const x = (i / 4) % canvas.width;
                    const y = Math.floor((i / 4) / canvas.width);
                    maskCtx.clearRect(x, y, 1, 1);
                    shapeCtx.fillStyle = '#FF0000';
                    shapeCtx.fillRect(x, y, 1, 1);
                } else {
                    removableCount++;
                }
            }

            setTotalRemovablePixels(removableCount);
            // Re-draw SVG on canvas for clean visual (mask will be applied on carve)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            imageRef.current = img;
        };
        imageRef.current = img;
        img.src = imageUrl;
    }, [imageUrl]);

    const handleDamage = async (x: number, y: number) => {
        const now = Date.now();
        if (now - lastDamageTime.current < DAMAGE_THROTTLE_MS) return;
        lastDamageTime.current = now;

        setCracks(prev => [...prev, { x, y, rotation: Math.random() * 360 }]);
        triggerShake();

        playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.5 }).catch(() => {});

        try {
            const response = await fetch('/api/dalgona?action=damage', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const result = await response.json();
            if (result.success) {
                setLives(result.lives);
                if (result.eliminated) setGameStatus('failed');
            }
        } catch (error) {
            console.error('Error reporting damage:', error);
        }
    };

    const carvePixel = (clientX: number, clientY: number) => {
        if (!canvasRef.current || !maskCanvasRef.current || !shapeCanvasRef.current) return;

        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const shapeCanvas = shapeCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const shapeCtx = shapeCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || !maskCtx || !shapeCtx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const halfBrush = BRUSH_SIZE / 2;

        // Check if carving hits the shape
        const shapeData = shapeCtx.getImageData(
            Math.max(0, Math.floor(canvasX - halfBrush)),
            Math.max(0, Math.floor(canvasY - halfBrush)),
            BRUSH_SIZE, BRUSH_SIZE
        );

        let hitShape = false;
        for (let i = 3; i < shapeData.data.length; i += 4) {
            if (shapeData.data[i] > 0) { hitShape = true; break; }
        }

        if (hitShape) {
            handleDamage(canvasX, canvasY);
        } else {
            const maskData = maskCtx.getImageData(
                Math.max(0, Math.floor(canvasX - halfBrush)),
                Math.max(0, Math.floor(canvasY - halfBrush)),
                BRUSH_SIZE, BRUSH_SIZE
            );

            let removedCount = 0;
            for (let i = 3; i < maskData.data.length; i += 4) {
                if (maskData.data[i] > 0) removedCount++;
            }

            if (removedCount > 0) {
                maskCtx.globalCompositeOperation = 'destination-out';
                maskCtx.beginPath();
                maskCtx.arc(canvasX, canvasY, halfBrush, 0, Math.PI * 2);
                maskCtx.fill();
                maskCtx.globalCompositeOperation = 'source-over';
                setPixelsRemoved(prev => prev + removedCount);
                redrawCanvas();
            }
        }
    };

    const redrawCanvas = () => {
        if (!canvasRef.current || !maskCanvasRef.current || !imageRef.current) return;
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imageRef.current, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';

        cracks.forEach(crack => {
            ctx.save();
            ctx.translate(crack.x, crack.y);
            ctx.rotate((crack.rotation * Math.PI) / 180);
            ctx.fillStyle = '#4A0000';
            ctx.fillRect(-10, -2, 20, 4);
            ctx.fillRect(-2, -10, 4, 20);
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(-8, -1, 16, 2);
            ctx.fillRect(-1, -8, 2, 16);
            ctx.fillRect(-8, -8, 3, 3);
            ctx.fillRect(5, -8, 3, 3);
            ctx.fillRect(-8, 5, 3, 3);
            ctx.fillRect(5, 5, 3, 3);
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(-9, -1, 2, 2);
            ctx.fillRect(-1, -9, 2, 2);
            ctx.restore();
        });
    };

    useEffect(() => { redrawCanvas(); }, [cracks]);

    const updateCursorPos = useCallback((e: MouseEvent) => {
        if (!canvasRef.current || !canvasContainerRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasDisplayRect(rect);
        setCursorPos({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
    }, []);

    const handleMouseDown = (e: MouseEvent) => {
        if (gameStatus !== 'playing') return;
        isCarving.current = true;
        carvePixel(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
        updateCursorPos(e);
        if (!isCarving.current || gameStatus !== 'playing') return;
        carvePixel(e.clientX, e.clientY);
    };

    const handleMouseUp = () => { isCarving.current = false; };
    const handleMouseLeave = () => { isCarving.current = false; setCursorPos(null); };
    const handleMouseEnter = (e: MouseEvent) => updateCursorPos(e);

    const handleTouchStart = (e: TouchEvent) => {
        if (gameStatus !== 'playing') return;
        e.preventDefault();
        isCarving.current = true;
        const touch = e.touches[0];
        carvePixel(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isCarving.current || gameStatus !== 'playing') return;
        e.preventDefault();
        const touch = e.touches[0];
        carvePixel(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); isCarving.current = false; };

    const submitCompletion = async () => {
        const percentageRemoved = totalRemovablePixels > 0 ? (pixelsRemoved / totalRemovablePixels) * 100 : 0;
        if (percentageRemoved < 95) {
            toast.error(`Necesitas remover al menos el 95% (actual: ${percentageRemoved.toFixed(1)}%)`, { position: 'bottom-center' });
            return;
        }
        try {
            const response = await fetch('/api/dalgona?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    traceData: { pixelsRemoved, totalRemovablePixels, percentageRemoved, timestamp: Date.now() },
                }),
            });
            const result = await response.json();
            if (result.success) {
                setGameStatus('completed');
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
            } else if (result.eliminated) {
                setGameStatus('failed');
            }
        } catch (error) {
            console.error('Error submitting completion:', error);
            toast.error('Error al enviar la completación', { position: 'bottom-center' });
        }
    };

    // ------ Render ------

    const percentageRemoved = totalRemovablePixels > 0 ? (pixelsRemoved / totalRemovablePixels) * 100 : 0;

    if (showInstructions && gameStatus === 'waiting') {
        return (
            <Instructions duration={import.meta.env.DEV ? 5000 : 12000}>
                <p className="font-mono text-base font-bold">🍪 DALGONA - Tallado de Píxeles</p>
                <p className="font-mono text-sm">Talla cuidadosamente la galleta removiendo todo el material alrededor de la figura central. Mantén presionado el mouse/dedo y arrastra para raspar píxel por píxel.</p>
                <p className="font-mono text-sm">⚠️ <strong>¡CUIDADO!</strong> Si tocas la figura central (área oscura), perderás una vida. Tienes 3 vidas en total. Al perder todas, serás eliminado.</p>
                <p className="font-mono text-sm">🎯 <strong>Objetivo:</strong> Remover al menos el 95% del material removible sin romper la figura.</p>
                <p className="font-mono text-sm text-yellow-300">💡 Consejo: Trabaja desde los bordes hacia el centro. Muévete lentamente cerca de la figura.</p>
            </Instructions>
        );
    }

    if (gameStatus !== 'playing') {
        return (
            <BaseContainer isShaking={isShaking}>
                {showInstructions && gameStatus === 'waiting' && (
                    <Instructions duration={import.meta.env.DEV ? 5000 : 12000}>
                        <p className="font-mono text-base font-bold">🍪 DALGONA - Tallado de Píxeles</p>
                        <p className="font-mono text-sm">Talla cuidadosamente la galleta removiendo todo el material alrededor de la figura central.</p>
                        <p className="font-mono text-sm">⚠️ <strong>¡CUIDADO!</strong> Si tocas la figura central perderás una vida. Tienes 3 vidas.</p>
                        <p className="font-mono text-sm">🎯 Remover al menos el 95% sin romper la figura.</p>
                    </Instructions>
                )}
                <StatusScreen status={gameStatus} />
            </BaseContainer>
        );
    }

    // Calculate cursor display size
    const cursorRadius = canvasDisplayRect && canvasRef.current
        ? (BRUSH_SIZE / 2) * (canvasDisplayRect.width / canvasRef.current.width) * 2
        : 0;

    return (
        <BaseContainer isShaking={isShaking}>
            <DalgonaHeader lives={lives} percentageRemoved={percentageRemoved} />
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-3 md:p-4 z-10">
                {/* Canvas container */}
                <div
                    ref={canvasContainerRef}
                    className="relative bg-amber-900 border-4 border-amber-700/60 shadow-2xl"
                    style={{ imageRendering: 'pixelated' }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={handleMouseEnter}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="touch-none max-w-full h-auto block"
                        style={{ touchAction: 'none', imageRendering: 'pixelated', cursor: 'none' }}
                    />
                    <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
                    <canvas ref={shapeCanvasRef} style={{ display: 'none' }} />

                    {/* Custom cursor overlay */}
                    {cursorPos && cursorRadius > 0 && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                left: cursorPos.x - cursorRadius,
                                top: cursorPos.y - cursorRadius,
                                width: cursorRadius * 2,
                                height: cursorRadius * 2,
                            }}
                        >
                            <div className="w-full h-full rounded-full border-2 border-amber-400/80 bg-amber-400/10" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-0.5 bg-amber-400 rounded-full" />
                        </div>
                    )}
                </div>

                {/* Submit button */}
                {percentageRemoved >= 95 && (
                    <div className="mt-4 animate-pulse">
                        <RetroButton
                            onClick={submitCompletion}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm border-4 border-green-400 font-press-start-2p"
                        >
                            ¡COMPLETAR!
                        </RetroButton>
                    </div>
                )}
            </div>
        </BaseContainer>
    );
};
