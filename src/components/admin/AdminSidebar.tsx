import { useState } from "preact/hooks";
import {
    LucideGamepad2,
    LucideHome,
    LucideMedal,
    LucideTrophy,
    LucideUsers,
    LucideCode,
    LucideSettings,
    LucideMenu,
    LucideMoveLeft,
    LucideLayoutDashboard,
} from "lucide-preact";
import type { Session } from "@auth/core/types";

const iconMap = {
    home: LucideLayoutDashboard,
    users: LucideUsers,
    trophy: LucideTrophy,
    medal: LucideMedal,
    gamepad: LucideGamepad2,
    code: LucideCode,
    settings: LucideSettings,
};

const categories = [
    {
        title: "PRINCIPAL",
        links: [
            { label: "Panel Principal", url: "/admin", icon: "home" },
            { label: "Usuarios", url: "/admin/usuarios", icon: "users" },

        ],
    },
    {
        title: "MODERACIÓN",
        links: [
            { label: "Guerra de Streamers", url: "/admin/guerra-streamers", icon: "gamepad" },
        ],
    },
    {
        title: "SISTEMA",
        links: [{ label: "Twitch Events", url: "/admin/system/twitch-events", icon: "code" }]
    },
];

export default function Sidebar({ session, pathname }: { session: Session | null, pathname: string }) {
    const [collapsed, setCollapsed] = useState(true);
    const isActive = (path: string) => {
        return pathname === path
    }

    return (
        <div
            class={`z-50 top-0 left-0 h-full min-h-screen flex flex-col bg-zinc-950 border-r border-zinc-900  transition-all duration-300 ${collapsed ? "w-16 md:w-16 sticky" : "w-56 fixed md:w-56 md:sticky"
                }`}
        >
            <div class={`p-2 mb-6 border-b border-neutral-800 flex items-center gap-2 ${collapsed ? "justify-center" : "justify-start"
                }`}>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    class="flex items-center justify-center text-white hover:bg-zinc-900 transition-colors size-10  rounded"
                >
                    <LucideMenu class="w-6 h-6" />
                </button>
                <span class={`text-md font-medium text-white ${collapsed ? "hidden" : "block"
                    }`}>Administración</span>
            </div>

            <nav class="flex flex-col flex-1 px-4">
                {categories.map((category, index) => (
                    <div key={index} class="mb-4">
                        {!collapsed && <h2 class="text-xs text-gray-400 font-semibold mb-2">{category.title}</h2>}
                        <div class="flex flex-col gap-2">
                            {category.links.map((link, linkIndex) => {
                                const Icon = iconMap[link.icon as keyof typeof iconMap];
                                return (
                                    <a
                                        key={linkIndex}
                                        href={link.url}
                                        class={`flex items-center ${!collapsed ? "gap-2" : "justify-center"
                                            } whitespace-nowrap rounded-md text-sm font-medium text-white hover:bg-zinc-900 hover:text-primary transition-colors w-full py-2 ${collapsed ? "justify-center" : "justify-start px-2"}
                                        ${isActive(link.url) ? "bg-zinc-900 text-primary" : ""}

                                                `}
                                    >
                                        <Icon class="size-5" />
                                        {!collapsed && <span>{link.label}</span>}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
            <a href="/" class="flex items-center justify-center p-2 mb-2 gap-x-2 text-white hover:bg-zinc-900 transition-colors rounded-md">
                <LucideMoveLeft class="size-5" />
                {!collapsed && <span class="text-sm font-medium">Volver a SaltoUruguayServer</span>}
            </a>
            <footer class="flex items-center  p-4 border-t border-neutral-800">
                <div class="flex items-center gap-2">
                    <img
                        src={session?.user?.image!}
                        alt="User Avatar"
                        class="w-8 h-8 rounded-full"
                    />
                    {!collapsed && (
                        <div class="flex-1 min-w-0">

                            <p class="text-sm font-medium text-white">
                                {session?.user?.name}
                            </p>
                            <p class="text-xs text-neutral-600 truncate">Administrador</p>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
