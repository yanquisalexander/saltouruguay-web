import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
    LucideCheck,
    LucideX,
    LucideExternalLink,
    LucideClock,
    LucideSearch,
    LucideFilter
} from "lucide-preact";

interface Member {
    id: number;
    userId: number;
    email: string;
    discordUsername: string;
    platformType: "twitch" | "other";
    platformName: string | null;
    canalName: string;
    canalLink: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
}

export default function AcreconreMembersManager() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const fetchMembers = async () => {
        setLoading(true);
        const { data, error } = await actions.acreconre.getMembers();
        if (error) {
            toast.error("Error al cargar los miembros");
        } else {
            setMembers(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleUpdateStatus = async (memberId: number, status: "approved" | "rejected") => {
        const { error } = await actions.acreconre.updateStatus({ memberId, status });
        if (error) {
            toast.error("Error al actualizar el estado");
        } else {
            toast.success(`Miembro ${status === "approved" ? "aprobado" : "rechazado"} correctamente`);
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status } : m));
        }
    };

    const filteredMembers = members.filter(m => {
        const matchesFilter = filter === "all" || m.status === filter;
        const matchesSearch = m.canalName.toLowerCase().includes(search.toLowerCase()) ||
            m.discordUsername.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <span class="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase">Aprobado</span>;
            case "rejected":
                return <span class="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase">Rechazado</span>;
            default:
                return <span class="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase">Pendiente</span>;
        }
    };

    return (
        <div class="space-y-6">
            <div class="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <div class="relative w-full md:w-96">
                    <LucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por canal, discord o email..."
                        class="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                    />
                </div>

                <div class="flex items-center gap-3 w-full md:w-auto">
                    <LucideFilter class="text-white/40" size={18} />
                    <select
                        class="bg-black/20 border border-white/10 rounded-xl text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        value={filter}
                        onChange={(e) => setFilter((e.target as HTMLSelectElement).value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="approved">Aprobados</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                </div>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-white/10 bg-white/5">
                            <th class="p-4 text-xs font-bold uppercase tracking-wider text-white/60">Canal / Plataforma</th>
                            <th class="p-4 text-xs font-bold uppercase tracking-wider text-white/60">Discord / Email</th>
                            <th class="p-4 text-xs font-bold uppercase tracking-wider text-white/60">Estado</th>
                            <th class="p-4 text-xs font-bold uppercase tracking-wider text-white/60">Fecha</th>
                            <th class="p-4 text-xs font-bold uppercase tracking-wider text-white/60 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colspan={5} class="p-12 text-center text-white/40 italic">Cargando miembros...</td>
                            </tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr>
                                <td colspan={5} class="p-12 text-center text-white/40 italic">No se encontraron miembros</td>
                            </tr>
                        ) : (
                            filteredMembers.map(member => (
                                <tr key={member.id} class="hover:bg-white/[0.02] transition-colors">
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span class="font-bold text-white">{member.canalName}</span>
                                            <div class="flex items-center gap-2 text-xs text-white/40">
                                                <span>{member.platformName || member.platformType}</span>
                                                {member.canalLink && (
                                                    <a href={member.canalLink} target="_blank" class="text-indigo-400 hover:text-indigo-300">
                                                        <LucideExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span class="text-sm text-white/80">@{member.discordUsername}</span>
                                            <span class="text-xs text-white/40">{member.email}</span>
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        {getStatusBadge(member.status)}
                                    </td>
                                    <td class="p-4">
                                        <div class="flex items-center gap-2 text-xs text-white/40">
                                            <LucideClock size={12} />
                                            {new Date(member.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td class="p-4 text-right">
                                        <div class="flex justify-end gap-2">
                                            {member.status !== "approved" && (
                                                <button
                                                    onClick={() => handleUpdateStatus(member.id, "approved")}
                                                    class="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                                                    title="Aprobar"
                                                >
                                                    <LucideCheck size={18} />
                                                </button>
                                            )}
                                            {member.status !== "rejected" && (
                                                <button
                                                    onClick={() => handleUpdateStatus(member.id, "rejected")}
                                                    class="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                    title="Rechazar"
                                                >
                                                    <LucideX size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
