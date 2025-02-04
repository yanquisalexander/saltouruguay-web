import { useState, useEffect, useRef } from 'preact/hooks';
import clsx from 'clsx';
import Pusher from 'pusher-js';
import { $ } from "@/lib/dom-selector";
import { LucideVolume2, LucideVolumeX, LucideX } from "lucide-preact";
import { toast } from "sonner";

interface CinematicPlayerProps {
    userId: string; // Identificador único del usuario actual
    pusher: Pusher; // Instancia de Pusher
}

export const CinematicPlayer = ({ userId, pusher }: CinematicPlayerProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [mute, setMute] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoTimes, setVideoTimes] = useState({ currentTime: 0, duration: 0 });

    useEffect(() => {
        const channel = pusher.subscribe('cinematic-player');

        channel.bind('new-event', (data: { targetUsers: string[] | 'everyone'; videoUrl: string }) => {
            if (data.targetUsers === 'everyone' || data.targetUsers.includes(userId)) {
                setVideoUrl(data.videoUrl);
                setIsVisible(true);
            }
        });

        return () => {
            channel.unbind('new-event');
            pusher.unsubscribe('cinematic-player');
        };
    }, [userId, pusher]);



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

        const event = new CustomEvent('cinematic-ended');
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
                    onTimeUpdate={() => setVideoTimes({ currentTime: videoRef.current?.currentTime || 0, duration: videoRef.current?.duration || 0 })}
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
                <span className="text-white text-sm">
                    La cinemática terminará en {Math.round(videoTimes.duration - videoTimes.currentTime)} segundo{Math.round(videoTimes.duration - videoTimes.currentTime) !== 1 ? 's' : ''}
                </span>
                {/* 
                        Progress bar
                    */}

                <div className="h-1 bg-gray-700 rounded-lg mt-2">
                    <div
                        className="h-full bg-blue-500 rounded-lg transition-all duration-300"
                        style={{ width: `${(videoTimes.currentTime / videoTimes.duration) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

