import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideTrophy, LucideUsers, LucideCalendar, LucideArrowRight } from 'lucide-preact';
import type { Tournament } from '@/types/tournaments';

interface TournamentWithCounts extends Tournament {
    participantsCount: number;
    currentUserJoined?: boolean;
}

export default function TournamentList({ tournaments: initialTournaments }: { tournaments: TournamentWithCounts[] }) {
    const [tournaments, setTournaments] = useState(initialTournaments);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'registration': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'in_progress': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'completed': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'registration': return 'Inscripciones Abiertas';
            case 'in_progress': return 'En Curso';
            case 'completed': return 'Finalizado';
            case 'draft': return 'Borrador';
            default: return status;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
                <a
                    href={`/torneos/${tournament.id}`}
                    className="group relative bg-[#1a1b1e] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all hover:shadow-xl hover:shadow-violet-900/10 block"
                >
                    <div className="h-32 bg-gradient-to-br from-violet-900/50 to-black relative">
                        {tournament.bannerUrl ? (
                            <img src={tournament.bannerUrl} alt={tournament.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <LucideTrophy className="w-12 h-12 text-white/10 group-hover:text-violet-400/20 transition-colors" />
                            </div>
                        )}
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${getStatusColor(tournament.status)}`}>
                            {getStatusLabel(tournament.status)}
                        </div>
                    </div>

                    <div className="p-5">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors truncate">
                            {tournament.name}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4 h-10">
                            {tournament.description || 'Sin descripción'}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500 border-t border-white/5 pt-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <LucideUsers className="w-4 h-4" />
                                    <span>{tournament.participantsCount}/{tournament.maxParticipants || '∞'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <LucideCalendar className="w-4 h-4" />
                                    <span>{new Date(tournament.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                <LucideArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </a>
            ))}

            {tournaments.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500">
                    <LucideTrophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No hay torneos activos en este momento.</p>
                </div>
            )}
        </div>
    );
}
