import { useState, useEffect } from "preact/hooks";
import { LucideSearch, LucideUser, LucideLoader2, LucideX } from "lucide-preact";

interface User {
    id: number;
    username: string;
    displayName: string;
    avatar: string | null;
}

interface UserPickerProps {
    onSelect: (user: User) => void;
    onClose: () => void;
}

export default function UserPicker({ onSelect, onClose }: UserPickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                searchUsers();
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const searchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-[#242526] z-50 flex flex-col animate-in slide-in-from-bottom-10">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="relative flex-1">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                    <input
                        type="text"
                        value={query}
                        onInput={(e) => setQuery(e.currentTarget.value)}
                        placeholder="Buscar usuario..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:border-white/30"
                        autoFocus
                    />
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white">
                    Cancelar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <LucideLoader2 className="animate-spin text-white/50" />
                    </div>
                ) : results.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {results.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => onSelect(user)}
                                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                            >
                                <img
                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                    className="w-10 h-10 rounded-full bg-white/10 object-cover"
                                />
                                <div>
                                    <p className="text-white font-medium text-sm">{user.displayName}</p>
                                    <p className="text-white/50 text-xs">@{user.username}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : query.length >= 2 ? (
                    <div className="text-center py-8 text-white/30 text-sm">
                        No se encontraron usuarios
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                        <LucideUser size={48} />
                        <p className="text-sm">Busca amigos para mencionar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
