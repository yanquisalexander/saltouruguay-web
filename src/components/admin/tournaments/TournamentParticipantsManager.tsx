import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideTrash2, LucideUserX, LucideSearch } from 'lucide-preact';
import type { TournamentParticipant } from '@/types/tournaments';

interface Props {
    participants: TournamentParticipant[];
    tournamentId: number;
}

export default function TournamentParticipantsManager({ participants: initialParticipants, tournamentId }: Props) {
    const [participants, setParticipants] = useState(initialParticipants);
    const [search, setSearch] = useState('');

    const filteredParticipants = participants.filter(p =>
        p.user?.username.toLowerCase().includes(search.toLowerCase()) ||
        p.user?.displayName.toLowerCase().includes(search.toLowerCase())
    );

    const handleKick = async (userId: number, username: string) => {
        if (!confirm(`¿Expulsar a ${username} del torneo?`)) return;

        try {
            const { error } = await actions.tournaments.removeParticipant({
                tournamentId,
                userId
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            setParticipants(prev => prev.filter(p => p.userId !== userId));
            toast.success(`${username} expulsado correctamente`);
        } catch (err) {
            toast.error('Error al expulsar participante');
        }
    };

    return (
        <div>
            <div className="mb-4 relative">
                <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Buscar participante..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none"
                    value={search}
                    onInput={(e: any) => setSearch(e.target.value)}
                />
            </div>

            <div className="overflow-hidden rounded-lg border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-3">Usuario</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredParticipants.map((p) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={p.user?.avatar || `https://ui-avatars.com/api/?name=${p.user?.username}`}
                                            className="w-8 h-8 rounded-full bg-black/50"
                                        />
                                        <div>
                                            <div className="text-white font-medium text-sm">{p.user?.displayName}</div>
                                            <div className="text-gray-500 text-xs">@{p.user?.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                                        ${p.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            p.status === 'disqualified' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => handleKick(p.userId, p.user?.username || 'Usuario')}
                                        className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                        title="Expulsar"
                                    >
                                        <LucideUserX className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredParticipants.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-gray-500 text-sm">
                                    No se encontraron participantes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
