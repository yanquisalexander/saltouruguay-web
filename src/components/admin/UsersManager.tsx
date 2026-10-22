import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import {
    User,
    Mail,
    Calendar,
    ShieldCheck,
    Search,
    X,
    Loader2,
    Users as UsersIcon,
    Shield,
    ExternalLink
} from "lucide-preact";
import { useDebounce } from "@/hooks/useDebounce";

interface AdminUser {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    admin: boolean;
    avatar: string;
}

export default function UsersManager() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
    const debouncedSearch = useDebounce(search, 400);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Reset pagination when search changes
    useEffect(() => {
        setPage(1);
        setUsers([]);
        setHasMore(true);
    }, [debouncedSearch]);

    // Fetch users
    useEffect(() => {
        if (!hasMore || loading) return;

        let cancelled = false;

        const loadMore = async () => {
            setLoading(true);
            const { data, error } = await actions.admin.serverTools.getUsers({
                page,
                limit: 15,
                search: debouncedSearch,
            });

            if (cancelled) return;
            setLoading(false);

            if (error) {
                toast.error("Error al cargar los usuarios");
                console.error("Error loading users:", error);
                return;
            }

            if (data) {
                const newUsers: AdminUser[] = data.users.map((user) => ({
                    id: user.id,
                    avatar: user.avatar || "",
                    name: user.displayName || user.username || "Usuario sin nombre",
                    email: user.email,
                    createdAt: new Date(user.createdAt),
                    admin: !!user.admin,
                }));

                setUsers((prev) => (page === 1 ? newUsers : [...prev, ...newUsers]));
                setHasMore(data.hasMore);
                setPage((prev) => prev + 1);
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !loading && hasMore) {
                    loadMore();
                }
            },
            { rootMargin: "150px" }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [page, hasMore, debouncedSearch, loading]);

    // Role filtering in memory on loaded users
    const filteredUsers = users.filter((u) => {
        if (roleFilter === "admin") return u.admin;
        if (roleFilter === "user") return !u.admin;
        return true;
    });

    const adminCount = users.filter((u) => u.admin).length;

    return (
        <div className="space-y-4">
            {/* Barra superior de herramientas y filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, usuario o email..."
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                        className="w-full pl-10 pr-9 py-2 text-sm bg-black/40 text-white placeholder:text-white/30 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtros de rol y contador */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                        <button
                            onClick={() => setRoleFilter("all")}
                            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                                roleFilter === "all"
                                    ? "bg-violet-600/30 text-white border border-violet-400/30 font-semibold"
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            Todos ({users.length})
                        </button>
                        <button
                            onClick={() => setRoleFilter("admin")}
                            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                roleFilter === "admin"
                                    ? "bg-violet-600/30 text-white border border-violet-400/30 font-semibold"
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            <ShieldCheck size={13} className="text-violet-400" />
                            Staff ({adminCount})
                        </button>
                        <button
                            onClick={() => setRoleFilter("user")}
                            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                                roleFilter === "user"
                                    ? "bg-violet-600/30 text-white border border-violet-400/30 font-semibold"
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            Miembros ({users.length - adminCount})
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla Principal */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-rubik font-semibold text-white/50 tracking-wider">
                                <th className="py-3.5 px-5">Usuario</th>
                                <th className="py-3.5 px-5">Correo Electrónico</th>
                                <th className="py-3.5 px-5">Fecha de Registro</th>
                                <th className="py-3.5 px-5 text-right">Rol</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] text-sm">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="group hover:bg-white/[0.03] transition-colors"
                                >
                                    {/* Celda de Usuario */}
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                                                {user.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        className="size-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="font-anton text-xs text-white/60">
                                                        {user.name.slice(0, 2).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-rubik font-semibold text-white truncate group-hover:text-violet-200 transition-colors">
                                                    {user.name}
                                                </span>
                                                <span className="text-[11px] font-mono text-white/35">
                                                    ID #{user.id}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Celda de Correo */}
                                    <td className="py-3.5 px-5 font-rubik text-white/70">
                                        <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                                            <Mail size={14} className="text-white/35 shrink-0" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    </td>

                                    {/* Celda de Fecha */}
                                    <td className="py-3.5 px-5 font-rubik text-white/60 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={13} className="text-white/30 shrink-0" />
                                            <span>
                                                {user.createdAt.toLocaleDateString("es-UY", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Celda de Rol */}
                                    <td className="py-3.5 px-5 text-right">
                                        <RoleBadge isAdmin={user.admin} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="size-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/30 mb-3">
                            <UsersIcon size={22} />
                        </div>
                        <p className="font-rubik font-medium text-white text-sm">
                            No se encontraron usuarios
                        </p>
                        <p className="font-rubik text-xs text-white/40 mt-1 max-w-sm">
                            {search
                                ? `No hay resultados para "${search}". Intenta con otro término.`
                                : "No hay miembros registrados para mostrar."}
                        </p>
                    </div>
                )}

                {/* Trigger de Infinite Scroll */}
                <div ref={loaderRef} className="py-4 flex items-center justify-center">
                    {loading && (
                        <div className="flex items-center gap-2 text-xs font-rubik text-white/40">
                            <Loader2 size={16} className="animate-spin text-violet-400" />
                            <span>Cargando más miembros...</span>
                        </div>
                    )}
                    {!hasMore && users.length > 0 && (
                        <span className="text-[11px] font-rubik text-white/30">
                            Has llegado al final de la lista ({users.length} usuarios)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
    if (isAdmin) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-rubik font-semibold bg-violet-500/15 text-violet-300 border border-violet-400/30 shadow-xs shadow-violet-950/40">
                <ShieldCheck size={13} className="text-violet-400" />
                Staff Admin
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-rubik font-medium bg-white/[0.04] text-white/60 border border-white/[0.08]">
            <User size={13} className="text-white/40" />
            Miembro
        </span>
    );
}
