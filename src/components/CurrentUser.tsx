import { $ } from "@/lib/dom-selector";
import type { Session } from "@auth/core/types";
import { signIn, signOut } from "auth-astro/client";
import { LucideChevronRight, LucideLoader2, LucideLogIn, LucideX } from "lucide-preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import Pusher from "pusher-js";
import { PUSHER_KEY } from "@/config";
import { PUSHER_APP_CLUSTER } from "astro:env/client";


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
        const width = 600
        const height = 700
        const left = window.innerWidth / 2 - width / 2
        const top = window.innerHeight / 2 - height / 2

        window.open(
            "/auth/twitch",
            "Twitch Login",
            `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        )
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
        const host = /* import.meta.env.DEV ? 'localhost' :  */`soketi.saltouruguayserver.com`;




        setPusher(new Pusher(PUSHER_KEY, {
            wsHost: host,
            cluster: "us2",
            enabledTransports: ['ws', 'wss'],
            forceTLS: true
        }));

    }






    return (
        <div className="flex items-center ml-2">
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
                            className="py-2 px-3 justify-center rounded-[10px] font-bold border border-transparent hover:bg-brand-gray/5 hover:border-brand-gray/10 flex items-center gap-x-2.5 leading-none hover:scale-105 transition-transform duration-300 text-white"
                            onClick={toggleDropdown}
                        >
                            <div class="relative">

                                <img
                                    src={user?.image || undefined}
                                    alt={user?.name || "User"}
                                    // gradient border
                                    className="rounded-full size-9 p-0.5 border-2 border-dotted border-l-lime-400 border-t-lime-500 border-r-lime-600 border-b-lime-700 border-tl-transparent border-tr-transparent border-bl-transparent border-br-transparent transition-all duration-300"

                                />

                            </div>

                            <span className="hidden md:flex">{user?.name}</span>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 max-w-60 w-auto rounded-md shadow-lg bg-[#0b1422] ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
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

                                    {
                                        user.streamerWarsPlayerNumber && (
                                            <a
                                                href="/guerra-streamers"
                                                className="block w-full text-left px-4 text-nowrap py-2 text-sm bg-lime-600 text-white font-rubik uppercase hover:bg-lime-700 transition"
                                            >
                                                Guerra de Streamers
                                                <LucideChevronRight size={20} className="inline-block ml-2" />
                                            </a>
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
                                        <a
                                            href="/admin"
                                            className="w-full items-center justify-between  gap-1 px-4 py-2 flex text-sm text-neutral-200 transition hover:bg-neutral-200/5"
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
