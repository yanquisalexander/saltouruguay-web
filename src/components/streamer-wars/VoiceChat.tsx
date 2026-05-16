import { useEffect } from "preact/hooks";
import { useVoiceChatStore } from "@/stores/voiceChat";
import { LucideMicOff, Radio } from "lucide-preact";
import { type Players } from "../admin/streamer-wars/Players";
import { VoiceChatManager } from "@/services/voiceChatManager";

interface VoiceChatProps {
  userId: string;
  teamId: string | null;
  isAdmin: boolean;
  players: Players[];
}

export const VoiceChat = ({ userId, teamId, isAdmin, players }: VoiceChatProps) => {
  const {
    currentTeamId,
    voiceEnabledTeams,
    spectatingTeams,
    isLocalMicEnabled,
    isAdminSpectator,
    setCurrentTeamId,
    setIsAdminSpectator,
    peerCount,
    talkingUsers,
    connectionError
  } = useVoiceChatStore();

  // 1. Sync Store State & Init Manager
  useEffect(() => {
    if (teamId !== currentTeamId) {
      setCurrentTeamId(teamId);
    }
  }, [teamId, currentTeamId]);

  useEffect(() => {
    setIsAdminSpectator(isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    if (!teamId || !voiceEnabledTeams[teamId]) return;
    const manager = VoiceChatManager.getInstance();
    manager.init(userId, teamId, isAdmin, voiceEnabledTeams, spectatingTeams);
  }, [userId, teamId, isAdmin, voiceEnabledTeams, spectatingTeams]);

  // UI Setup
  const extractTeamName = (id: string | null) => {
    if (!id) return 'NONE';
    // Maneja ambos formatos: "blue" o "team-blue"
    return id.split('-').pop()?.toUpperCase() || 'UNKNOWN';
  };
  const teamName = extractTeamName(teamId);
  const teamPlayers = players.filter(p => p.teamId === teamId);

  // Render Check: Solo renderizar cuando el voice esté habilitado para este team
  if (!teamId || !voiceEnabledTeams[teamId]) return null;

  return (
    <div className={`fixed ${isAdminSpectator ? 'top-4 left-4' : 'bottom-4 right-4'} z-50 flex flex-col items-center select-none`}>
      {/* Antena del Walkie */}
      <div className="w-3 h-12 bg-zinc-900 rounded-t-lg -mb-2 ml-auto mr-6 border border-zinc-800 shadow-md"></div>

      {/* Cuerpo Principal del Walkie Talkie */}
      <div className="bg-zinc-800 rounded-3xl w-56 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8)] border-2 border-zinc-700 p-4 pt-6 relative flex flex-col gap-4">

        {/* LED Indicador arriba a la izquierda */}
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isLocalMicEnabled
          ? 'bg-red-500 shadow-[0_0_15px_3px_rgba(239,68,68,0.9)] animate-pulse'
          : 'bg-red-900 border border-red-950'
          }`} />

        {/* Pantalla Verde Retro */}
        <div className="bg-emerald-950/80 border-4 border-zinc-900 rounded-xl p-3 text-emerald-500 font-press-start-2p flex flex-col gap-3 shadow-inner">
          <div className="flex justify-between w-full items-center text-[9px] opacity-80">
            <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> {teamName}</span>
            <span>CH:0{peerCount}</span>
          </div>

          <div className="text-center text-xs mt-1 relative">
            {!isAdminSpectator && (
              <div className={`transition-all duration-100 ${isLocalMicEnabled ? 'text-emerald-300' : 'opacity-40'}`}>
                {isLocalMicEnabled ? '- TX -' : '- RX -'}
              </div>
            )}
            {isAdminSpectator && <div className="text-emerald-700 opacity-60">SPECTATE</div>}
            {connectionError && <div className="text-[8px] text-red-500 mt-2">{connectionError}</div>}
          </div>
        </div>

        {/* Rejilla de altavoz perforada */}
        <div className="w-full flex justify-center mt-1">
          <div className="grid grid-cols-6 gap-x-2 gap-y-2 opacity-40 p-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-black shadow-inner"></div>
            ))}
          </div>
        </div>

        {/* Miembros del escuadrón */}
        {teamPlayers.length > 0 && (
          <div className="mt-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-700/50">
            <div className="flex flex-wrap gap-2 justify-center">
              {teamPlayers.slice(0, 6).map(player => {
                const isTalking = talkingUsers.includes(player.id);
                // Si es el usuario actual, chequeamos si su mic está habilitado
                const isSelf = player.id === userId;
                const active = isSelf ? isLocalMicEnabled : isTalking;

                return (
                  <div key={player.id} className="relative group">
                    <img
                      src={player.avatar}
                      alt={player.displayName}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-150 object-cover
                        ${active ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] scale-110' : 'border-zinc-600 grayscale-[0.5]'}
                      `}
                      onError={(e) => e.currentTarget.src = "/fallback.png"}
                    />
                    {isSelf && !active && (
                      <div className="absolute -bottom-1 -right-1 bg-zinc-800 rounded-full p-[2px]">
                        <LucideMicOff className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};