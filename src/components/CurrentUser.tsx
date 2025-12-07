import { $ } from "@/lib/dom-selector";
import type { Session } from "@auth/core/types";
import { signOut } from "auth-astro/client";
import {
    LucideLoader2,
    LucideLogOut,
    LucideUser,
    LucideLayoutDashboard,
    LucideMessageSquare,
    LucideChevronDown,
    LucideGamepad2
} from "lucide-preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import { usePusher } from "@/hooks/usePusher";
import { navigate } from "astro:transitions/client";
import type { JSX } from 'preact';

// Icono de Twitch SVG Inline para evitar problemas de importación
const TwitchBrandIcon = (props: JSX.IntrinsicElements['svg']) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z" />
    </svg>
);

export const CurrentUser = ({ user: initialUser, isPrerenderedPath }: { user: Session['user'] | null, isPrerenderedPath: boolean }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(isPrerenderedPath && !initialUser);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<Session['user'] | null>(initialUser);

    // Hook condicional seguro: Si no usas pusher, puedes comentar esto, 
    // pero asumo que está configurado según tu código anterior.
    const { pusher } = usePusher();

    const fetchUserFromServer = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/auth/session");
            if (response.status === 200) {
                const data = await response.json();
                setUser(data?.user || null);
                if (data?.user?.isSuspended) {
                    navigate("/suspended");
                    return;
                }
            }
        } catch (error) {
            console.error("Error al obtener el usuario", error);
        } finally {
            setLoading(false);
            setFetchingUser(false);
        }
    };

    const handleSignIn = async () => {
        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;

        window.open(
            "/auth/twitch",
            "Twitch Login",
            `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        window.addEventListener('SignInError', () => {
            toast.error('¡Ups! Ocurrió un error al iniciar sesión!');
        }, { once: true });
    };

    const linkDiscord = async () => {
        window.location.href = `/api/discord/link`;
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    useEffect(() => {
        if (!user && isPrerenderedPath) {
            fetchUserFromServer();
        }
    }, [user, isPrerenderedPath]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownOpen]);


    // --- RENDERIZADO ---

    // 1. Estado de Carga Inicial
    if (fetchingUser) {
        return (
            <div className="flex items-center justify-center size-10 rounded-full bg-white/5 animate-pulse">
                <LucideLoader2 class="animate-spin-clockwise animate-iteration-count-infinite text-white/50" size={18} />
            </div>
        );
    }

    // 2. Estado: NO Logueado (Botón de Login Mejorado)
    if (!user && !loading) {
        return (
            <button
                className="group relative flex items-center gap-2 bg-[#9146FF] hover:bg-[#7c2cf5] text-white px-5 py-2 rounded-full font-teko text-xl uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_15px_rgba(145,70,255,0.5)] active:scale-95 overflow-hidden"
                onClick={handleSignIn}
                aria-label="Iniciar sesión con Twitch"
            >
                <span className="relative z-10 flex items-center gap-2">
                    <TwitchBrandIcon className="size-5" />
                    <span>Conectar</span>
                </span>
                {/* Efecto Shine simple via CSS classes si las tienes, o un gradiente simple */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
        );
    }

    // 3. Estado: Logueado (Avatar + Dropdown)
    if (user) {
        return (
            <div className="relative flex items-center" ref={dropdownRef}>
                {/* Trigger del Dropdown */}
                <button
                    className={`
                        group flex items-center gap-2 p-1 pl-2 pr-1 rounded-full transition-all duration-300 border
                        ${dropdownOpen
                            ? 'bg-white/10 border-white/10 ring-2 ring-white/5'
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                        }
                    `}
                    onClick={toggleDropdown}
                >
                    <span className="hidden md:block font-teko text-xl uppercase tracking-wide text-white mr-1 group-hover:text-yellow-400 transition-colors">
                        {user.name}
                    </span>

                    <div className="relative">
                        <img
                            src={user.image || undefined}
                            alt={user.name || "User"}
                            className="size-9 rounded-full object-cover border border-white/10 shadow-sm group-hover:scale-105 transition-transform"
                        />
                        {/* Indicador de Estado (Online) */}
                        <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-black rounded-full"></div>
                    </div>

                    <LucideChevronDown size={14} className={`text-white/50 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Flotante */}
                {dropdownOpen && (
                    <div className="absolute top-full right-0 mt-3 w-72 origin-top-right rounded-2xl bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-2xl ring-1 ring-white/5 z-50 animate-in fade-in zoom-in-95 duration-200">

                        {/* Header del Perfil */}
                        <div className="relative p-5 border-b border-white/5 overflow-hidden rounded-t-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-transparent"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <img
                                    src={user.image || undefined}
                                    alt={user.name || "User"}
                                    className="size-12 rounded-full border-2 border-white/10 shadow-lg"
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-teko text-2xl text-white uppercase tracking-wide truncate">
                                        {user.name}
                                    </span>
                                    <span className="font-rubik text-xs text-white/40 truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Cuerpo del Menú */}
                        <div className="p-2 space-y-1">
                            <a href="/usuario" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-white hover:bg-white/10 transition-colors group">
                                <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-white transition-colors">
                                    <LucideUser size={16} />
                                </div>
                                <span className="flex-1">Mi Perfil</span>
                            </a>

                            {!user.discordId && (
                                <button onClick={linkDiscord} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-white hover:bg-[#5865F2]/20 transition-colors group text-left">
                                    <div className="p-1.5 rounded-lg bg-[#5865F2]/10 text-[#5865F2] group-hover:bg-[#5865F2] group-hover:text-white transition-colors">
                                        <LucideMessageSquare size={16} />
                                    </div>
                                    <span className="flex-1">Vincular Discord</span>
                                    <div className="size-2 rounded-full bg-red-500 animate-pulse"></div>
                                </button>
                            )}

                            {user.isAdmin && (
                                <>
                                    <div className="h-px bg-white/5 my-1 mx-2"></div>
                                    <a href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-red-400 hover:bg-red-500/10 transition-colors group">
                                        <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-red-400 transition-colors">
                                            <LucideLayoutDashboard size={16} />
                                        </div>
                                        <span>Administración</span>
                                    </a>
                                </>
                            )}
                            <a href="/saltoplay" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-green-400 hover:bg-green-500/10 transition-colors group">
                                <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-green-400 transition-colors">
                                    <LucideGamepad2 size={16} />
                                </div>
                                <span>SaltoPlay</span>
                            </a>
                        </div>

                        <div className="p-2 border-t border-white/5 mt-1">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    signOut({ callbackUrl: '/' });
                                }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-rubik text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left group"
                            >
                                <LucideLogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                )}

                {pusher && (
                    <>
                        <AchievementsNotifier userId={user.id} />
                        <CinematicPlayer userId={user.id} />
                    </>
                )}
            </div>
        );
    }

    return null;
};