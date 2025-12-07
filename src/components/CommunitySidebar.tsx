import { useEffect, useState } from 'preact/hooks';
import {
    LucideHome,
    LucideUsers,
    LucidePiggyBank,
    LucideTrophy,
    LucidePawPrint,
    LucideGamepad2
} from 'lucide-preact';

interface SidebarProps {
    mobile?: boolean;
}

const MENU_ITEMS = [
    { label: "Inicio", href: "/", icon: LucideHome, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Comunidad", href: "/comunidad", icon: LucideUsers, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Banco", href: "/comunidad/banco", icon: LucidePiggyBank, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { label: "Mascota", href: "/comunidad/mascota", icon: LucidePawPrint, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { label: "Logros", href: "/comunidad/logros", icon: LucideTrophy, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
];

export default function CommunitySidebar({ mobile }: SidebarProps) {
    const [currentPath, setCurrentPath] = useState("");

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    const containerClass = mobile
        ? "flex flex-row justify-around w-full p-2"
        : "flex flex-col gap-4 w-20 h-full p-3 border-r border-white/5 bg-[#0a0a0a]";

    return (
        <nav className={containerClass}>
            {/* Logo o Espaciador Superior (Solo Desktop) */}
            {!mobile && (
                <div className="flex justify-center mb-4 py-2 border-b border-white/5">
                    <img src="/favicon.svg" alt="Logo" className="w-8 h-8 opacity-80" />
                </div>
            )}

            <ul className={`flex ${mobile ? "flex-row w-full justify-around" : "flex-col gap-3"}`}>
                {MENU_ITEMS.map((item) => {
                    const isActive = item.href === "/"
                        ? currentPath === "/"
                        : currentPath.startsWith(item.href);

                    return (
                        <li key={item.href} className="relative group">
                            <a
                                href={item.href}
                                className={`
                                    flex items-center justify-center rounded-xl transition-all duration-300 relative overflow-hidden
                                    ${mobile ? "p-3" : "w-12 h-12 mx-auto"}
                                    ${isActive
                                        ? `${item.bg} ${item.color} ${item.border} border shadow-[0_0_15px_rgba(0,0,0,0.3)]`
                                        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                                    }
                                `}
                                title={item.label}
                            >
                                <item.icon
                                    size={mobile ? 24 : 22}
                                    className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                {/* Glow Effect on Hover */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-current ${item.color}`}></div>
                            </a>

                            {/* Tooltip (Solo Desktop) */}
                            {!mobile && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-black/90 text-white text-xs font-bold rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
                                    {item.label}
                                    {/* Flechita del tooltip */}
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-black/90"></div>
                                </div>
                            )}

                            {/* Active Indicator Bar (Desktop) */}
                            {!mobile && isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${item.color.replace('text-', 'bg-')}`}></div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}