import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucidePlus, LucideTrash2, LucideShield, LucideUserX, LucideExternalLink } from 'lucide-preact';
import type { TournamentParticipant } from '@/types/tournaments';

interface TeamConfig {
    playersPerTeam: number;
    teamNamePrefix: string;
    maxTeams?: number;
    teams?: string[];
}

interface Props {
    participants: TournamentParticipant[];
    tournamentId: number;
    config: TeamConfig;
}

export default function TournamentTeamsManager({ participants: initialParticipants, tournamentId, config }: Props) {
    const [participants, setParticipants] = useState(initialParticipants);
    const [teams, setTeams] = useState<string[]>(config.teams ?? []);
    const [newTeamName, setNewTeamName] = useState('');
    const [loadingPlayer, setLoadingPlayer] = useState<Record<number, boolean>>({});
    const [savingTeams, setSavingTeams] = useState(false);

    const getTeamMembers = (teamName: string) =>
        participants.filter(p => p.teamName === teamName);

    const unassigned = participants.filter(p => !p.teamName || !teams.includes(p.teamName));

    const handleAssign = async (userId: number, teamName: string | null) => {
        setLoadingPlayer(prev => ({ ...prev, [userId]: true }));
        try {
            const { error } = await actions.tournaments.assignPlayerToTeam({
                tournamentId,
                userId,
                teamName,
            });
            if (error) { toast.error(error.message); return; }
            setParticipants(prev =>
                prev.map(p => p.userId === userId ? { ...p, teamName } : p)
            );
        } catch {
            toast.error('Error al asignar jugador');
        } finally {
            setLoadingPlayer(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleAddTeam = async () => {
        const name = newTeamName.trim();
        if (!name) return;
        if (teams.includes(name)) { toast.error('Ya existe un equipo con ese nombre'); return; }
        if (config.maxTeams && teams.length >= config.maxTeams) {
            toast.error(`Límite máximo de ${config.maxTeams} equipos alcanzado`);
            return;
        }

        const newTeams = [...teams, name];
        setSavingTeams(true);
        try {
            const { error } = await actions.tournaments.updateTeamsList({ tournamentId, teams: newTeams });
            if (error) { toast.error(error.message); return; }
            setTeams(newTeams);
            setNewTeamName('');
            toast.success(`Equipo "${name}" creado`);
        } catch {
            toast.error('Error al crear equipo');
        } finally {
            setSavingTeams(false);
        }
    };

    const handleDeleteTeam = async (teamName: string) => {
        if (!confirm(`¿Eliminar el equipo "${teamName}"? Los jugadores quedarán sin equipo asignado.`)) return;

        const newTeams = teams.filter(t => t !== teamName);
        setSavingTeams(true);
        try {
            const { error } = await actions.tournaments.updateTeamsList({ tournamentId, teams: newTeams });
            if (error) { toast.error(error.message); return; }

            // Desasignar todos los jugadores del equipo
            const membersToUnassign = getTeamMembers(teamName);
            for (const p of membersToUnassign) {
                await actions.tournaments.assignPlayerToTeam({ tournamentId, userId: p.userId, teamName: null });
            }
            setParticipants(prev =>
                prev.map(p => p.teamName === teamName ? { ...p, teamName: null } : p)
            );
            setTeams(newTeams);
            toast.success(`Equipo "${teamName}" eliminado`);
        } catch {
            toast.error('Error al eliminar equipo');
        } finally {
            setSavingTeams(false);
        }
    };

    const handleAutoAssign = async () => {
        if (!confirm('¿Asignar automáticamente los jugadores sin equipo a los equipos disponibles?')) return;
        const remaining = [...unassigned];
        if (remaining.length === 0) { toast.info('No hay jugadores sin equipo'); return; }
        if (teams.length === 0) { toast.error('Crea al menos un equipo primero'); return; }

        let teamIndex = 0;
        for (const p of remaining) {
            const team = teams[teamIndex % teams.length];
            const members = getTeamMembers(team);
            if (members.length < config.playersPerTeam) {
                await handleAssign(p.userId, team);
            }
            teamIndex++;
        }
        toast.success('Jugadores asignados automáticamente');
    };

    return (
        <div className="space-y-5">
            {/* Header stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className="text-2xl font-bold text-white">{teams.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Equipos</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className="text-2xl font-bold text-violet-400">
                        {participants.length - unassigned.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Asignados</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className={`text-2xl font-bold ${unassigned.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {unassigned.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Sin Equipo</div>
                </div>
            </div>

            {/* Create team */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={`Ej: ${config.teamNamePrefix} Alpha, ${config.teamNamePrefix} Rojo...`}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none text-sm"
                    value={newTeamName}
                    onInput={(e: any) => setNewTeamName(e.target.value)}
                    onKeyDown={(e: any) => e.key === 'Enter' && handleAddTeam()}
                />
                <button
                    onClick={handleAddTeam}
                    disabled={savingTeams || !newTeamName.trim()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                    <LucidePlus className="w-4 h-4" />
                    Crear Equipo
                </button>
            </div>

            {/* Auto assign button */}
            {unassigned.length > 0 && teams.length > 0 && (
                <button
                    onClick={handleAutoAssign}
                    className="w-full py-2 text-sm bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-colors"
                >
                    ⚡ Asignar automáticamente jugadores sin equipo
                </button>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Unassigned players */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        Sin Equipo ({unassigned.length})
                    </h3>
                    <div className="space-y-1.5 min-h-[60px]">
                        {unassigned.length === 0 ? (
                            <p className="text-gray-600 text-sm italic py-6 text-center border border-dashed border-white/5 rounded-lg">
                                ✓ Todos los jugadores tienen equipo
                            </p>
                        ) : (
                            unassigned.map(p => (
                                <PlayerRow
                                    key={p.userId}
                                    participant={p}
                                    teams={teams}
                                    currentTeam={null}
                                    loading={!!loadingPlayer[p.userId]}
                                    onAssign={(team) => handleAssign(p.userId, team)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Teams list */}
                <div className="space-y-4">
                    {teams.length === 0 ? (
                        <p className="text-gray-600 text-sm italic py-6 text-center border border-dashed border-white/5 rounded-lg">
                            Crea equipos usando el campo de arriba.
                        </p>
                    ) : (
                        teams.map(team => {
                            const members = getTeamMembers(team);
                            const isFull = members.length >= config.playersPerTeam;
                            return (
                                <div
                                    key={team}
                                    className={`rounded-xl border overflow-hidden transition-colors ${isFull
                                        ? 'border-green-500/30 bg-green-500/5'
                                        : 'border-white/10 bg-white/[0.02]'
                                        }`}
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <LucideShield className={`w-4 h-4 ${isFull ? 'text-green-400' : 'text-violet-400'}`} />
                                            <span className="font-medium text-white text-sm">{team}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${isFull
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-white/10 text-gray-400 border-white/10'
                                                }`}>
                                                {members.length}/{config.playersPerTeam}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTeam(team)}
                                            disabled={savingTeams}
                                            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                                            title="Eliminar equipo"
                                        >
                                            <LucideTrash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {members.length === 0 ? (
                                            <p className="text-gray-600 text-xs italic py-2 text-center">Sin jugadores asignados</p>
                                        ) : (
                                            members.map(p => (
                                                <PlayerRow
                                                    key={p.userId}
                                                    participant={p}
                                                    teams={teams}
                                                    currentTeam={team}
                                                    loading={!!loadingPlayer[p.userId]}
                                                    onAssign={(newTeam) => handleAssign(p.userId, newTeam)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function PlayerRow({ participant: p, teams, currentTeam, loading, onAssign }: {
    participant: TournamentParticipant;
    teams: string[];
    currentTeam: string | null;
    loading: boolean;
    onAssign: (team: string | null) => void;
}) {
    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${loading ? 'opacity-50' : 'hover:bg-black/30'}`}>
            <img
                src={p.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.username ?? '?')}`}
                className="w-7 h-7 rounded-full bg-black/50 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate leading-tight">
                    {p.user?.displayName}
                    {p.user?.discordId && (
                        <a
                            href={`https://discord.com/users/${p.user.discordId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-xs text-gray-400 hover:text-white"
                            title="Ver en Discord"
                        >
                            <LucideExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
                <div className="text-gray-500 text-xs">@{p.user?.username}</div>
            </div>
            <div className="flex items-center gap-1.5">
                <select
                    disabled={loading}
                    value={currentTeam ?? ''}
                    onChange={(e: any) => onAssign(e.target.value || null)}
                    className="text-xs bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white focus:border-violet-500 outline-none disabled:opacity-50"
                >
                    <option value="">Sin equipo</option>
                    {teams.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                {currentTeam && (
                    <button
                        onClick={() => onAssign(null)}
                        disabled={loading}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Quitar del equipo"
                    >
                        <LucideUserX className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
