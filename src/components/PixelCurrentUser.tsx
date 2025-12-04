import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { signIn, signOut } from "auth-astro/client";
import type { Session } from "@auth/core/types";
import { LucideLogOut, LucideUser, LucideTwitch } from 'lucide-preact';

interface PixelCurrentUserProps {
    user: Session['user'] | null;
}

export default function PixelCurrentUser({ user }: PixelCurrentUserProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) {
        return (
            <button
                onClick={() => signIn("twitch")}
                className="pixel-btn-chunky variant-violet flex gap-2 items-center px-4 w-auto"
                title="Iniciar Sesión"
            >
                <LucideTwitch size={20} />
                <span className="font-vt323 text-lg hidden md:inline">LOGIN</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="flex items-center gap-3 bg-[#1f2937] border-4 border-[#374151] p-1 pr-4 hover:bg-[#374151] transition-colors group"
                style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}
            >
                <div className="w-10 h-10 border-2 border-black overflow-hidden relative">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <LucideUser size={20} />
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-press-start-2p text-[10px] text-yellow-400 leading-tight group-hover:text-white transition-colors">
                        {user.name}
                    </span>
                    <span className="font-vt323 text-gray-400 text-sm leading-none mt-1">
                        ONLINE
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 z-50 pixel-panel p-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-2 py-1 border-b-2 border-gray-700 mb-1">
                        <p className="font-vt323 text-gray-400 text-sm">Conectado como</p>
                        <p className="font-press-start-2p text-[10px] text-white truncate">{user.name}</p>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 w-full p-2 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors font-vt323 text-lg text-left"
                    >
                        <LucideLogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );
}
