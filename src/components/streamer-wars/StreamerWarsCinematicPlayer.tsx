import { useState, useEffect, useRef } from 'preact/hooks';
import clsx from 'clsx';
import Pusher from 'pusher-js';
import { $ } from "@/lib/dom-selector";
import { LucideVolume2, LucideVolumeX, LucideX } from "lucide-preact";
import { toast } from "sonner";

interface StreamerWarsCinematicPlayerProps {
    userId: string; // Identificador único del usuario actual
    pusher: Pusher; // Instancia de Pusher
}

export const StreamerWarsCinematicPlayer = ({ userId, pusher }: StreamerWarsCinematicPlayerProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [mute, setMute] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoTimes, setVideoTimes] = useState({ currentTime: 0, duration: 0 });
    const [timeLeft, setTimeLeft] = useState(0);
    const prevSecondRef = useRef<number | null>(null);

    useEffect(() => {
        const channel = pusher.subscribe('streamer-wars-cinematic');

        channel.bind('new-event', (data: { targetUsers: string[] | 'everyone'; videoUrl: string }) => {
            if (window.location.pathname.includes('admin')) {
                console.warn("Se ha recibido una cinemática, pero no se mostrará en la vista de administrador");
                return;
            }
            if (data.targetUsers === 'everyone' || data.targetUsers.includes(userId)) {
                setVideoUrl(data.videoUrl);
                setIsVisible(true);
            }
        });

        return () => {
            channel.unbind('new-event');
            pusher.unsubscribe('streamer-wars-cinematic');
        };
    }, [userId, pusher]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isVisible && (e.key === ' ' || e.key === 'k' || e.code === 'Space')) {
                e.preventDefault();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVisible]);

    useEffect(() => {
        let playTimeout: NodeJS.Timeout;

        const handleVideoPlay = () => {
            if (videoRef.current) {
                videoRef.current.play();

                // Si ocurre un error al intentar reproducir el video
                videoRef.current.onerror = () => {
                    toast.error('Ocurrió un error al cargar la cinemática');
                    handleVideoEnd();
                };

                // Inicia un temporizador para verificar si el video no comienza a reproducirse en 2 segundos
                playTimeout = setTimeout(() => {
                    toast.error('El video tardó demasiado en comenzar a reproducirse');
                    handleVideoEnd();
                }, 3000);

                // Escucha el evento 'playing' para confirmar que el video comenzó a reproducirse
                videoRef.current.onplaying = () => {
                    clearTimeout(playTimeout); // Cancela el temporizador si comienza a reproducirse
                };

                $('body')?.classList.add('overflow-hidden');
            }
        };

        if (isVisible) {
            handleVideoPlay();
        }

        return () => {
            clearTimeout(playTimeout); // Asegura que el temporizador se limpie al desmontar
        };
    }, []);


    const handleVideoEnd = () => {
        setIsVisible(false);

        setTimeout(() => setVideoUrl(null), 500);
        $('body')?.classList.remove('overflow-hidden');

        /* 
            Emit a custom event (DOM)
        */

        const event = new CustomEvent('streamer-wars-cinematic-ended');
        document.dispatchEvent(event);

    };

    return (
        <div
            className={clsx(
                'fixed min-h-screen w-full z-[9999] inset-0 bg-black bg-opacity-90 flex items-center justify-center transition-opacity duration-500',
                {
                    'opacity-0 pointer-events-none': !isVisible,
                    'opacity-100': isVisible,
                }
            )}
        >
            {videoUrl && (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    muted={mute}
                    className="max-w-full max-h-full aspect-video"
                    autoPlay={true}
                    onEnded={handleVideoEnd}
                    controls={false}
                    onTimeUpdate={() => {
                        const currentTime = videoRef.current?.currentTime || 0;
                        const duration = videoRef.current?.duration || 0;
                        setVideoTimes({ currentTime, duration });
                        if (duration > 0) {
                            const newTimeLeft = Math.max(0, Math.round(duration - currentTime));
                            setTimeLeft(newTimeLeft);
                            const currentSecond = Math.floor(newTimeLeft);

                            prevSecondRef.current = currentSecond;
                        }
                    }}
                />
            )}

            <button
                className="absolute top-4 right-4 bg-blue-500 bg-opacity-50 size-8 flex items-center justify-center p-2 rounded-full"
                onClick={() => setMute(!mute)}
            >
                {mute ? <LucideVolume2 size={24} /> : <LucideVolumeX size={24} />}
            </button>

            {/*       <button
                className="absolute top-4 left-4 bg-blue-500 bg-opacity-50 size-8 flex items-center justify-center p-2 rounded-full"
                onClick={handleVideoEnd}
            >
                <LucideX size={24} />
            </button> */}

            <div className="absolute bottom-8 flex flex-col">
                {/* 
                        Temporizador como en Instructions
                    */}
                <div className="fixed font-press-start-2p top-0 right-1/2 left-1/2 mt-6 text-xs text-gray-300 transform -translate-x-1/2">
                    {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
                </div>
            </div>
        </div>
    );
};