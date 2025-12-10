import { useState, useEffect } from 'preact/hooks';
import { LucideTrophy, LucideUser, LucideEdit } from 'lucide-preact';
import type { TournamentMatch, TournamentParticipant } from '@/types/tournaments';
import { actions } from 'astro:actions';
import { toast } from 'sonner';

interface Props {
    matches: TournamentMatch[];
    participants: TournamentParticipant[];
    currentUserId?: number;
    isCreator?: boolean;
}

export default function TournamentBracket({ matches, participants, currentUserId, isCreator }: Props) {
    const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);

    // Group matches by round
    const rounds = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {} as Record<number, TournamentMatch[]>);

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    const getParticipantName = (id: number | null) => {
        if (!id) return 'TBD';
        const participant = participants.find(p => p.userId === id);
        return participant?.user?.displayName || participant?.user?.username || 'Unknown';
    };

    const getParticipantAvatar = (id: number | null) => {
        if (!id) return null;
        const participant = participants.find(p => p.userId === id);
        return participant?.user?.avatar;
    };

    const handleMatchClick = (match: TournamentMatch) => {
        if (!isCreator || match.status === 'completed' || !match.player1Id || !match.player2Id) return;
        setSelectedMatch(match);
        setScore1(match.score1 || 0);
        setScore2(match.score2 || 0);
    };

    const handleUpdateMatch = async () => {
        if (!selectedMatch || !selectedMatch.player1Id || !selectedMatch.player2Id) return;

        if (score1 === score2) {
            toast.error('El partido no puede terminar en empate');
            return;
        }

        const winnerId = score1 > score2 ? selectedMatch.player1Id : selectedMatch.player2Id;

        const { error } = await actions.tournaments.updateMatch({
            matchId: selectedMatch.id,
            score1,
            score2,
            winnerId
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Resultado actualizado');
            window.location.reload();
        }
        setSelectedMatch(null);
    };

    return (
        <div className="overflow-x-auto pb-8">
            <div className="flex gap-16 min-w-max px-4">
                {roundNumbers.map((round) => (
                    <div key={round} className="flex flex-col justify-around gap-8">
                        <h3 className="text-center text-gray-400 font-bold mb-4 uppercase tracking-wider text-sm">
                            {round === roundNumbers[roundNumbers.length - 1] ? 'Final' : `Ronda ${round}`}
                        </h3>
                        <div className="flex flex-col justify-around h-full gap-8">
                            {rounds[round].sort((a, b) => a.matchOrder - b.matchOrder).map((match) => (
                                <div
                                    key={match.id}
                                    onClick={() => handleMatchClick(match)}
                                    className={`w-64 bg-[#1a1b1e] border border-white/10 rounded-lg overflow-hidden relative transition-all
                                        ${isCreator && match.status !== 'completed' && match.player1Id && match.player2Id ? 'cursor-pointer hover:border-violet-500' : ''}
                                    `}
                                >
                                    {/* Player 1 */}
                                    <div className={`p-3 flex justify-between items-center border-b border-white/5 ${match.winnerId === match.player1Id ? 'bg-green-900/20' : ''}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {getParticipantAvatar(match.player1Id) ? (
                                                <img src={getParticipantAvatar(match.player1Id)!} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                                    <LucideUser className="w-3 h-3 text-gray-400" />
                                                </div>
                                            )}
                                            <span className={`truncate text-sm ${match.winnerId === match.player1Id ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                                                {getParticipantName(match.player1Id)}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-400">{match.score1 ?? '-'}</span>
                                    </div>

                                    {/* Player 2 */}
                                    <div className={`p-3 flex justify-between items-center ${match.winnerId === match.player2Id ? 'bg-green-900/20' : ''}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {getParticipantAvatar(match.player2Id) ? (
                                                <img src={getParticipantAvatar(match.player2Id)!} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                                    <LucideUser className="w-3 h-3 text-gray-400" />
                                                </div>
                                            )}
                                            <span className={`truncate text-sm ${match.winnerId === match.player2Id ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                                                {getParticipantName(match.player2Id)}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-400">{match.score2 ?? '-'}</span>
                                    </div>

                                    {/* Status Indicator */}
                                    {match.status === 'in_progress' && (
                                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Update Match Modal */}
            {selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Actualizar Resultado</h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">{getParticipantName(selectedMatch.player1Id)}</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-center"
                                    value={score1}
                                    onInput={(e: any) => setScore1(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">{getParticipantName(selectedMatch.player2Id)}</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-center"
                                    value={score2}
                                    onInput={(e: any) => setScore2(parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedMatch(null)}
                                className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateMatch}
                                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold"
                            >
                                Guardar Resultado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
