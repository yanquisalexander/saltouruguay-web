import { $ } from "@/lib/dom-selector";
import type { Session } from "@auth/core/types";
import { signIn, signOut } from "auth-astro/client";
import { LucideLoader2, LucideLogIn, LucideX } from "lucide-preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import Pusher from "pusher-js";
import { PUSHER_KEY } from "@/config";


export const CurrentUser = ({ user: initialUser, isPrerenderedPath }: { user: Session['user'] | null, isPrerenderedPath: boolean }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(isPrerenderedPath && !initialUser); // Estado para gestionar la carga inicial
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [signingIn, setSigningIn] = useState(false);
    const [user, setUser] = useState<Session['user'] | null>(initialUser);
    const [pusher, setPusher] = useState<Pusher | null>(null);

    const fetchUserFromServer = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/auth/session");
            const data = await response?.json();
            setUser(data?.user || null);
        } catch (error) {
            console.error("Error al obtener el usuario", error);
        } finally {
            setLoading(false);
            setFetchingUser(false); // Ya no estamos esperando la respuesta
        };
    };

    const handleSignIn = async () => {
        const $signInDialog = $("#login-modal") as HTMLDialogElement;

        if ($signInDialog) {
            $signInDialog.showModal();
            return;
        }
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

    if (!pusher) {
        const host = import.meta.env.DEV ? 'localhost' : 'api.pusherapp.com';
        const port = (import.meta.env.DEV ? 6001 : 443)

        let pusherSettings = {
            wsHost: host,
            wsPort: port,
            forceTLS: port === 443,
            cluster: "us2",
        }

        if (import.meta.env.DEV) {
            pusherSettings = {
                ...pusherSettings,
                // @ts-ignore
                enabledTransports: ['ws', 'wss']
            }
            setPusher(new Pusher(PUSHER_KEY, pusherSettings));
        }
    }






    return (
        <div className="flex items-center ml-2">
            {/* Mostrar el spinner si estamos obteniendo datos en una ruta prerenderizada */}
            {fetchingUser ? (
                <LucideLoader2 class="animate-spin-clockwise animate-iteration-count-infinite inline-block mr-2" size={20} />
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
                            className="py-2 px-3 justify-center rounded-[10px] font-bold border border-transparent hover:bg-brand-gray/5 hover:border-brand-gray/10 flex items-center gap-x-2.5 leading-none hover:scale-105 transition-transform duration-300 text-white"
                            onClick={toggleDropdown}
                        >
                            <div class="relative">

                                <img
                                    src={user?.image || undefined}
                                    alt={user?.name || "User"}
                                    className="rounded-full w-8 h-8"
                                />

                                <img src={'/images/guirnalda.webp'} class="z-10 absolute inset-0 size-8 object-contain scale-[1.5] -top-1 left-0.5  aspect-square rounded-full" />
                            </div>

                            <span className="hidden md:flex">{user?.name}</span>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                <div className="py-1" role="menu">
                                    {
                                        !user.discordId && (
                                            <button
                                                onClick={linkDiscord}
                                                className="block w-full text-left px-4 text-nowrap py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Vincular Discord
                                            </button>
                                        )
                                    }
                                    <a
                                        href="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Perfil
                                    </a>
                                    {user.isAdmin && (
                                        <a
                                            href="/admin"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Administración
                                        </a>
                                    )}
                                    <a
                                        href="/api/auth/signout"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // @ts-ignore
                                            signOut({ callbackUrl: '/' });
                                        }}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                                <AchievementsNotifier userId={user.id} pusher={pusher} />
                                <CinematicPlayer userId={user.id} pusher={pusher} />
                            </>
                        )
                    }

                </>
            )}
        </div>
    );
};
