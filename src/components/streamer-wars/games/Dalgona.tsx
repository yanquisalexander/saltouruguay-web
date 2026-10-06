import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";
import { PUSHER_EVENTS_DALGONA } from "@/consts/pusher";
import { SWGameShell } from "./_sw/SWGameShell";
import { SWStatusScreen } from "./_sw/SWStatusScreen";
import { SWHud } from "./_sw/SWHud";
import { useSWChannel } from "./_sw/swChannel";
import { swSound } from "./_sw/SWSounds";
import { swToast } from "../swToast";

const DAMAGE_THROTTLE_MS = 300;
const SHAPE_BRIGHTNESS_THRESHOLD = 160;
const BRUSH_SIZE = 6;
// La figura "quema" 2px más allá de su borde visible (zona de peligro)
const SHAPE_HIT_SIZE = BRUSH_SIZE + 4;
const MAX_LIVES = 2;
const REQUIRED_PCT = 97;

interface DalgonaProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
}

// ---------------------------------------------------------------------------
// UI migrada al Design System _sw. Canvas/crack logic intacta.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const Dalgona = ({ session, pusher, channel }: DalgonaProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [lives, setLives] = useState(MAX_LIVES);
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

    const gameStatusRef = useRef(gameStatus);
    gameStatusRef.current = gameStatus;

    // Pusher vía hook único (sin dep gameStatus que resuscribía)
    useSWChannel(channel, {
        [PUSHER_EVENTS_DALGONA.START]: (data: { userId: number; imageUrl: string; lives: number }) => {
            if (data.userId === session.user.id) {
                setImageUrl(data.imageUrl);
                setLives(data.lives);
                setGameStatus('playing');
                setPixelsRemoved(0);
                setCracks([]);
                setShowInstructions(false);
                swToast.info('Talla la galleta con cuidado', { duration: 4000 });
            }
        },
        [PUSHER_EVENTS_DALGONA.GAME_STARTED]: () => {
            if (gameStatusRef.current === 'waiting') {
                setImageUrl(null);
                setLives(MAX_LIVES);
                setGameStatus('waiting');
                setPixelsRemoved(0);
                setCracks([]);
            }
        },
        [PUSHER_EVENTS_DALGONA.SUCCESS]: (data: { userId: number }) => {
            if (data.userId === session.user.id) {
                setGameStatus('completed');
                swSound.win();
                swToast.success('¡Has completado el desafío Dalgona!');
            }
        },
        [PUSHER_EVENTS_DALGONA.DAMAGE]: (data: { userId: number; lives: number }) => {
            if (data.userId === session.user.id) {
                setLives(data.lives);
                swSound.error();
                swToast.error(`¡Cuidado! Vidas restantes: ${data.lives}`);
            }
        },
        [PUSHER_EVENTS_DALGONA.GAME_ENDED]: (data: { completedPlayers: number[], eliminatedPlayers: number[] }) => {
            if (data.eliminatedPlayers.includes(session.user.streamerWarsPlayerNumber!)) {
                setGameStatus('failed');
                swSound.lose();
                swToast.error('Has sido eliminado del juego');
            }
        },
    });

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

        swSound.error();

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
        const halfHit = SHAPE_HIT_SIZE / 2;

        // Check if carving hits the shape (halo mortal: 2px más allá del borde)
        const shapeData = shapeCtx.getImageData(
            Math.max(0, Math.floor(canvasX - halfHit)),
            Math.max(0, Math.floor(canvasY - halfHit)),
            SHAPE_HIT_SIZE, SHAPE_HIT_SIZE
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
        if (percentageRemoved < REQUIRED_PCT) {
            swToast.error(`Necesitas remover al menos el ${REQUIRED_PCT}% (actual: ${percentageRemoved.toFixed(1)}%)`);
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
                swSound.win();
            } else if (result.eliminated) {
                setGameStatus('failed');
                swSound.lose();
            }
        } catch (error) {
            console.error('Error submitting completion:', error);
            swToast.error('Error al enviar la completación');
        }
    };

    // ------ Render ------

    const percentageRemoved = totalRemovablePixels > 0 ? (pixelsRemoved / totalRemovablePixels) * 100 : 0;

    if (showInstructions && gameStatus === 'waiting') {
        return (
            <Instructions duration={15000} customTitle="Dalgona">
                <p className="font-mono text-base font-bold">Tallado de píxeles</p>
                <p className="font-mono text-sm">Talla la galleta removiendo el material alrededor de la figura central. Mantén presionado el mouse y arrastra.</p>
                <p className="font-mono text-sm">Si tocas la figura pierdes una vida. Tienes 2 vidas: la figura quema hasta 2px más allá de su borde.</p>
                <p className="font-mono text-sm">Objetivo: remover al menos el 97% sin romper la figura.</p>
            </Instructions>
        );
    }

    if (gameStatus !== 'playing') {
        return (
            <SWGameShell accent="amber" title="Dalgona" shaking={isShaking}>
                <SWStatusScreen
                    status={gameStatus === 'waiting' ? 'waiting' : gameStatus === 'completed' ? 'completed' : 'failed'}
                    title={gameStatus === 'waiting' ? 'Esperando inicio' : gameStatus === 'completed' ? '¡Éxito! Desafío superado' : 'Eliminado'}
                    subtitle={gameStatus === 'waiting' ? 'El juego comenzará pronto' : gameStatus === 'completed' ? 'Has superado el desafío Dalgona' : 'No completaste el desafío'}
                />
            </SWGameShell>
        );
    }

    // Calculate cursor display size
    const cursorRadius = canvasDisplayRect && canvasRef.current
        ? (BRUSH_SIZE / 2) * (canvasDisplayRect.width / canvasRef.current.width) * 2
        : 0;

    return (
        <SWGameShell accent="amber" title="Dalgona" shaking={isShaking}>
            <SWHud
                leftLabel="Vidas"
                leftValue={`${lives}/${MAX_LIVES}`}
                title="Dalgona"
                rightLabel="Progreso"
                rightValue={`${percentageRemoved.toFixed(1)}%`}
                progress={Math.min(1, percentageRemoved / 100)}
            />
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-3 md:p-4 z-10">
                {/* Plato metálico bajo la galleta */}
                <div className="rounded-full p-5 md:p-7 bg-[radial-gradient(circle_at_35%_30%,#3a3f45_0%,#22262b_55%,#101215_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.7),inset_0_2px_6px_rgba(255,255,255,0.12),inset_0_-8px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                {/* Canvas container */}
                <div
                    ref={canvasContainerRef}
                    className="relative rounded-full overflow-hidden shadow-[0_0_0_6px_rgba(0,0,0,0.35),0_10px_30px_rgba(0,0,0,0.6)]"
                    style={{ imageRendering: 'pixelated' }}
                >
                    <canvas
                        ref={canvasRef}
                        role="img"
                        aria-label={`Galleta Dalgona, ${percentageRemoved.toFixed(0)} por ciento removido, ${lives} vidas restantes`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={handleMouseEnter}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="touch-none max-w-full h-auto block"
                        style={{ touchAction: 'none', imageRendering: 'pixelated', cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cline x1='5' y1='21' x2='19' y2='7' stroke='%23e8e8e8' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='19' cy='7' r='2.4' fill='%23b4cd02'/%3E%3C/svg%3E") 5 21, crosshair` }}
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
                            <div className="w-full h-full rounded-full border-2 border-amber-300/90 bg-amber-300/10 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-0.5 bg-amber-300 rounded-full" />
                        </div>
                    )}
                </div>
                </div>

                {/* Submit button */}
                {percentageRemoved >= REQUIRED_PCT && (
                    <div className="mt-4 animate-pulse">
                        <RetroButton
                            onClick={submitCompletion}
                            aria-label="Completar desafío Dalgona"
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm border-4 border-green-400 font-press-start-2p"
                        >
                            ¡COMPLETAR!
                        </RetroButton>
                    </div>
                )}
            </div>
        </SWGameShell>
    );
};
