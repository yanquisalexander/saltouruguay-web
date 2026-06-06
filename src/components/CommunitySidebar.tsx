import { useEffect, useState } from 'preact/hooks';
import {
    LucideHome,
    LucideUsers,
    LucidePiggyBank,
    LucideTrophy,
    LucidePawPrint,
} from 'lucide-preact';

interface SidebarProps {
    mobile?: boolean;
}

const MENU_ITEMS = [
    { label: "Inicio", href: "/", icon: LucideHome, accent: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Comunidad", href: "/comunidad", icon: LucideUsers, accent: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Banco", href: "/comunidad/banco", icon: LucidePiggyBank, accent: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Mascota", href: "/comunidad/mascota", icon: LucidePawPrint, accent: "text-pink-400", bg: "bg-pink-500/10" },
    { label: "Logros", href: "/comunidad/logros", icon: LucideTrophy, accent: "text-green-400", bg: "bg-green-500/10" },
];

export default function CommunitySidebar({ mobile }: SidebarProps) {
    const [currentPath, setCurrentPath] = useState("");

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    if (mobile) {
        return (
            <nav class="flex justify-around w-full px-2 py-1.5 bg-black/60 backdrop-blur-xl border-t border-white/[0.06]">
                {MENU_ITEMS.map((item) => {
                    const isActive = item.href === "/"
                        ? currentPath === "/"
                        : currentPath.startsWith(item.href);

                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            class={`
                                flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200
                                ${isActive
                                    ? `${item.bg} ${item.accent}`
                                    : 'text-white/30 hover:text-white/60'}
                            `}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span class={`text-[9px] font-rubik font-semibold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                {item.label}
                            </span>
                        </a>
                    );
                })}
            </nav>
        );
    }

    return (
        <nav class="flex flex-col w-52 h-full bg-black/40 backdrop-blur-xl border-r border-white/[0.06] relative">
            {/* Logo */}
            <div class="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
                <div class="size-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <img src="/favicon.svg" alt="Logo" class="w-5 h-5" />
                </div>
                <span class="font-teko text-lg text-white/80 uppercase tracking-wider">Comunidad</span>
            </div>

            {/* Menu */}
            <div class="flex-1 flex flex-col gap-1 p-3">
                {MENU_ITEMS.map((item) => {
                    const isActive = item.href === "/"
                        ? currentPath === "/"
                        : currentPath.startsWith(item.href);

                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            class={`
                                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? `${item.bg} ${item.accent} shadow-sm`
                                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white/70'}
                            `}
                        >
                            <div class={`flex items-center justify-center size-9 rounded-lg transition-all duration-200 ${isActive ? `${item.bg}` : 'bg-white/[0.04] group-hover:bg-white/[0.06]'}`}>
                                <item.icon
                                    size={18}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                            <span class="font-teko text-base tracking-wide">{item.label}</span>

                            {isActive && (
                                <div class={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${item.accent.replace('text-', 'bg-')}`} />
                            )}
                        </a>
                    );
                })}
            </div>

            {/* Bottom hint */}
            <div class="px-5 py-4 border-t border-white/[0.06]">
                <p class="text-[10px] font-rubik text-white/20 uppercase tracking-wider text-center">Salto Uruguay • 2026</p>
            </div>
        </nav>
    );
}
