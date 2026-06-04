import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { StreamerWarsPlayers } from "./streamer-wars/Players";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
  LucideBellRing, LucideCoffee, LucideFlag, LucideGavel,
  LucideLockKeyholeOpen, LucideMessageSquareLock, LucideRefreshCw,
  LucideTrash2, LucideSend, LucideMegaphone, LucideSkull,
  LucideUsers, LucideMessageCircle, LucideShieldAlert, LucideMonitor,
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import { usePusher } from "@/hooks/usePusher";

type ActionGroup = {
  title: string;
  icon: any;
  accent: string;
  actions: ActionItem[];
};

type ActionItem = {
  name: string;
  color: string;
  icon: any;
  execute: () => Promise<any>;
};

const makeAction = (
  name: string,
  color: string,
  icon: any,
  execute: () => Promise<any>,
): ActionItem => ({ name, color, icon, execute });

const ACTION_GROUPS: ActionGroup[] = [
  {
    title: "Jornada",
    icon: LucideFlag,
    accent: "#b4cd02",
    actions: [
      makeAction("Desbloquear jornada", "from-green-600/80 to-green-700/80", LucideLockKeyholeOpen, () =>
        toast.promise(actions.streamerWars.setDayAsAvailable(), {
          loading: "Desbloqueando jornada...",
          success: "Jornada desbloqueada",
          error: "Error al desbloquear jornada",
        })),
      makeAction("Finalizar jornada", "from-blue-600/80 to-blue-700/80", LucideFlag, () =>
        toast.promise(actions.streamerWars.finishDay(), {
          loading: "Finalizando jornada...",
          success: "Jornada finalizada",
          error: "Error al finalizar jornada",
        })),
      makeAction("Sala de espera", "from-purple-600/80 to-purple-700/80", LucideCoffee, () =>
        toast.promise(actions.streamerWars.sendToWaitingRoom(), {
          loading: "Enviando jugadores...",
          success: "Jugadores enviados a sala de espera",
          error: "Error al enviar jugadores",
        })),
    ],
  },
  {
    title: "Simón Dice",
    icon: LucideSkull,
    accent: "#ff0055",
    actions: [
      makeAction("Iniciar Simón Dice", "from-yellow-600/80 to-yellow-700/80", LucideFlag, () =>
        toast.promise(actions.games.simonSays.startGame(), {
          loading: "Iniciando Simón Dice...",
          success: "Simón Dice iniciado",
          error: "Error al iniciar",
        })),
      makeAction("Siguiente ronda", "from-yellow-600/80 to-yellow-700/80", LucideFlag, () =>
        toast.promise(actions.games.simonSays.advanceToNextRoundForCurrentPlayers(), {
          loading: "Avanzando ronda...",
          success: "Ronda avanzada",
          error: "Error al avanzar",
        })),
      makeAction("Ronda con otros", "from-sky-600/80 to-sky-700/80", LucideUsers, () =>
        toast.promise(actions.games.simonSays.nextRoundWithOtherPlayers(), {
          loading: "Cambiando jugadores...",
          success: "Jugadores cambiados",
          error: "Error al cambiar",
        })),
    ],
  },
  {
    title: "Chat",
    icon: LucideMessageCircle,
    accent: "#3b82f6",
    actions: [
      makeAction("Dificultades técnicas", "from-red-600/80 to-red-700/80", LucideBellRing, () =>
        toast.promise(actions.streamerWars.techDifficulties(), {
          loading: "Enviando anuncio...",
          success: "Anuncio enviado",
          error: "Error al enviar",
        })),
      makeAction("Bloquear chat", "from-red-600/80 to-red-700/80", LucideMessageSquareLock, () =>
        toast.promise(actions.streamerWars.lockChat(), {
          loading: "Bloqueando chat...",
          success: "Chat bloqueado",
          error: "Error al bloquear",
        })),
      makeAction("Desbloquear chat", "from-green-600/80 to-green-700/80", LucideMessageSquareLock, () =>
        toast.promise(actions.streamerWars.unlockChat(), {
          loading: "Desbloqueando chat...",
          success: "Chat desbloqueado",
          error: "Error al desbloquear",
        })),
      makeAction("Limpiar chat", "from-neutral-600/80 to-neutral-700/80", LucideTrash2, () =>
        toast.promise(actions.streamerWars.clearChat(), {
          loading: "Limpiando chat...",
          success: "Chat limpiado",
          error: "Error al limpiar",
        })),
    ],
  },
  {
    title: "Administración",
    icon: LucideShieldAlert,
    accent: "#ffaa00",
    actions: [
      makeAction("Reiniciar roles", "from-neutral-600/80 to-neutral-700/80", LucideRefreshCw, () =>
        toast.promise(actions.streamerWars.resetRoles(), {
          loading: "Reiniciando roles...",
          success: "Roles reiniciados",
          error: "Error al reiniciar",
        })),
      makeAction("Quitar aislamiento", "from-neutral-600/80 to-neutral-700/80", LucideGavel, () =>
        toast.promise(actions.streamerWars.unaislateAllPlayers(), {
          loading: "Quitando aislamiento...",
          success: "Aislamiento quitado",
          error: "Error al desaislar",
        })),
      makeAction("Recargar overlay", "from-lime-600/80 to-lime-700/80", LucideMonitor, () =>
        toast.promise(actions.streamerWars.reloadOverlay(), {
          loading: "Recargando overlay...",
          success: "Overlay recargado",
          error: "Error al recargar",
        })),
    ],
  },
];

const CARD_CLASS = "bg-[#0a0a0a] border border-neutral-800 rounded-lg overflow-hidden";

export const StreamerWarsAdmin = ({ session }: { session: Session }) => {
  const { pusher } = usePusher();
  const [announcementText, setAnnouncementText] = useState("");
  const [devActions, setDevActions] = useState<ActionItem[]>([]);

  useEffect(() => {
    if (session?.user?.name?.toLowerCase() === "alexitoo_uy") {
      setDevActions([
        makeAction("Notificar nueva versión", "from-purple-600/80 to-purple-700/80", LucideFlag, () =>
          toast.promise(actions.streamerWars.notifyNewVersion(), {
            loading: "Notificando...",
            success: "Nueva versión notificada",
            error: "Error al notificar",
          })),
      ]);
    }
  }, []);

  return (
    <div class="space-y-8 mt-8">
      {pusher && (
        <>
          {/* Announcement Terminal */}
          <div class={CARD_CLASS}>
            <div class="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-[#08080a]">
              <LucideMegaphone size={16} class="text-[#b4cd02]" />
              <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">
                Terminal de anuncios
              </span>
              <span class="ml-auto font-teko text-[10px] tracking-widest text-neutral-700 uppercase">
                [ADMIN ONLY]
              </span>
            </div>
            <div class="p-5">
              <div class="relative">
                <textarea
                  id="announcement"
                  rows={3}
                  class="w-full bg-[#050508] text-white text-sm font-mono p-4 pr-12 resize-none outline-hidden border border-neutral-800 focus:border-[#b4cd02]/40 transition-colors placeholder:text-neutral-700 rounded-sm"
                  placeholder="Escribí un anuncio para todos los jugadores..."
                  value={announcementText}
                  onInput={(e) => setAnnouncementText((e.target as HTMLTextAreaElement).value)}
                />
                <span class="absolute right-3 bottom-3 font-teko text-[10px] text-neutral-700">
                  {announcementText.length}/200
                </span>
              </div>
              <div class="flex items-center justify-between mt-3">
                <span class="font-teko text-[10px] tracking-widest text-neutral-700 uppercase">
                  Los links se renderizarán como enlaces clickeables
                </span>
                <button
                  class="flex items-center gap-2 bg-[#b4cd02] hover:bg-[#b4cd02]/90 text-black font-anton text-xs tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all shadow-[0_0_15px_rgba(180,205,2,0.15)] hover:shadow-[0_0_25px_rgba(180,205,2,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={!announcementText}
                  onClick={() => {
                    if (!announcementText) return;
                    toast.promise(actions.streamerWars.sendAnnouncement({ message: announcementText }), {
                      loading: "Enviando anuncio...",
                      success: () => { setAnnouncementText(""); return "Anuncio enviado"; },
                      error: "Error al enviar anuncio",
                    });
                  }}
                >
                  <LucideSend size={14} />
                  Enviar anuncio
                </button>
              </div>
            </div>
          </div>

          {/* Action Groups */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ACTION_GROUPS.map((group) => (
              <div key={group.title} class={CARD_CLASS}>
                <div
                  class="flex items-center gap-3 px-5 py-3 border-b border-neutral-800"
                  style={{ backgroundColor: `${group.accent}08` }}
                >
                  <group.icon size={16} style={{ color: group.accent }} />
                  <span class="font-anton text-xs tracking-[0.25em] uppercase" style={{ color: group.accent }}>
                    {group.title}
                  </span>
                </div>
                <div class="p-4 space-y-2">
                  {group.actions.map((action) => (
                    <ActionButton key={action.name} action={action} />
                  ))}
                </div>
              </div>
            ))}

            {/* Dev Actions */}
            {devActions.length > 0 && (
              <div class={CARD_CLASS}>
                <div class="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-purple-950/10">
                  <LucideShieldAlert size={16} class="text-purple-500" />
                  <span class="font-anton text-xs tracking-[0.25em] uppercase text-purple-500">
                    Developer
                  </span>
                </div>
                <div class="p-4 space-y-2">
                  {devActions.map((action) => (
                    <ActionButton key={action.name} action={action} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Players Section */}
          <div class={CARD_CLASS}>
            <div class="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-[#08080a]">
              <LucideUsers size={16} class="text-[#b4cd02]" />
              <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">
                Gestión de jugadores
              </span>
            </div>
            <div class="p-5">
              <StreamerWarsPlayers pusher={pusher} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function ActionButton({ action }: { action: ActionItem }) {
  const Icon = action.icon;
  return (
    <button
      class={`w-full flex items-center gap-3 px-4 py-3 rounded-sm bg-linear-to-r ${action.color} text-white text-lg font-teko tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md`}
      onClick={action.execute}
    >
      <Icon size={16} class="shrink-0 opacity-80" />
      <span class="truncate">{action.name}</span>
    </button>
  );
}
