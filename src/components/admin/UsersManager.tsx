import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { User, Mail, Calendar, ShieldCheck } from "lucide-preact";
import { useDebounce } from "@/hooks/useDebounce";



export default function UsersManager() {
    const [users, setUsers] = useState<
        { id: number; name: string; email: string; createdAt: Date; admin: boolean, avatar: string }[]
    >([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const loaderRef = useRef(null);

    useEffect(() => {
        setPage(1);
        setUsers([]);
        setHasMore(true);
    }, [debouncedSearch]);

    useEffect(() => {
        if (!hasMore) return;

        const loadMore = async () => {
            const { data, error } = await actions.admin.serverTools.getUsers({
                page,
                limit: 10,
                search: debouncedSearch,
            });

            if (error) {
                toast.error("Error al cargar los usuarios");
                console.error("Error loading users:", error);
                return;
            }

            if (data) {
                setUsers(prev => [
                    ...prev,
                    ...data.users.map((user) => ({
                        id: user.id,
                        avatar: user.avatar!,
                        name: user.displayName,
                        email: user.email,
                        createdAt: new Date(user.createdAt),
                        admin: user.admin,
                    })),
                ]);
                setHasMore(data.hasMore);
                setPage(prev => prev + 1);
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && loadMore(),
            { rootMargin: "100px" }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [page, hasMore, debouncedSearch]);

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-[#13131f]">
                    <tr className="border-b transition-colors border-[#1f1f2f] hover:bg-[#13131f]">
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                                className="w-full px-2 py-1 text-xs bg-[#09090f] text-slate-300 border border-slate-600 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                            />
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Correo</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Fecha de Registro</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Rol</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {users.map(user => (
                        <tr key={user.id} className="border-b transition-colors border-[#1f1f2f] hover:bg-[#13131f] bg-[#09090f]">
                            <td className="p-4 align-middle text-slate-300 font-mono text-xs flex items-center gap-2">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                {user.name}
                            </td>
                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">
                                <Mail size={14} className="inline-block mr-1" /> {user.email}
                            </td>
                            <td className="p-4 align-middle font-mono text-xs text-slate-300">
                                <Calendar size={14} className="inline-block mr-1" />
                                {new Date(user.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4 align-middle">
                                {
                                    <RoleBadge role={user.admin ? "admin" : "user"} />
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasMore && <div ref={loaderRef} className="text-center py-4">Cargando más usuarios...</div>}
        </div>
    );
}

/**
 * Muestra una etiqueta según el rol del usuario
 */
function RoleBadge({ role }: { role: string }) {
    const roleStyles = {
        admin: { icon: <ShieldCheck size={14} />, color: "bg-red-600", text: "Administrador" },
        user: { icon: <User size={14} />, color: "bg-blue-600", text: "Usuario" },
    };

    const roleData = roleStyles[role as keyof typeof roleStyles] ||
        { icon: <User size={14} />, color: "bg-gray-600", text: `Rol desconocido (${role})` };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded-md ${roleData.color}`}>
            {roleData.icon} {roleData.text}
        </span>
    );
}
