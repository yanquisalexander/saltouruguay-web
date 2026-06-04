import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Teams } from "../Teams";
import { CINEMATICS_CDN_PREFIX } from "@/config";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "@/consts/pusher";
import { LucidePlus, LucideTrash2, LucideFilm, LucideX, LucideUserPlus, LucideUsers, LucideSkull, LucideShuffle } from "lucide-preact";

export interface Players {
  id?: number;
  playerNumber: number;
  displayName: string;
  avatar: string;
  admin: boolean;
  online: boolean;
  eliminated: boolean;
  aislated?: boolean;
  isLiveOnTwitch?: boolean;
  team?: string;
}

const CINEMATICS_LIST = Array.from({ length: 11 }, (_, i) => ({
  id: `animacion-juego-${i + 1}`,
  name: `Animación de juego ${i + 1}`,
}));

const BTN = "flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-[#b4cd02]/30 text-white font-anton text-xs tracking-[0.2em] uppercase py-2.5 px-4 rounded-sm transition-all";
const DIALOG = "max-w-[540px] w-full fixed inset-0 m-auto z-99999999 p-8 animate-fade-in-up bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl text-white";

const Morgue = ({ players, onClick }: { players: Players[]; onClick: (playerNumber: number) => void }) => {
  return (
    <div class="flex flex-col items-center w-full pt-10">
      <div class="flex items-center gap-3 mb-6 w-full">
        <LucideSkull size={16} class="text-red-500" />
        <span class="font-anton text-xs tracking-[0.25em] uppercase text-red-500">Morgue</span>
        <span class="ml-auto font-teko text-[10px] tracking-widest text-neutral-700">{players.length} eliminados</span>
      </div>
      <div class="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full">
        {players.map((player) => (
          <button
            class="flex flex-col relative overflow-hidden items-center hover:scale-105 hover:bg-red-500/10 transition-all border border-neutral-800 hover:border-red-500/30 rounded-lg p-4 bg-[#0a0a0a]"
            key={player.id}
            onClick={() => onClick(player.playerNumber)}
          >
            <div class="relative size-14 rounded-full ring-2 ring-red-500/30">
              <img
                src={`/images/streamer-wars/players/${player.playerNumber.toString().padStart(3, "0")}.webp`}
                onError={(e) => { e.currentTarget.src = player.avatar; }}
                alt={player.displayName}
                class="w-full h-full rounded-full"
              />
            </div>
            <p class="text-lg text-red-400 mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
            <span class="text-xs text-neutral-400 font-mono truncate w-full text-center">{player.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const StreamerWarsPlayers = ({ pusher }: { pusher: Pusher }) => {
  const [players, setPlayers] = useState<Players[]>([]);
  const [playersLiveOnTwitch, setPlayersLiveOnTwitch] = useState<string[]>([]);
  const [massElimination, setMassElimination] = useState({
    dialogOpen: false, loading: false, playerNumbers: [] as number[], inputValue: "",
  });
  const [addNewPlayer, setAddNewPlayer] = useState({
    dialogOpen: false, loading: false, username: "", playerNumber: 0,
  });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; playerNumber: number | null; showTeams: boolean;
  }>({ visible: false, x: 0, y: 0, playerNumber: null, showTeams: false });

  const globalChannel = pusher.subscribe(PUSHER_CHANNELS.GLOBAL);

  const ContextualMenuActions = [
    { name: "Eliminar", execute: (playerNumber: number) => handleNormalElimination(playerNumber) },
    { name: "Eliminar permanentemente", execute: (playerNumber: number) => handlePermanentElimination(playerNumber) },
    { name: "Revivir", execute: (playerNumber: number) => revivePlayer(playerNumber) },
    {
      name: "Aislar / Quitar aislamiento", execute: (playerNumber: number) => {
        const player = players.find((p) => p.playerNumber === playerNumber);
        if (player?.aislated) unaislatePlayer(playerNumber);
        else aislatePlayer(playerNumber);
      },
    },
    { name: "Recargar navegador (F5)", execute: (playerNumber: number) => reloadPlayerBrowser({ playerNumber }) },
  ];

  useEffect(() => {
    if (!pusher) return;
    const globalChannelEvents: Array<{ event: string; handler: (data: any) => void }> = [];
    const bindGlobal = (event: string, handler: (data: any) => void) => {
      pusherService.bind(PUSHER_CHANNELS.GLOBAL, event, handler);
      globalChannelEvents.push({ event, handler });
    };

    pusherService.bind(PUSHER_CHANNELS.PRESENCE, PUSHER_EVENTS.SUBSCRIPTION_SUCCEEDED, (members: any) => {
      const onlinePlayers = Object.values(members.members).map((member: any) => ({ ...member, displayName: member.name, online: true }));
      setPlayers((prev) => prev.map((player) => ({ ...player, online: onlinePlayers.some((p) => p.id === player.id) })));
    });
    pusherService.bind(PUSHER_CHANNELS.PRESENCE, PUSHER_EVENTS.MEMBER_ADDED, (member: any) => {
      setPlayers((prev) => prev.map((player) => player.id === Number(member.id) ? { ...player, online: true } : player));
    });
    pusherService.bind(PUSHER_CHANNELS.PRESENCE, PUSHER_EVENTS.MEMBER_REMOVED, (member: any) => {
      setPlayers((prev) => prev.map((player) => player.id === Number(member.id) ? { ...player, online: false } : player));
    });
    bindGlobal(PUSHER_EVENTS.PLAYERS_UNAISLATED, () => {
      toast.success("Los jugadores han sido quitados del aislamiento");
      setPlayers((prev) => prev.map((player) => ({ ...player, aislated: false })));
    });
    bindGlobal(PUSHER_EVENTS.PLAYER_ELIMINATED, ({ playerNumber }: { playerNumber: number }) => {
      toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} eliminado`);
      playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.08 });
      setPlayers((prev) => prev.map((player) => player.playerNumber === playerNumber ? { ...player, eliminated: true } : player));
    });
    bindGlobal(PUSHER_EVENTS.PLAYER_AISLATED, ({ playerNumber }: { playerNumber: number }) => {
      toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} aislado`);
      setPlayers((prev) => prev.map((player) => player.playerNumber === playerNumber ? { ...player, aislated: true } : player));
    });
    bindGlobal(PUSHER_EVENTS.PLAYERS_AISLATED, ({ playerNumbers }: { playerNumbers: number[] }) => {
      toast.success(`Jugadores ${new Intl.ListFormat("es-ES").format(playerNumbers.map((n) => `#${n?.toString().padStart(3, "0")}`))} aislados`);
      setPlayers((prev) => prev.map((player) => playerNumbers.includes(player.playerNumber) ? { ...player, aislated: true } : player));
    });
    bindGlobal(PUSHER_EVENTS.PLAYER_UNAISLATED, ({ playerNumber }: { playerNumber: number }) => {
      toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} quitado del aislamiento`);
      setPlayers((prev) => prev.map((player) => player.playerNumber === playerNumber ? { ...player, aislated: false } : player));
    });
    bindGlobal(PUSHER_EVENTS.PLAYER_REVIVED, ({ playerNumber }: { playerNumber: number }) => {
      toast.success(`Jugador #${playerNumber?.toString().padStart(3, "0")} revivido`);
      playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK, volume: 0.08 });
      setPlayers((prev) => prev.map((player) => player.playerNumber === playerNumber ? { ...player, eliminated: false } : player));
    });
    fetchPlayersLiveOnTwitch();
    return () => {
      globalChannelEvents.forEach(({ event, handler }) => pusherService.unbind(PUSHER_CHANNELS.GLOBAL, event, handler));
      pusherService.unsubscribe(PUSHER_CHANNELS.PRESENCE);
    };
  }, [pusher]);

  const reloadPlayerBrowser = ({ playerNumber }: { playerNumber: number }) => {
    toast.promise(actions.streamerWars.reloadForUser({ playerNumber }), {
      loading: `Recargando navegador del jugador #${playerNumber}`,
      success: "Recargado", error: "Error al recargar",
    });
  };

  const fetchPlayersLiveOnTwitch = async () => {
    const { error, data } = await actions.streamerWars.getPlayersLiveOnTwitch();
    if (error) { console.error(error); return; }
    setPlayersLiveOnTwitch(data);
  };

  useEffect(() => {
    fetchPlayersLiveOnTwitch();
    const intervalId = setInterval(fetchPlayersLiveOnTwitch, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setPlayers((prev) => prev.map((player) => ({
      ...player,
      isLiveOnTwitch: playersLiveOnTwitch.includes(player.displayName.toLowerCase()),
    })));
  }, [playersLiveOnTwitch]);

  const reloadPlayers = () => {
    actions.streamerWars.getPlayers().then(({ error, data }) => {
      if (error) { console.error(error); return; }
      setPlayers((prev) => {
        const mergedPlayers = [...prev];
        data.players.forEach((player: any) => {
          if (!mergedPlayers.some((p) => p.id === player.id)) {
            mergedPlayers.push({
              ...player,
              displayName: player.displayName || player.name || "",
              avatar: player.avatar || "",
              admin: player.admin || false,
              online: false,
              eliminated: player.eliminated || false,
              aislated: player.aislated || false,
              isLiveOnTwitch: playersLiveOnTwitch.includes(player.displayName.toLowerCase()),
            });
          }
        });
        return mergedPlayers;
      });
    });
  };

  const handleNormalElimination = async (playerNumber: number) => {
    if (!confirm(`¿Estás seguro de eliminar al jugador #${playerNumber.toString().padStart(3, "0")}?`)) return;
    const response = await actions.streamerWars.eliminatePlayer({ playerNumber });
    if (response.error) { console.error(response.error); toast.error(response.error.message); }
  };

  const handleMassElimination = async () => {
    if (!confirm(`¿Estás seguro de eliminar a los jugadores ${massElimination.playerNumbers.map((n) => `#${n.toString().padStart(3, "0")}`).join(", ")}?`)) return;
    setMassElimination((prev) => ({ ...prev, loading: true }));
    const response = await actions.streamerWars.massEliminatePlayers({ playerNumbers: massElimination.playerNumbers });
    if (response.error) { console.error(response.error); toast.error(response.error.message); return; }
    toast.success("Jugadores eliminados");
    playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.08 });
    setMassElimination((prev) => ({ ...prev, dialogOpen: false, loading: false, playerNumbers: [] }));
    reloadPlayers();
  };

  const handlePermanentElimination = async (playerNumber: number) => {
    if (!confirm(`ATENCIÓN: ¿Estás seguro de eliminar PERMANENTEMENTE al jugador #${playerNumber.toString().padStart(3, "0")}?`)) return;
    const response = await actions.streamerWars.removePlayer({ playerNumber });
    if (response.error) { console.error(response.error); toast.error(response.error.message); return; }
    setPlayers((prev) => prev.filter((player) => player.playerNumber !== playerNumber));
    reloadPlayers();
  };

  const revivePlayer = async (playerNumber: number) => {
    if (!confirm(`¿Estás seguro de revivir al jugador #${playerNumber.toString().padStart(3, "0")}?`)) return;
    const response = await actions.streamerWars.revivePlayer({ playerNumber });
    if (response.error) { console.error(response.error); toast.error(response.error.message); }
  };

  const aislatePlayer = async (playerNumber: number) => {
    if (!confirm(`¿Estás seguro de aislar al jugador #${playerNumber.toString().padStart(3, "0")}?`)) return;
    const response = await actions.streamerWars.aislatePlayer({ playerNumber });
    if (response.error) { console.error(response.error); toast.error(response.error.message); return; }
    reloadPlayers();
  };

  const unaislatePlayer = async (playerNumber: number) => {
    if (!confirm(`¿Estás seguro de quitar aislamiento al jugador #${playerNumber.toString().padStart(3, "0")}?`)) return;
    const response = await actions.streamerWars.unaislatePlayer({ playerNumber });
    if (response.error) { console.error(response.error); toast.error(response.error.message); return; }
    reloadPlayers();
  };

  useEffect(() => { reloadPlayers(); }, []);
  useEffect(() => {
    const handleClickOutside = () => { if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false })); };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  return (
    <div class="flex flex-col items-center w-full space-y-8">
      {/* Player Grid */}
      <div class="w-full">
        <div class="flex items-center gap-3 mb-6">
          <LucideUsers size={16} class="text-[#b4cd02]" />
          <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">Jugadores activos</span>
          <span class="ml-auto font-teko text-[10px] tracking-widest text-neutral-700">{players.filter(p => !p.eliminated).length} conectados</span>
        </div>
        <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {players.filter(p => !p.eliminated).map((player) => (
            <button
              onClick={() => handleNormalElimination(player.playerNumber)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, playerNumber: player.playerNumber });
              }}
              class="flex flex-col relative overflow-hidden items-center hover:scale-105 hover:bg-[#b4cd02]/10 transition-all border border-neutral-800 hover:border-[#b4cd02]/30 rounded-lg p-4 bg-[#0a0a0a] group"
              key={player.id}
            >
              <div class="relative size-14 rounded-full ring-2 ring-neutral-700 group-hover:ring-[#b4cd02]/50 transition-all">
                <img src={player.avatar} alt={player.displayName} class="w-full h-full rounded-full" />
                {player.online && <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#b4cd02] rounded-full ring-2 ring-[#0a0a0a] shadow-[0_0_8px_rgba(180,205,2,0.5)]" />}
              </div>
              <p class="text-lg text-[#b4cd02] mt-2 font-atomic">#{player.playerNumber?.toString().padStart(3, "0")}</p>
              <span class="text-xs text-neutral-400 font-mono truncate w-full text-center">{player.displayName}</span>
              {player.aislated && (
                <div class="absolute animate-fade-in inset-0 bg-black/60 flex items-center justify-center">
                  <span class="font-atomic text-xl -rotate-45 text-yellow-500">AISLADO</span>
                </div>
              )}
              {player.isLiveOnTwitch && (
                <div class="absolute top-0 right-0 bg-electric-violet-500 text-white text-[10px] font-teko tracking-wider px-2 py-0.5 rounded-bl-sm shadow-[0_0_10px_rgba(145,70,255,0.4)]">
                  EN VIVO
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Morgue */}
      {players.some((p) => p.eliminated) && (
        <Morgue players={players.filter((p) => p.eliminated)} onClick={revivePlayer} />
      )}

      <Teams channel={globalChannel} />

      {/* Action buttons */}
      <div class="flex flex-wrap gap-3 w-full pt-4 border-t border-neutral-800">
        <button class={BTN} onClick={() => setAddNewPlayer((prev) => ({ ...prev, dialogOpen: true }))}>
          <LucideUserPlus size={14} />
          Añadir jugador
        </button>
        <button class={BTN} onClick={() => setMassElimination((prev) => ({ ...prev, dialogOpen: true }))}>
          <LucideTrash2 size={14} />
          Eliminar en masa
        </button>
      </div>

      {/* Add Player Dialog */}
      <dialog class={DIALOG} open={addNewPlayer.dialogOpen}>
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <LucideUserPlus size={16} class="text-[#b4cd02]" />
          <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">Añadir nuevo jugador</span>
        </div>
        <div class="space-y-4">
          <input
            type="number"
            class="w-full bg-[#050508] text-white text-sm font-mono p-4 outline-hidden border border-neutral-800 focus:border-[#b4cd02]/40 transition-colors placeholder:text-neutral-700 rounded-sm"
            placeholder="Número de jugador"
            value={addNewPlayer.playerNumber || ""}
            onInput={(e) => setAddNewPlayer((prev) => ({ ...prev, playerNumber: parseInt((e.target as HTMLInputElement).value) }))}
          />
          <input
            type="text"
            class="w-full bg-[#050508] text-white text-sm font-mono p-4 outline-hidden border border-neutral-800 focus:border-[#b4cd02]/40 transition-colors placeholder:text-neutral-700 rounded-sm"
            placeholder="Nombre de usuario de Twitch"
            value={addNewPlayer.username}
            onInput={(e) => setAddNewPlayer((prev) => ({ ...prev, username: (e.target as HTMLInputElement).value }))}
          />
        </div>
        <div class="flex justify-between mt-8 pt-4 border-t border-neutral-800">
          <button class={BTN} onClick={() => setAddNewPlayer((prev) => ({ ...prev, dialogOpen: false }))}>
            <LucideX size={14} />
            Cancelar
          </button>
          <button
            class="flex items-center gap-2 bg-[#b4cd02] hover:bg-[#b4cd02]/90 text-black font-anton text-xs tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all shadow-[0_0_15px_rgba(180,205,2,0.15)] disabled:opacity-30"
            onClick={async () => {
              const { playerNumber, username } = addNewPlayer;
              if (!playerNumber || !username) { toast.error("Completa todos los campos"); return; }
              const { error } = await actions.streamerWars.addPlayer({ playerNumber, twitchUsername: username });
              if (error) { toast.error(error.message); return; }
              toast.success(`Jugador #${playerNumber.toString().padStart(3, "0")} añadido`);
              setAddNewPlayer((prev) => ({ ...prev, dialogOpen: false, loading: false }));
              reloadPlayers();
            }}
          >
            <LucidePlus size={14} />
            {addNewPlayer.loading ? "Cargando..." : "Añadir"}
          </button>
        </div>
      </dialog>

      {/* Mass Elimination Dialog */}
      <dialog class={DIALOG} open={massElimination.dialogOpen}>
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <LucideTrash2 size={16} class="text-red-500" />
          <span class="font-anton text-xs tracking-[0.25em] uppercase text-red-500">Eliminar jugadores</span>
        </div>
        <div>
          <input
            type="text"
            class="w-full bg-[#050508] text-white text-sm font-mono p-4 outline-hidden border border-neutral-800 focus:border-red-500/40 transition-colors placeholder:text-neutral-700 rounded-sm"
            placeholder="Números separados por coma (ej: 1, 2, 3)"
            value={massElimination.inputValue || ""}
            onInput={(e) => setMassElimination((prev) => ({ ...prev, inputValue: (e.target as HTMLInputElement).value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                setMassElimination((prev) => {
                  const newNumbers = prev.inputValue.split(",").map((n) => parseInt(n)).filter((n) => !isNaN(n)).filter((n) => !prev.playerNumbers.includes(n));
                  return { ...prev, playerNumbers: [...prev.playerNumbers, ...newNumbers], inputValue: "" };
                });
              }
            }}
          />
          {massElimination.playerNumbers.length > 0 && (
            <div class="mt-4 p-4 bg-[#050508] border border-neutral-800 rounded-sm">
              <p class="font-teko text-xs tracking-wider text-neutral-500 uppercase mb-3">Jugadores a eliminar:</p>
              <div class="flex flex-wrap gap-2">
                {massElimination.playerNumbers.map((n) => (
                  <span class="flex items-center gap-1 bg-red-950/30 border border-red-500/20 text-red-400 font-atomic text-sm px-2 py-1 rounded-sm">
                    #{n.toString().padStart(3, "0")}
                    <button
                      class="text-red-600 hover:text-red-400 transition-colors"
                      onClick={() => setMassElimination((prev) => ({ ...prev, playerNumbers: prev.playerNumbers.filter((num) => num !== n) }))}
                    >
                      <LucideX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div class="flex justify-between mt-8 pt-4 border-t border-neutral-800">
          <button class={BTN} onClick={() => setMassElimination((prev) => ({ ...prev, dialogOpen: false }))}>
            <LucideX size={14} />
            Cancelar
          </button>
          <button
            class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-anton text-xs tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all disabled:opacity-30"
            disabled={massElimination.playerNumbers.length === 0}
            onClick={handleMassElimination}
          >
            <LucideTrash2 size={14} />
            {massElimination.loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </dialog>

      {/* Cinematics */}
      <div class="w-full pt-4">
        <div class="flex items-center gap-3 mb-6">
          <LucideFilm size={16} class="text-[#b4cd02]" />
          <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">Animaciones de juego</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {CINEMATICS_LIST.map(({ id, name }) => (
            <button
              class="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-[#b4cd02]/30 text-neutral-300 hover:text-white font-mono text-xs p-3 rounded-sm transition-all text-center"
              onClick={() => {
                toast.promise(actions.admin.launchCinematic({
                  url: `${CINEMATICS_CDN_PREFIX}/${id}.webm`,
                  targetUsers: players.map((player) => player.id).filter((id): id is number => id !== undefined),
                }), {
                  loading: "Lanzando animación...",
                  success: "Animación lanzada",
                  error: "Error al lanzar",
                });
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          class="fixed z-10000 bg-[#0a0a0a] border border-neutral-800 rounded-sm shadow-2xl py-1 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.showTeams ? (
            <>
              {ContextualMenuActions.map(({ name, execute }) => (
                <button
                  class="block w-full text-left px-4 py-2 text-sm text-neutral-300 font-mono hover:bg-[#b4cd02]/10 hover:text-[#b4cd02] transition-colors"
                  onClick={() => {
                    if (contextMenu.playerNumber !== null) execute(contextMenu.playerNumber);
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  {name}
                </button>
              ))}
              <div class="border-t border-neutral-800 my-1" />
              <button
                class="block w-full text-left px-4 py-2 text-sm text-neutral-300 font-mono hover:bg-[#b4cd02]/10 hover:text-[#b4cd02] transition-colors"
                onClick={() => setContextMenu((prev) => ({ ...prev, showTeams: true }))}
              >
                <LucideShuffle size={14} class="inline-block mr-2" />
                Asignar a equipo
              </button>
              <div class="border-t border-neutral-800 my-1" />
              <button
                class="block w-full text-left px-4 py-2 text-sm text-neutral-600 font-mono hover:bg-neutral-800 transition-colors"
                onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <div class="px-4 py-2 text-xs font-anton tracking-wider text-[#b4cd02] uppercase border-b border-neutral-800">
                Asignar a equipo
              </div>
              {[
                { color: 'blue', label: 'Azul', dot: 'bg-blue-500' },
                { color: 'red', label: 'Rojo', dot: 'bg-red-500' },
                { color: 'yellow', label: 'Amarillo', dot: 'bg-yellow-400' },
                { color: 'purple', label: 'Morado', dot: 'bg-purple-500' },
                { color: 'white', label: 'Blanco', dot: 'bg-gray-100' },
              ].map(({ color, label, dot }) => (
                <button
                  class="block w-full text-left px-4 py-2 text-sm text-neutral-300 font-mono hover:bg-[#b4cd02]/10 hover:text-[#b4cd02] transition-colors flex items-center gap-3"
                  onClick={() => {
                    if (contextMenu.playerNumber !== null) {
                      toast.promise(actions.streamerWars.assignPlayerToTeam({
                        playerNumber: contextMenu.playerNumber,
                        team: color,
                      }), {
                        loading: `Asignando #${contextMenu.playerNumber} a ${label}...`,
                        success: `Jugador #${contextMenu.playerNumber} asignado a ${label}`,
                        error: 'Error al asignar',
                      });
                    }
                    setContextMenu((prev) => ({ ...prev, visible: false, showTeams: false }));
                  }}
                >
                  <span class={`w-3 h-3 rounded-full ${dot}`} />
                  {label}
                </button>
              ))}
              <div class="border-t border-neutral-800 my-1" />
              <button
                class="block w-full text-left px-4 py-2 text-sm text-neutral-600 font-mono hover:bg-neutral-800 transition-colors"
                onClick={() => setContextMenu((prev) => ({ ...prev, showTeams: false }))}
              >
                Volver
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
