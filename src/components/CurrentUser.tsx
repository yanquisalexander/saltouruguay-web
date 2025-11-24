import { $ } from "@/lib/dom-selector";
import type { Session } from "@auth/core/types";
import { signIn, signOut } from "auth-astro/client";
import { LucideChevronRight, LucideLoader2, LucideLogIn, LucideX, Twitch } from "lucide-preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import { usePusher } from "@/hooks/usePusher";
import { navigate } from "astro:transitions/client";


export const CurrentUser = ({ user: initialUser, isPrerenderedPath }: { user: Session['user'] | null, isPrerenderedPath: boolean }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(isPrerenderedPath && !initialUser); // Estado para gestionar la carga inicial
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [signingIn, setSigningIn] = useState(false);
    const [user, setUser] = useState<Session['user'] | null>(initialUser);
    const { pusher } = usePusher();

    const fetchUserFromServer = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/auth/session");

            // If the response is 200, check if the user is suspended
            if (response.status === 200) {
                const data = await response.json();
                setUser(data?.user || null);

                // If user is suspended, redirect to suspended page
                if (data?.user?.isSuspended) {
                    navigate("/suspended"); // Redirect to suspended page
                    return; // Stop further processing
                }
            }
        } catch (error) {
            console.error("Error al obtener el usuario", error);
        } finally {
            setLoading(false);
            setFetchingUser(false); // Ya no estamos esperando la respuesta
        }
    };

    const handleSignIn = async () => {
        const width = 600
        const height = 700
        const left = window.innerWidth / 2 - width / 2
        const top = window.innerHeight / 2 - height / 2

        window.open(
            "/auth/twitch",
            "Twitch Login",
            `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        )

        window.addEventListener('SignInError', () => {
            toast.error('¡Ups! Ocurrió un error al iniciar sesión!')
        }, { once: true })
    };

    const linkDiscord = async () => {
        //toast('Próximamente...')
        //return
        window.location.href = `/api/discord/link`
    }

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    // Solo hacer fetch en rutas prerenderizadas y si el user es null
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



    return (
        <div className="flex items-center">
            {/* Mostrar el spinner si estamos obteniendo datos en una ruta prerenderizada */}
            {fetchingUser ? (
                <div className="flex items-center py-[17px] px-3">
                    <LucideLoader2 class="animate-spin-clockwise animate-iteration-count-infinite inline-block mr-2" size={20} />
                </div>
            ) : (
                // Mostrar el botón de iniciar sesión solo si no hay un usuario autenticado y no estamos cargando
                !user && !loading && (
                    <button
                        className="bg-[#5865F2]/20 border border-[#5865F2] hover:drop-shadow-[0_0px_20px_rgba(8,_112,_184,_0.9)] hover:scale-105 gap-1.5 text-white px-4 py-2 rounded-md flex items-center transition-transform duration-300 will-change-transform transform disabled:opacity-50 disabled:cursor-progress"
                        onClick={handleSignIn}
                        disabled={loading}
                        aria-label="Iniciar sesión"
                        aria-busy={loading}
                        aria-disabled={loading}
                    >
                        {signingIn ? (
                            <LucideLoader2 class="animate-spin-clockwise animate-iteration-count-infinite inline-block mr-2" size={20} />
                        ) : (
                            <LucideLogIn size={20} className="inline-block mr-2" />
                        )}
                        Iniciar sesión
                    </button>
                )
            )}

            {/* Mostrar información del usuario solo si hay un usuario autenticado */}
            {user && (
                <>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="py-2 px-3 justify-center rounded-2xl font-bold border border-transparent hover:bg-brand-gray/5 hover:border-brand-gray/10 flex items-center gap-x-2.5 leading-none hover:scale-105 transition-transform duration-300 text-white"
                            onClick={toggleDropdown}
                        >
                            <div class="relative">

                                <img
                                    src={user?.image || undefined}
                                    alt={user?.name || "User"}
                                    // gradient border
                                    class={`rounded-full size-9 p-0.5 border-2 border-dotted border-l-purple-400 border-t-purple-500 border-r-purple-600 border-b-purple-700  transition-all duration-300`}

                                />

                            </div>

                            <span className="hidden md:flex">{user?.name}</span>
                        </button>
                        {dropdownOpen && (
                            <div className="z-10 overflow-hidden mt-2 bg-[#0B1422] rounded-2xl border border-line backdrop-blur w-max animate-fade-in animate-duration-100 absolute right-0 min-w-56">
                                <div class="flex flex-col relative gap-1.5 py-3 px-4 border-b border-line before:w-1/3 before:aspect-square before:top-0 before:left-1/2 before:translate-x-16 before:-translate-y-1/2 before:rounded-full before:bg-blue-500/50 before:absolute before:blur-2xl">
                                    <span class="font-bold flex items-center gap-2">
                                        <Twitch size={20} />
                                        {user.name}
                                    </span>
                                    <span class="text-sm text-brand-gray">
                                        {user.email}
                                    </span>
                                </div>
                                <div className="py-1.5 border-b border-line" role="menu">
                                    {
                                        !user.discordId && (
                                            <button
                                                onClick={linkDiscord}
                                                className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
                                            >
                                                Vincular Discord
                                            </button>
                                        )
                                    }


                                    <a
                                        href="/usuario"
                                        className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
                                    >
                                        Mi cuenta
                                        <span class="px-2 py-0.5 text-xs text-white group-hover:opacity-100 transition bg-[#09f] rounded-lg">Nuevo</span>
                                    </a>


                                    {user.isAdmin && (
                                        <>
                                            <a
                                                href="/admin"
                                                className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
                                            >
                                                Administración
                                            </a>
                                            <a
                                                href="/saltoplay"
                                                className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
                                            >
                                                Centro de Juegos SaltoPlay
                                            </a>
                                        </>
                                    )}


                                    <a
                                        href="/api/auth/signout"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // @ts-ignore
                                            signOut({ callbackUrl: '/' });
                                        }}
                                        className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
                                    >
                                        Cerrar sesión
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                    {
                        pusher && (
                            <>
                                <AchievementsNotifier userId={user.id} />
                                <CinematicPlayer userId={user.id} />
                            </>
                        )
                    }

                </>
            )}
        </div>
    );
};
