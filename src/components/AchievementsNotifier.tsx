import confetti from "canvas-confetti";
import { LucideTrophy } from "lucide-preact";
import { useEffect } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";

interface AchievementsNotifierProps {
    userId: string; // ID del usuario para identificar eventos específicos
}

export function AchievementsNotifier({ userId, pusher }: AchievementsNotifierProps & { pusher: Pusher }) {
    useEffect(() => {
        if (!userId) {
            console.error("No userId provided to AchievementsNotifier");
            return;
        }


        // Genera dinámicamente el nombre del canal basado en el userId
        const channelName = `user-${userId}-achievements`;

        // Suscríbete al canal correspondiente
        const channel = pusher.subscribe(channelName);


        // Escucha eventos de logros específicos
        channel.bind("achievement-unlocked", (data: any) => {
            console.log(`Logro desbloqueado para el usuario ${userId}:`, data);
            // Aquí puedes implementar la lógica adicional, como notificaciones o actualizaciones
            const audio = new Audio("/sounds/logro-desbloqueado.mp3");
            audio.play();
            toast(`¡Has desbloqueado el logro "${data.title}"!`, {
                icon: <LucideTrophy />,
                duration: 5000,
                position: 'bottom-center',
                richColors: true,
                classNames: {
                    toast: 'bg-white text-black',
                    icon: 'text-yellow-600 flex flex-col justify-center items-center bg-zinc-100 p-5 rounded-full',
                    title: 'font-rubik uppercase font-medium',
                }
            })
            confetti({
                particleCount: 100,
                spread: 70,
                origin: {
                    y: 0.6
                }
            });

        });



        // Limpia la conexión cuando el componente se desmonta
        return () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [userId]);

    // No renderiza nada
    return null;
}
