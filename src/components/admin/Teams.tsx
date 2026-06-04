import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import { actions } from "astro:actions";
import { LucideCrown, LucideX, LucideStar, LucideUsers } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { PUSHER_EVENTS } from "@/consts/pusher";

export const Teams = ({ channel }: { channel: Channel }) => {
  const [playersTeams, setPlayersTeams] = useState<{ [team: string]: { playerNumber: number; avatar: string; displayName: string; isCaptain: boolean }[] }>({});

  const handleAssignCaptain = async (playerNumber: number, team: string) => {
    const { error } = await actions.streamerWars.setTeamCaptain({ playerNumber, team });
    if (error) { toast.error(error.message); return; }
    toast.success("Capitán asignado");
  };

  const removeCaptain = async (team: string) => {
    const { error } = await actions.streamerWars.removeTeamCaptain({ team });
    if (error) { toast.error(error.message); return; }
    toast.success("Capitán removido");
  };

  const removePlayer = async (playerNumber: number) => {
    const { error } = await actions.streamerWars.removePlayerFromTeam({ playerNumber });
    if (error) { toast.error(error.message); return; }
    toast.success("Jugador removido del equipo");
  };

  useEffect(() => {
    const fetchTeams = async () => {
      const { error, data } = await actions.streamerWars.getPlayersTeams();
      if (error) return console.error(error);
      setPlayersTeams(data.playersTeams);
    };
    fetchTeams();
    channel?.bind(PUSHER_EVENTS.PLAYER_JOINED, fetchTeams);
    channel?.bind(PUSHER_EVENTS.PLAYER_REMOVED, fetchTeams);
    channel?.bind(PUSHER_EVENTS.CAPTAIN_ASSIGNED, fetchTeams);
    return () => {
      channel?.unbind(PUSHER_EVENTS.PLAYER_JOINED, fetchTeams);
      channel?.unbind(PUSHER_EVENTS.CAPTAIN_ASSIGNED, fetchTeams);
    };
  }, []);

  const COLORS: Record<string, string> = {
    [TEAMS.BLUE]: "#3498db",
    [TEAMS.RED]: "#e74c3c",
    [TEAMS.YELLOW]: "#f1c40f",
    [TEAMS.PURPLE]: "#8e44ad",
    [TEAMS.WHITE]: "#ecf0f1",
  };

  return (
    <div class="w-full pt-10">
      <div class="flex items-center gap-3 mb-6">
        <LucideUsers size={16} class="text-[#b4cd02]" />
        <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">Equipos</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(TEAMS).map((team) => {
          const members = playersTeams[team] || [];
          return (
            <div key={team} class="bg-[#0a0a0a] border border-neutral-800 rounded-lg overflow-hidden transition-all hover:border-neutral-700">
              <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800" style={{ borderLeftColor: COLORS[team], borderLeftWidth: 3 }}>
                <span class="font-anton text-sm tracking-wide text-white">{getTranslation(team)}</span>
                <span class="font-teko text-xs text-neutral-600 tracking-wider">
                  {members.length} jugadores
                </span>
              </div>
              <div class="p-3 space-y-2">
                {members.length === 0 && (
                  <p class="text-center text-neutral-700 font-mono text-xs py-4">Sin miembros</p>
                )}
                {members.map(({ playerNumber, avatar, displayName, isCaptain }) => (
                  <div key={displayName} class="flex items-center gap-3 p-2 rounded-sm bg-neutral-900/50 border border-neutral-800/50 transition-all hover:bg-neutral-900 hover:border-neutral-700">
                    <img
                      src={avatar || "/placeholder.svg"}
                      alt={displayName}
                      class="w-7 h-7 rounded-full ring-1 ring-white/10"
                    />
                    <span class="text-sm text-neutral-200 font-mono truncate flex-1 min-w-0">{displayName}</span>
                    <span class="font-atomic text-sm text-[#b4cd02] shrink-0">#{playerNumber.toString().padStart(3, "0")}</span>
                    <div class="flex items-center gap-1 shrink-0">
                      {isCaptain ? (
                        <>
                          <span class="bg-[#b4cd02]/20 text-[#b4cd02] p-1 rounded-sm" title="Capitán">
                            <LucideCrown size={14} />
                          </span>
                          <button
                            onClick={() => removeCaptain(team)}
                            class="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                            title="Remover capitán"
                          >
                            <LucideX size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAssignCaptain(playerNumber, team)}
                          class="p-1 text-neutral-600 hover:text-[#b4cd02] transition-colors"
                          title="Asignar como capitán"
                        >
                          <LucideStar size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => removePlayer(playerNumber)}
                        class="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                        title="Remover jugador"
                      >
                        <LucideX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
