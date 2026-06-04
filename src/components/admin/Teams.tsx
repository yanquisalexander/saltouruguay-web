import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import { actions } from "astro:actions";
import { LucideCrown, LucideX, LucideStar, LucideUsers, LucidePlus, LucideUserPlus } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { PUSHER_EVENTS } from "@/consts/pusher";

interface AllPlayer {
  playerNumber: number;
  displayName: string;
  avatar: string;
}

export const Teams = ({ channel }: { channel: Channel }) => {
  const [playersTeams, setPlayersTeams] = useState<{ [team: string]: { playerNumber: number; avatar: string; displayName: string; isCaptain: boolean }[] }>({});
  const [allPlayers, setAllPlayers] = useState<AllPlayer[]>([]);
  const [addToTeam, setAddToTeam] = useState<string | null>(null);

  const unassignedPlayers = allPlayers.filter(
    (p) => !Object.values(playersTeams).some((members) => members.some((m) => m.playerNumber === p.playerNumber)),
  );

  const fetchAll = async () => {
    const [{ data: teamsData }, { data: playersData }] = await Promise.all([
      actions.streamerWars.getPlayersTeams(),
      actions.streamerWars.getPlayers(),
    ]);
    if (teamsData) setPlayersTeams(teamsData.playersTeams);
    if (playersData) {
      setAllPlayers(
        playersData.players.map((p: any) => ({
          playerNumber: p.playerNumber,
          displayName: p.displayName || p.name || "",
          avatar: p.avatar || "",
        })),
      );
    }
  };

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
    fetchAll();
    channel?.bind(PUSHER_EVENTS.PLAYER_JOINED, fetchAll);
    channel?.bind(PUSHER_EVENTS.PLAYER_REMOVED, fetchAll);
    channel?.bind(PUSHER_EVENTS.CAPTAIN_ASSIGNED, fetchAll);
    return () => {
      channel?.unbind(PUSHER_EVENTS.PLAYER_JOINED, fetchAll);
      channel?.unbind(PUSHER_EVENTS.CAPTAIN_ASSIGNED, fetchAll);
    };
  }, []);

  const TEAM_COLORS: Record<string, string> = {
    blue: "#3498db",
    red: "#e74c3c",
    yellow: "#f1c40f",
    purple: "#8e44ad",
    white: "#ecf0f1",
  };

  const TEAM_DOT: Record<string, string> = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    yellow: "bg-yellow-400",
    purple: "bg-purple-500",
    white: "bg-gray-100",
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
              <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800" style={{ borderLeftColor: TEAM_COLORS[team] ?? "#666", borderLeftWidth: 3 }}>
                <span class="font-anton text-sm tracking-wide text-white">{getTranslation(team)}</span>
                <div class="flex items-center gap-3">
                  <span class="font-teko text-xs text-neutral-600 tracking-wider">{members.length} jugadores</span>
                  <button
                    onClick={() => setAddToTeam(team)}
                    class="p-1 text-neutral-600 hover:text-[#b4cd02] transition-colors"
                    title="Añadir jugador"
                  >
                    <LucidePlus size={14} />
                  </button>
                </div>
              </div>
              <div class="p-3 space-y-2">
                {members.length === 0 && (
                  <p class="text-center text-neutral-700 font-mono text-xs py-4">Sin miembros</p>
                )}
                {members.map(({ playerNumber, avatar, displayName, isCaptain }) => (
                  <div key={displayName} class="flex items-center gap-3 p-2 rounded-sm bg-neutral-900/50 border border-neutral-800/50 transition-all hover:bg-neutral-900 hover:border-neutral-700">
                    <img src={avatar || "/placeholder.svg"} alt={displayName} class="w-7 h-7 rounded-full ring-1 ring-white/10" />
                    <span class="text-sm text-neutral-200 font-mono truncate flex-1 min-w-0">{displayName}</span>
                    <span class="font-atomic text-sm text-[#b4cd02] shrink-0">#{playerNumber.toString().padStart(3, "0")}</span>
                    <div class="flex items-center gap-1 shrink-0">
                      {isCaptain ? (
                        <>
                          <span class="bg-[#b4cd02]/20 text-[#b4cd02] p-1 rounded-sm" title="Capitán"><LucideCrown size={14} /></span>
                          <button onClick={() => removeCaptain(team)} class="p-1 text-neutral-600 hover:text-red-400 transition-colors" title="Remover capitán"><LucideX size={14} /></button>
                        </>
                      ) : (
                        <button onClick={() => handleAssignCaptain(playerNumber, team)} class="p-1 text-neutral-600 hover:text-[#b4cd02] transition-colors" title="Asignar como capitán"><LucideStar size={14} /></button>
                      )}
                      <button onClick={() => removePlayer(playerNumber)} class="p-1 text-neutral-600 hover:text-red-400 transition-colors" title="Remover jugador"><LucideX size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Player to Team Modal */}
      {addToTeam && (
        <div class="fixed inset-0 z-99999999 flex items-center justify-center" onClick={() => setAddToTeam(null)}>
          <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div
            class="relative bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[60vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center gap-3 pb-4 mb-4 border-b border-neutral-800">
              <span class={`w-3 h-3 rounded-full ${TEAM_DOT[addToTeam] || "bg-neutral-500"}`} />
              <span class="font-anton text-xs tracking-[0.25em] uppercase text-white">
                Añadir jugador a {getTranslation(addToTeam)}
              </span>
              <button onClick={() => setAddToTeam(null)} class="ml-auto text-neutral-600 hover:text-white transition-colors">
                <LucideX size={16} />
              </button>
            </div>

            {unassignedPlayers.length === 0 ? (
              <p class="text-center text-neutral-700 font-mono text-sm py-8">No hay jugadores sin equipo</p>
            ) : (
              <div class="space-y-1">
                {unassignedPlayers.map((p) => (
                  <button
                    key={p.playerNumber}
                    class="w-full flex items-center gap-3 p-3 rounded-sm bg-neutral-900/50 border border-neutral-800/50 hover:bg-[#b4cd02]/10 hover:border-[#b4cd02]/30 transition-all text-left"
                    onClick={() => {
                      toast.promise(actions.streamerWars.assignPlayerToTeam({
                        playerNumber: p.playerNumber,
                        team: addToTeam,
                      }), {
                        loading: `Asignando #${p.playerNumber}...`,
                        success: () => { setAddToTeam(null); return `#${p.playerNumber} asignado a ${getTranslation(addToTeam)}`; },
                        error: "Error al asignar",
                      });
                    }}
                  >
                    <span class="font-atomic text-sm text-[#b4cd02] shrink-0">#{p.playerNumber.toString().padStart(3, "0")}</span>
                    <span class="text-sm text-neutral-300 font-mono truncate">{p.displayName}</span>
                    <LucideUserPlus size={14} class="ml-auto text-neutral-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
