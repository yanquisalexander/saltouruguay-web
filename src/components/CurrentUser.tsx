import { $ } from "@/lib/dom-selector";
import { getPreloadedSession } from "@/lib/preloaded-data";
import type { Session } from "@auth/core/types";
import { signOut } from "auth-astro/client";
import { NOMINEES } from "@/awards/Nominees";
import {
    LucideLoader2,
    LucideLogOut,
    LucideUser,
    LucideLayoutDashboard,
    LucideMessageSquare,
    LucideChevronDown,
    LucideTrophy,
    LucideGamepad2,
    LucideIdCard,
    LucideSparkles,
    LucideShieldCheck
} from "lucide-preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import { usePusher } from "@/hooks/usePusher";
import { navigate } from "astro:transitions/client";
import type { JSX } from 'preact';
import { CHRISTMAS_MODE, HALLOWEEN_MODE } from "@/config";
import { Suspense } from "preact/compat";

// Icono SVG de Twitch
const TwitchBrandIcon = (props: JSX.IntrinsicElements['svg']) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z" />
    </svg>
);

export const CurrentUser = ({ user: initialUser, isPrerenderedPath }: { user: Session['user'] | null, isPrerenderedPath: boolean }) => {
    // Lazy initializer para el estado del usuario (Prioridad: Prop -> DOM)
    const [user, setUser] = useState<Session['user'] | null>(() => {
        if (initialUser) return initialUser;
        return getPreloadedSession();
    });

    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(isPrerenderedPath && !user);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isNominated = user && NOMINEES[user.username as keyof typeof NOMINEES];
    const { pusher } = usePusher();

    // --- ESTILOS TEMÁTICOS (HALLOWEEN / NAVIDAD / REGULAR) ---
    const loginButtonStyles = HALLOWEEN_MODE
        ? "bg-gradient-to-r from-orange-600 via-amber-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-500/40"
        : CHRISTMAS_MODE
        ? "bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)] ring-1 ring-white/20"
        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(145,70,255,0.4)] border border-purple-400/30";

    const dropdownBorder = HALLOWEEN_MODE
        ? "border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.25)]"
        : CHRISTMAS_MODE
        ? "border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.15)]"
        : "border-white/15 shadow-2xl";

    const dropdownHeaderGradient = HALLOWEEN_MODE
        ? "bg-gradient-to-br from-orange-950/60 via-purple-950/40 to-transparent"
        : CHRISTMAS_MODE
        ? "bg-gradient-to-br from-red-900/40 via-red-900/10 to-transparent"
        : "bg-gradient-to-br from-purple-900/30 via-indigo-950/20 to-transparent";

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
        window.location.href = `/api/linked-accounts/discord/link`;
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    useEffect(() => {
        if (!user && isPrerenderedPath) {
            fetchUserFromServer();
        }
    }, [isPrerenderedPath]);

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

    // 1. Estado de Carga
    if (fetchingUser) {
        return (
            <div className="flex items-center justify-center size-10 rounded-full bg-white/5 border border-white/10 animate-pulse">
                <LucideLoader2 className={`animate-spin ${HALLOWEEN_MODE ? 'text-orange-400' : CHRISTMAS_MODE ? 'text-red-400' : 'text-purple-400'}`} size={18} />
            </div>
        );
    }

    // 2. Estado: NO Logueado
    if (!user && !loading) {
        return (
            <button
                className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-full font-teko text-xl uppercase tracking-wider transition-all duration-300 active:scale-95 overflow-hidden ${loginButtonStyles}`}
                onClick={handleSignIn}
                aria-label="Iniciar sesión con Twitch"
            >
                <span className="relative z-10 flex items-center gap-2 font-bold">
                    <TwitchBrandIcon className="size-5 transition-transform group-hover:scale-110" />
                    <span>Conectar</span>
                </span>

                {/* Brillo dinámico en el botón */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            </button>
        );
    }

    // 3. Estado: Logueado
    if (user) {
        return (
            <div className="relative flex items-center" ref={dropdownRef}>
                {/* Trigger del Dropdown */}
                <button
                    className={`
                        group flex items-center gap-2 p-1.5 pl-3 pr-2 rounded-full transition-all duration-300 border
                        ${dropdownOpen
                            ? (HALLOWEEN_MODE
                                ? 'bg-orange-950/40 border-orange-500/50 ring-2 ring-orange-500/30'
                                : CHRISTMAS_MODE
                                ? 'bg-red-900/30 border-red-500/40 ring-2 ring-red-500/30'
                                : 'bg-white/10 border-white/20 ring-2 ring-purple-500/30')
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-md'
                        }
                    `}
                    onClick={toggleDropdown}
                    aria-expanded={dropdownOpen}
                >
                    <span className={`hidden md:block font-teko text-xl uppercase tracking-wider text-white mr-1 transition-colors ${
                        HALLOWEEN_MODE
                            ? 'group-hover:text-orange-400'
                            : CHRISTMAS_MODE
                            ? 'group-hover:text-red-400'
                            : 'group-hover:text-purple-300'
                    }`}>
                        {user.name}
                    </span>

                    <div className="relative shrink-0">
                        {/* 🎃 ACCESORIO TEMÁTICO EN AVATAR */}
                        {HALLOWEEN_MODE ? (
                            <span className="absolute -top-3.5 -left-2 text-xl z-20 pointer-events-none rotate-[-12deg] filter drop-shadow-md select-none animate-pulse">
                                🎃
                            </span>
                        ) : CHRISTMAS_MODE ? (
                            <span className="absolute -top-3.5 -left-2.5 text-2xl z-20 pointer-events-none rotate-[-15deg] filter drop-shadow-md select-none animate-pulse">
                                🎅
                            </span>
                        ) : null}

                        <img
                            src={user.image || undefined}
                            alt={user.name || "User"}
                            className={`w-9 h-9 shrink-0 rounded-full object-cover border shadow-sm group-hover:scale-105 transition-transform ${
                                isNominated
                                    ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                                    : HALLOWEEN_MODE
                                    ? 'border-orange-500/60'
                                    : CHRISTMAS_MODE
                                    ? 'border-red-500/60'
                                    : 'border-white/20'
                            }`}
                        />
                        {/* Indicador de Estado En Línea / Nominado */}
                        <div className={`absolute bottom-0 right-0 size-2.5 border-2 border-black rounded-full ${
                            isNominated
                                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                                : HALLOWEEN_MODE
                                ? 'bg-orange-500 shadow-[0_0_8px_#f97316]'
                                : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                        }`}></div>
                    </div>

                    <LucideChevronDown size={14} className={`text-white/60 transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-white' : 'group-hover:text-white'}`} />
                </button>

                {/* Dropdown Menu Flotante */}
                {dropdownOpen && (
                    <div className={`absolute top-full right-0 mt-3 w-72 origin-top-right rounded-2xl bg-[#0c0c10]/95 backdrop-blur-2xl border ring-1 ring-white/10 z-50 animate-in fade-in zoom-in-95 duration-200 ${isNominated ? 'border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.2)]' : dropdownBorder}`}>

                        {/* Header del Perfil */}
                        <div className="relative p-5 border-b border-white/10 overflow-hidden rounded-t-2xl">
                            <div className={`absolute inset-0 ${dropdownHeaderGradient}`}></div>

                            <div className="relative z-10 flex items-center gap-3.5">
                                <div className="relative shrink-0">
                                    {HALLOWEEN_MODE ? (
                                        <span className="absolute -top-4 -left-2 text-2xl z-20 pointer-events-none rotate-[-12deg] select-none">
                                            🎃
                                        </span>
                                    ) : CHRISTMAS_MODE ? (
                                        <span className="absolute -top-4 -left-2 text-2xl z-20 pointer-events-none rotate-[-15deg] select-none">
                                            🎅
                                        </span>
                                    ) : null}

                                    <img
                                        src={user.image || undefined}
                                        alt={user.name || "User"}
                                        className={`size-12 rounded-full border-2 shadow-lg object-cover ${
                                            HALLOWEEN_MODE
                                                ? 'border-orange-500/50'
                                                : CHRISTMAS_MODE
                                                ? 'border-red-500/50'
                                                : 'border-purple-400/50'
                                        }`}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-teko text-2xl text-white uppercase tracking-wide truncate leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="font-rubik text-xs text-white/50 truncate">
                                        {user.email}
                                    </span>
                                    {isNominated && (
                                        <div className="flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 w-max">
                                            <LucideTrophy size={11} className="text-amber-400" />
                                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Nominado 2025</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Menú de Opciones */}
                        <div className="p-2 space-y-1">
                            <a
                                href="/usuario"
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-white hover:bg-white/10 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-purple-400 group-hover:bg-purple-500/15 transition-colors">
                                    <LucideUser size={16} />
                                </div>
                                <span className="flex-1">Mi Perfil</span>
                            </a>

                            <a
                                href="/comunidad/member-card"
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-white hover:bg-white/10 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-yellow-400 group-hover:bg-yellow-500/15 transition-colors">
                                    <LucideIdCard size={16} />
                                </div>
                                <span className="flex-1">Mi Member Card</span>
                            </a>

                            {!user.linkedAccounts?.discord && (
                                <button
                                    onClick={linkDiscord}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-white hover:bg-[#5865F2]/20 transition-all group text-left"
                                >
                                    <div className="p-1.5 rounded-lg bg-[#5865F2]/10 text-[#5865F2] group-hover:bg-[#5865F2] group-hover:text-white transition-colors">
                                        <LucideMessageSquare size={16} />
                                    </div>
                                    <span className="flex-1">Vincular Discord</span>
                                    <div className="size-2 rounded-full bg-orange-500 animate-pulse"></div>
                                </button>
                            )}

                            {user.isAdmin && (
                                <>
                                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                                    <a
                                        href="/admin"
                                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-purple-300 hover:bg-purple-500/15 transition-all group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 transition-colors">
                                            <LucideLayoutDashboard size={16} />
                                        </div>
                                        <span className="flex-1 font-semibold">Administración</span>
                                        <LucideShieldCheck size={14} className="text-purple-400" />
                                    </a>
                                </>
                            )}

                            <a
                                href="/saltoplay"
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-white/80 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-emerald-400 group-hover:bg-emerald-500/15 transition-colors">
                                    <LucideGamepad2 size={16} />
                                </div>
                                <span className="flex-1">SaltoPlay</span>
                            </a>
                        </div>

                        {/* Footer del Menú */}
                        <div className="p-2 border-t border-white/10 mt-1">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    // @ts-ignore
                                    signOut({ callbackUrl: '/' });
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-rubik text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all w-full text-left group"
                            >
                                <LucideLogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Pusher + Componentes diferidos */}
                {pusher && user && (
                    <Suspense fallback={null}>
                        <AchievementsNotifier userId={user.id} />
                        <CinematicPlayer userId={user.id} />
                    </Suspense>
                )}
            </div>
        );
    }

    return null;
};
