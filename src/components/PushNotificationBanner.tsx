import { useState, useEffect } from "preact/hooks";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { LucideBell, LucideX } from "lucide-preact";

export default function PushNotificationBanner() {
    const { permission, isSupported, loading, subscribe } = usePushNotifications();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show only if supported, permission is default (not granted/denied), and not dismissed
        const dismissed = localStorage.getItem("push-banner-dismissed");
        if (isSupported && permission === "default" && !dismissed) {
            // Delay showing it a bit so it's not instant
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isSupported, permission]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("push-banner-dismissed", "true");
    };

    const handleEnable = async () => {
        await subscribe();
        // If successful (permission becomes granted), the effect will hide the banner
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-[#1a1b1e] border border-purple-500/30 rounded-xl shadow-2xl p-4 flex items-start gap-4 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="bg-purple-500/10 p-2.5 rounded-lg text-purple-400 shrink-0">
                    <LucideBell size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm mb-1">Activa las notificaciones</h4>
                    <p className="text-white/60 text-xs leading-relaxed mb-3">
                        Entérate cuando alguien comente tus publicaciones o reaccione a tu contenido.
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={handleEnable}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Activando..." : "Activar"}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Más tarde
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-white/30 hover:text-white transition-colors absolute top-2 right-2"
                >
                    <LucideX size={16} />
                </button>
            </div>
        </div>
    );
}
