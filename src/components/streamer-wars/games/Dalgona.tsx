import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface DalgonaProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
}

export const Dalgona = ({ session, pusher, channel }: DalgonaProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [lives, setLives] = useState(3);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [showInstructions, setShowInstructions] = useState(true);
    const [pixelsRemoved, setPixelsRemoved] = useState(0);
    const [totalRemovablePixels, setTotalRemovablePixels] = useState(0);
    const [cracks, setCracks] = useState<Array<{ x: number; y: number; rotation: number }>>([]);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const shapeCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const isCarving = useRef(false);
    const lastDamageTime = useRef(0);

    // Fetch initial game state on component mount
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

        if (session.user?.id) {
            fetchInitialState();
        }
    }, [session.user?.id]);

    // Subscribe to streamer-wars channel
    useEffect(() => {
        if (!session.user?.id || !pusher) return;

        // Listen for game start event
        channel.bind('dalgona:start', (data: { userId: number; imageUrl: string; lives: number }) => {
            if (data.userId === session.user.id) {
                setImageUrl(data.imageUrl);
                setLives(data.lives);
                setGameStatus('playing');
                setPixelsRemoved(0);
                setCracks([]);
                toast.info('¡Talla la galleta con cuidado!', { position: 'bottom-center' });
            }
        });

        // Listen for game started event (broadcast to all)
        channel.bind('dalgona:game-started', (data: { totalPlayers: number }) => {
            if (gameStatus === 'waiting') {
                setImageUrl(null);
                setLives(3);
                setGameStatus('waiting');
                setPixelsRemoved(0);
                setCracks([]);
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

        // Listen for damage event
        channel.bind('dalgona:damage', (data: { userId: number; lives: number }) => {
            if (data.userId === session.user.id) {
                setLives(data.lives);
                toast.error(`¡Cuidado! Vidas restantes: ${data.lives}`, {
                    position: 'bottom-center',
                });
            }
        });

        // Listen for game ended event
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
            channel.unbind('dalgona:damage');
            channel.unbind('dalgona:game-ended');
        };
    }, [session.user?.id, pusher, gameStatus]);

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
            // Set canvas dimensions - scale up for better pixel art effect
            const scale = 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            maskCanvas.width = img.width * scale;
            maskCanvas.height = img.height * scale;
            shapeCanvas.width = img.width * scale;
            shapeCanvas.height = img.height * scale;

            // Draw base image with pixel perfect rendering
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Create mask - full cookie color with shape cut out
            maskCtx.fillStyle = '#D2691E'; // Chocolate/caramel cookie color (8-bit style)
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

            // Extract shape from SVG (darker area in the center)
            // Note: This processes all pixels sequentially. For very large images,
            // consider using Web Workers or processing in chunks. The current
            // implementation is acceptable for standard Dalgona cookie sizes (400x400)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            let removableCount = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                // Skip transparent pixels
                if (a < 10) continue;
                
                // Check if pixel is part of the shape (darker color)
                const brightness = (r + g + b) / 3;
                if (brightness < 170) { // Shape pixels are darker
                    // Mark as shape (clear from mask)
                    const x = (i / 4) % canvas.width;
                    const y = Math.floor((i / 4) / canvas.width);
                    maskCtx.clearRect(x, y, 1, 1);
                    
                    // Draw shape on shape canvas (bright color for detection)
                    shapeCtx.fillStyle = '#FF0000'; // Red for easy detection
                    shapeCtx.fillRect(x, y, 1, 1);
                } else {
                    removableCount++;
                }
            }
            
            setTotalRemovablePixels(removableCount);

            // Redraw base canvas with cookie texture
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add simple texture noise (8-bit style)
            for (let i = 0; i < canvas.width * canvas.height / 50; i++) {
                const x = Math.floor(Math.random() * canvas.width);
                const y = Math.floor(Math.random() * canvas.height);
                const brightness = Math.random() > 0.5 ? 1.1 : 0.9;
                ctx.fillStyle = `rgba(210, 105, 30, ${brightness})`;
                ctx.fillRect(x, y, 2, 2);
            }
            
            // Draw shape outline on top
            ctx.strokeStyle = '#8B4513'; // Darker brown for shape outline
            ctx.lineWidth = 4;
            const shapeImageData = shapeCtx.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height);
            const shapePixels = shapeImageData.data;
            
            // Draw shape pixels darker
            for (let i = 0; i < shapePixels.length; i += 4) {
                if (shapePixels[i + 3] > 0) {
                    const x = (i / 4) % shapeCanvas.width;
                    const y = Math.floor((i / 4) / shapeCanvas.width);
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        };
        img.src = imageUrl;
        imageRef.current = img;
    }, [imageUrl]);

    const handleDamage = async (x: number, y: number) => {
        // Prevent rapid damage calls
        const now = Date.now();
        if (now - lastDamageTime.current < 500) return;
        lastDamageTime.current = now;

        // Add crack at position
        const newCrack = {
            x,
            y,
            rotation: Math.random() * 360,
        };
        setCracks(prev => [...prev, newCrack]);

        // Play error sound (using generic error sound for now)
        playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.5 }).catch(() => {
            // Silent fail if sound doesn't load
        });

        // Call damage API
        try {
            const response = await fetch('/api/dalgona?action=damage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await response.json();
            
            if (result.success) {
                setLives(result.lives);
                
                if (result.eliminated) {
                    setGameStatus('failed');
                }
            }
        } catch (error) {
            console.error('Error reporting damage:', error);
        }
    };

    const carvePixel = (x: number, y: number) => {
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
        const canvasX = (x - rect.left) * scaleX;
        const canvasY = (y - rect.top) * scaleY;

        const brushSize = 8;

        // Check if carving hits the shape
        const shapeData = shapeCtx.getImageData(
            Math.max(0, canvasX - brushSize / 2),
            Math.max(0, canvasY - brushSize / 2),
            brushSize,
            brushSize
        );

        let hitShape = false;
        for (let i = 3; i < shapeData.data.length; i += 4) {
            if (shapeData.data[i] > 0) {
                hitShape = true;
                break;
            }
        }

        if (hitShape) {
            // Damage! Hit the shape
            handleDamage(canvasX, canvasY);
        } else {
            // Check if there's mask to remove
            const maskData = maskCtx.getImageData(
                Math.max(0, canvasX - brushSize / 2),
                Math.max(0, canvasY - brushSize / 2),
                brushSize,
                brushSize
            );

            let removedCount = 0;
            for (let i = 3; i < maskData.data.length; i += 4) {
                if (maskData.data[i] > 0) {
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                // Remove from mask
                maskCtx.globalCompositeOperation = 'destination-out';
                maskCtx.beginPath();
                maskCtx.arc(canvasX, canvasY, brushSize / 2, 0, Math.PI * 2);
                maskCtx.fill();
                maskCtx.globalCompositeOperation = 'source-over';

                // Update pixels removed count
                setPixelsRemoved(prev => prev + removedCount);

                // Redraw canvas
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

        // Clear and redraw base
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imageRef.current, 0, 0);

        // Apply mask (remove carved areas)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';

        // Draw cracks (8-bit pixel art style)
        cracks.forEach(crack => {
            ctx.save();
            ctx.translate(crack.x, crack.y);
            ctx.rotate((crack.rotation * Math.PI) / 180);
            
            // Draw pixelated crack with multiple colors for depth
            // Dark crack lines
            ctx.fillStyle = '#4A0000';
            ctx.fillRect(-10, -2, 20, 4);
            ctx.fillRect(-2, -10, 4, 20);
            
            // Medium crack lines
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(-8, -1, 16, 2);
            ctx.fillRect(-1, -8, 2, 16);
            
            // Crack branches (8-bit style)
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(-8, -8, 3, 3);
            ctx.fillRect(5, -8, 3, 3);
            ctx.fillRect(-8, 5, 3, 3);
            ctx.fillRect(5, 5, 3, 3);
            
            // Add highlight for 3D effect
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(-9, -1, 2, 2);
            ctx.fillRect(-1, -9, 2, 2);
            
            ctx.restore();
        });
    };

    useEffect(() => {
        redrawCanvas();
    }, [cracks]);

    const handleMouseDown = (e: MouseEvent) => {
        if (gameStatus !== 'playing') return;
        isCarving.current = true;
        carvePixel(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isCarving.current || gameStatus !== 'playing') return;
        carvePixel(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
        isCarving.current = false;
    };

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

    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        isCarving.current = false;
    };

    const submitCompletion = async () => {
        const percentageRemoved = (pixelsRemoved / totalRemovablePixels) * 100;
        
        if (percentageRemoved < 95) {
            toast.error(`Necesitas remover al menos el 95% (actual: ${percentageRemoved.toFixed(1)}%)`, {
                position: 'bottom-center',
            });
            return;
        }

        try {
            const response = await fetch('/api/dalgona?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    traceData: {
                        pixelsRemoved,
                        totalRemovablePixels,
                        percentageRemoved,
                        timestamp: Date.now(),
                    },
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

    if (showInstructions) {
        return (
            <Instructions duration={12000}>
                <p className="font-mono max-w-2xl text-left text-xl">
                    🍪 <strong>DALGONA - Tallado de Píxeles</strong>
                </p>
                <p className="font-mono max-w-2xl text-left">
                    Talla cuidadosamente la galleta removiendo todo el material alrededor de la figura central.
                    Mantén presionado el mouse/dedo y arrastra para raspar píxel por píxel.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    ⚠️ <strong>¡CUIDADO!</strong> Si tocas la figura central (área oscura), perderás una vida.
                    Tienes 3 vidas en total. Al perder todas, serás eliminado.
                </p>
                <p className="font-mono max-w-2xl text-left">
                    🎯 <strong>Objetivo:</strong> Remover al menos el 95% del material removible sin romper la figura.
                </p>
                <p className="font-mono max-w-2xl text-left text-yellow-300">
                    💡 Consejo: Trabaja desde los bordes hacia el centro. Muévete lentamente cerca de la figura.
                </p>
            </Instructions>
        )
    }

    if (gameStatus === 'waiting') {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-b from-amber-900 to-amber-950">
                <div className="text-center text-white p-8 bg-black/50 border-8 border-yellow-600">
                    <h2 className="text-3xl font-bold mb-4 text-yellow-300" style={{ fontFamily: '"Press Start 2P", monospace', textShadow: '4px 4px 0px #000' }}>
                        DALGONA
                    </h2>
                    <p className="text-xl font-mono">Esperando inicio...</p>
                    <div className="mt-4 animate-pulse text-yellow-300 text-4xl">...</div>
                </div>
            </div>
        );
    }

    if (gameStatus === 'completed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-green-950">
                <div className="text-center text-white p-12 bg-black/70 border-8 border-green-400">
                    <h2 className="text-5xl font-bold mb-6 text-green-400 animate-pulse" style={{ fontFamily: '"Press Start 2P", monospace', textShadow: '4px 4px 0px #000' }}>
                        ¡EXITO!
                    </h2>
                    <div className="text-8xl mb-4">✓</div>
                    <p className="text-2xl font-mono">Has superado el</p>
                    <p className="text-2xl font-mono">desafío Dalgona</p>
                </div>
            </div>
        );
    }

    if (gameStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-900 to-red-950">
                <div className="text-center text-white p-12 bg-black/70 border-8 border-red-600">
                    <h2 className="text-5xl font-bold mb-6 text-red-500" style={{ fontFamily: '"Press Start 2P", monospace', textShadow: '4px 4px 0px #000' }}>
                        ELIMINADO
                    </h2>
                    <div className="text-8xl mb-4">✗</div>
                    <p className="text-2xl font-mono">No completaste</p>
                    <p className="text-2xl font-mono">el desafío</p>
                </div>
            </div>
        );
    }

    const percentageRemoved = totalRemovablePixels > 0 ? (pixelsRemoved / totalRemovablePixels) * 100 : 0;

    return (
        <div className="h-full relative p-5 bg-gradient-to-b from-amber-900 to-amber-950" style={{ cursor: 'crosshair' }}>
            <h2 className="text-3xl font-bold mb-4 text-center text-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '1.5rem', textShadow: '4px 4px 0px #000' }}>
                DALGONA
            </h2>
            
            {/* Lives Display - 8-bit pixel hearts */}
            <div className="absolute top-4 left-4 flex gap-3 bg-black/50 p-3 rounded-none border-4 border-yellow-600">
                <span className="text-yellow-300 font-bold mr-2" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.8rem' }}>
                    VIDAS:
                </span>
                {Array.from({ length: 3 }).map((_, i) => (
                    <img
                        key={i}
                        src="/images/vida.webp"
                        alt="vida"
                        className={`w-10 h-10 ${i >= lives ? 'opacity-20 grayscale' : ''}`}
                        style={{ imageRendering: 'pixelated' }}
                    />
                ))}
            </div>

            {/* Progress Bar - 8-bit style */}
            <div className="absolute top-4 right-4 bg-black/70 border-4 border-yellow-600 p-4 min-w-[300px]">
                <div className="text-yellow-300 text-xs mb-2 font-bold" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.7rem' }}>
                    PROGRESO
                </div>
                <div className="text-white text-sm mb-2 font-mono font-bold">
                    {percentageRemoved.toFixed(1)}% / 95%
                </div>
                <div className="w-full bg-gray-900 h-8 relative overflow-hidden border-4 border-gray-700">
                    <div 
                        className={`h-full transition-all duration-300 ${
                            percentageRemoved >= 95 ? 'bg-green-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        }`}
                        style={{ width: `${Math.min(percentageRemoved, 100)}%` }}
                    />
                    {/* Pixel art style lines */}
                    <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-1 bg-black/20"
                                style={{ left: `${i * 10}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="relative bg-amber-900 w-max mx-auto mb-6 mt-32 border-8 border-yellow-900 shadow-2xl" style={{ imageRendering: 'pixelated' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="touch-none max-w-full h-auto"
                    style={{ 
                        touchAction: 'none',
                        imageRendering: 'pixelated',
                        cursor: 'crosshair'
                    }}
                />
                <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
                <canvas ref={shapeCanvasRef} style={{ display: 'none' }} />
            </div>

            {/* Submit Button */}
            {percentageRemoved >= 95 && (
                <div className="flex justify-center animate-pulse">
                    <RetroButton
                        onClick={submitCompletion}
                        className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl border-4 border-green-400"
                        style={{ fontFamily: '"Press Start 2P", monospace' }}
                    >
                        ¡COMPLETAR!
                    </RetroButton>
                </div>
            )}
        </div>
    );
};
