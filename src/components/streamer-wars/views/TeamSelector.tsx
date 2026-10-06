import { TEAMS } from "@/consts/Teams";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCrown, LucideGamepad2, LucideUsers, LucideShieldCheck } from "lucide-preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Channel } from "pusher-js";
import { Instructions } from "../Instructions";
import { PUSHER_EVENTS } from "@/consts/pusher";
import { SWGameShell } from "../games/_sw/SWGameShell";
import { SWHud } from "../games/_sw/SWHud";
import { useSWChannel } from "../games/_sw/swChannel";
import { swToast } from "../swToast";
import { swSound } from "../games/_sw/SWSounds";

type Player = {
    playerNumber: number;
    avatar: string;
    displayName: string;
    isCaptain: boolean;
};

const REFRESH_AFTER_EVENT_TIMEOUT = 2000;

// Configuración visual por equipo (unificada con el resto de la guerra)
const TEAM_CONFIG: Record<string, { bg: string; soft: string; border: string; text: string; glow: string }> = {
    [TEAMS.BLUE]: { bg: "bg-blue-600", soft: "bg-blue-500/15", border: "border-blue-500/50", text: "text-blue-300", glow: "shadow-[0_0_24px_rgba(59,130,246,0.25)]" },
    [TEAMS.RED]: { bg: "bg-red-600", soft: "bg-red-500/15", border: "border-red-500/50", text: "text-red-300", glow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]" },
    [TEAMS.YELLOW]: { bg: "bg-yellow-500", soft: "bg-yellow-500/15", border: "border-yellow-500/50", text: "text-yellow-200", glow: "shadow-[0_0_24px_rgba(234,179,8,0.25)]" },
    [TEAMS.PURPLE]: { bg: "bg-purple-600", soft: "bg-purple-500/15", border: "border-purple-500/50", text: "text-purple-300", glow: "shadow-[0_0_24px_rgba(168,85,247,0.25)]" },
    [TEAMS.WHITE]: { bg: "bg-gray-200", soft: "bg-white/10", border: "border-white/30", text: "text-gray-300", glow: "shadow-[0_0_24px_rgba(255,255,255,0.15)]" },
};

export const TeamSelector = ({
    session,
    channel,
    teamsQuantity,
    playersPerTeam
}: {
    session: Session;
    channel: Channel;
    teamsQuantity: number;
    playersPerTeam: number
}) => {
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [playersTeams, setPlayersTeams] = useState<Record<string, Player[]>>({});

    // Refs para control de memoria y timeouts
    const refreshPlayersTimeout = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const refreshPlayersTeams = useCallback(() => {
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (!isMounted.current) return;
            if (error) return console.error(error);
            setPlayersTeams(data.playersTeams);
        });
    }, []);

    const scheduleRefresh = useCallback(() => {
        if (refreshPlayersTimeout.current) clearTimeout(refreshPlayersTimeout.current);
        refreshPlayersTimeout.current = setTimeout(refreshPlayersTeams, REFRESH_AFTER_EVENT_TIMEOUT);
    }, [refreshPlayersTeams]);

    // Lógica de Selección de Equipo
    useEffect(() => {
        if (!selectedTeam) return;

        // Validación Optimista
        const isAlreadyInTeam = Object.values(playersTeams).some(team =>
            team.some(({ playerNumber }) => playerNumber === session.user.streamerWarsPlayerNumber)
        );

        if (isAlreadyInTeam) {
            swToast.error("Ya tienes equipo, no podés cambiarte");
            setSelectedTeam(null);
            return;
        }

        const currentTeamCount = playersTeams[selectedTeam]?.length || 0;
        if (currentTeamCount >= playersPerTeam) {
            swSound.error();
            swToast.error("Equipo lleno: probá con otro equipo");
            setSelectedTeam(null);
            return;
        }

        // Actualización Optimista
        const optimisticPlayer = {
            playerNumber: session.user.streamerWarsPlayerNumber!,
            avatar: session.user.image || '',
            displayName: session.user.name || '',
            isCaptain: false
        };

        setPlayersTeams(prev => ({
            ...prev,
            [selectedTeam]: [...(prev[selectedTeam] || []), optimisticPlayer]
        }));

        // Llamada al servidor
        actions.streamerWars.joinTeam({ team: selectedTeam }).then(({ error }) => {
            if (!isMounted.current) return;

            if (error) {
                console.error(error);
                swSound.error();
                swToast.error(error.message);

                // Revertir estado optimista
                setPlayersTeams(prev => ({
                    ...prev,
                    [selectedTeam]: (prev[selectedTeam] || []).filter(
                        player => player.playerNumber !== session.user.streamerWarsPlayerNumber
                    )
                }));
                setSelectedTeam(null);
            } else {
                swSound.win();
                swToast.success("¡Te uniste al equipo! Buena suerte");
            }
        });
    }, [selectedTeam]);

    // Suscripción a Eventos Pusher (hook único, bind/unbind simétrico)
    const myNumberRef = useRef(session.user.streamerWarsPlayerNumber);
    myNumberRef.current = session.user.streamerWarsPlayerNumber;

    useEffect(() => {
        refreshPlayersTeams();
    }, [refreshPlayersTeams]);

    useSWChannel(channel, {
        [PUSHER_EVENTS.PLAYER_JOINED]: (player: Player & { team: string }) => {
            if (!isMounted.current) return;
            swSound.click();
            setPlayersTeams(prev => ({
                ...prev,
                [player.team]: [
                    ...(prev[player.team] || []).filter(p => p.playerNumber !== player.playerNumber),
                    { ...player, isCaptain: player.isCaptain ?? false }
                ]
            }));
            scheduleRefresh();
        },
        [PUSHER_EVENTS.PLAYER_REMOVED]: ({ playerNumber }: { playerNumber: number }) => {
            if (!isMounted.current) return;
            setPlayersTeams(prev => {
                const newState: Record<string, Player[]> = {};
                Object.keys(prev).forEach(key => {
                    newState[key] = prev[key].filter(p => p.playerNumber !== playerNumber);
                });
                return newState;
            });

            if (myNumberRef.current === playerNumber) {
                setSelectedTeam(null);
                swSound.error();
                swToast.info("Has sido expulsado del equipo");
            }
            scheduleRefresh();
        },
        [PUSHER_EVENTS.CAPTAIN_ASSIGNED]: ({ team, playerNumber }: { team: string; playerNumber: number }) => {
            if (!isMounted.current) return;
            setPlayersTeams(prev => ({
                ...prev,
                [team]: (prev[team] || []).map(player => ({
                    ...player,
                    isCaptain: player.playerNumber === playerNumber
                }))
            }));

            if (myNumberRef.current === playerNumber) {
                swSound.win();
                swToast.success("¡Eres el capitán del equipo!");
            }
            scheduleRefresh();
        },
    });

    const myNumber = session.user.streamerWarsPlayerNumber;
    const myTeam = Object.entries(playersTeams).find(([, members]) =>
        members.some((p) => p.playerNumber === myNumber)
    )?.[0] ?? null;
    const totalSlots = teamsQuantity * playersPerTeam;
    const totalTaken = Object.values(playersTeams).reduce((acc, m) => acc + m.length, 0);

    return (
        <SWGameShell accent="lime" title="Elige tu equipo">
            <Instructions duration={15000} controls={[{ keys: ["LEFT_CLICK"], label: "Clic para unirte a un equipo" }]}>
                <p class="font-mono max-w-2xl text-left">
                    Elegí uno de los equipos de abajo. Una vez adentro, no podrás cambiarte.
                </p>
                <p class="font-mono max-w-2xl text-left">
                    Cada equipo admite {playersPerTeam} jugadores. Si está lleno, elegí otro… rápido, que vuelan.
                </p>
            </Instructions>

            <SWHud
                leftLabel="Equipos"
                leftValue={`${teamsQuantity}`}
                title="Elige tu equipo"
                rightLabel="Ocupación"
                rightValue={`${totalTaken}/${totalSlots}`}
                progress={totalSlots > 0 ? totalTaken / totalSlots : 0}
            />

            {myTeam && (
                <p class="flex items-center justify-center gap-2 font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02] mb-2" role="status">
                    <LucideShieldCheck size={14} />
                    Ya estás en el equipo {getTranslation(myTeam)}
                </p>
            )}

            {/* Selector de Equipos */}
            <div class="flex flex-wrap items-stretch justify-center gap-4 md:gap-6">
                {Object.keys(TEAMS).slice(0, teamsQuantity).map((teamKey) => {
                    const team = TEAMS[teamKey as keyof typeof TEAMS];
                    const config = TEAM_CONFIG[team] || TEAM_CONFIG[TEAMS.WHITE];
                    const members = playersTeams[team] || [];
                    const isFull = members.length >= playersPerTeam;
                    const isMine = myTeam === team;
                    const locked = isFull || (myTeam !== null && !isMine);

                    return (
                        <div key={team} class="relative flex flex-col items-center">
                            {(isFull || isMine) && (
                                <span class={`absolute -top-3 z-20 font-anton text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full border backdrop-blur-md ${isMine ? "bg-[#b4cd02]/20 text-[#b4cd02] border-[#b4cd02]/40" : "bg-red-500/20 text-red-400 border-red-500/40"}`}>
                                    {isMine ? "Tu equipo" : "Lleno"}
                                </span>
                            )}

                            <button
                                type="button"
                                disabled={locked}
                                aria-pressed={isMine}
                                aria-label={`Unirse al equipo ${getTranslation(team)}, ${members.length} de ${playersPerTeam} lugares ocupados${isFull ? ", lleno" : ""}`}
                                onClick={() => {
                                    swSound.click();
                                    setSelectedTeam(team);
                                }}
                                class={`group relative w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-black transition-all duration-150 flex flex-col items-center justify-center gap-1.5
                                    ${config.bg} ${config.glow}
                                    ${locked ? "opacity-50 cursor-not-allowed saturate-50" : "hover:scale-105 hover:brightness-110 active:scale-95"}
                                    ${isMine ? "ring-4 ring-[#b4cd02] ring-offset-2 ring-offset-black" : ""}
                                    focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-[#b4cd02]`}
                            >
                                <LucideGamepad2 class="w-8 h-8 md:w-10 md:h-10 text-white/90" strokeWidth={1.5} />
                                <span class="font-anton text-xs md:text-sm tracking-[0.2em] uppercase text-white drop-shadow-md">
                                    {getTranslation(team)}
                                </span>
                                {/* Pips de lugares */}
                                <span class="flex gap-1" aria-hidden="true">
                                    {Array.from({ length: playersPerTeam }).map((_, i) => (
                                        <span key={i} class={`size-2 rounded-full ${i < members.length ? "bg-white" : "bg-black/40"}`} />
                                    ))}
                                </span>
                                <span class="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors" aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Roster por equipo */}
            <div class="w-full pt-8">
                <div class="flex items-center gap-3 mb-4">
                    <LucideUsers size={16} class="text-[#b4cd02]" />
                    <h2 class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">Roster</h2>
                    <span class="ml-auto font-teko text-[10px] tracking-widest text-neutral-500 uppercase" aria-live="polite">
                        {totalTaken}/{totalSlots} dentro
                    </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.values(TEAMS).slice(0, teamsQuantity).map((team) => {
                        const config = TEAM_CONFIG[team] || TEAM_CONFIG[TEAMS.WHITE];
                        const members = playersTeams[team] || [];
                        const emptySlots = Math.max(0, playersPerTeam - members.length);

                        return (
                            <div
                                key={team}
                                class={`rounded-xl border ${config.border} ${config.soft} overflow-hidden ${config.glow}`}
                            >
                                <div class="px-4 py-2.5 flex items-center justify-between border-b border-white/10 bg-black/40">
                                    <span class="font-squids text-base uppercase tracking-wide text-white">
                                        {getTranslation(team)}
                                    </span>
                                    <span class="font-mono text-xs text-white/70 tabular-nums" aria-label={`${members.length} de ${playersPerTeam}`}>
                                        {members.length}/{playersPerTeam}
                                    </span>
                                </div>
                                <div class="h-1 w-full bg-white/10" aria-hidden="true">
                                    <div class={`h-full ${config.bg} transition-all duration-500`} style={{ width: `${(members.length / Math.max(1, playersPerTeam)) * 100}%` }} />
                                </div>

                                <ul class="p-3 space-y-2" aria-label={`Jugadores del equipo ${getTranslation(team)}`}>
                                    {members.map(({ playerNumber, avatar, displayName, isCaptain }) => (
                                        <li
                                            key={playerNumber}
                                            class="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-white/10"
                                        >
                                            <span class="relative shrink-0">
                                                <img
                                                    src={avatar || "/placeholder.svg"}
                                                    alt=""
                                                    class="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                                                />
                                                {isCaptain && (
                                                    <span class="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black p-0.5 rounded-full border border-black" title="Capitán">
                                                        <LucideCrown size={10} fill="currentColor" />
                                                    </span>
                                                )}
                                            </span>
                                            <span class="flex flex-col min-w-0 flex-1">
                                                <span class="text-xs font-semibold truncate font-rubik text-white/90">
                                                    {displayName}
                                                </span>
                                                <span class={`text-[10px] font-mono ${config.text}`}>
                                                    #{playerNumber.toString().padStart(3, "0")}{isCaptain ? " · Capitán" : ""}
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                    {Array.from({ length: emptySlots }).map((_, i) => (
                                        <li
                                            key={`empty-${i}`}
                                            aria-hidden="true"
                                            class="flex items-center gap-3 p-2 rounded-lg border border-dashed border-white/10 text-white/20"
                                        >
                                            <span class="w-8 h-8 rounded-full border border-dashed border-white/15 shrink-0" />
                                            <span class="font-mono text-[10px] tracking-[0.2em] uppercase">Lugar libre</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </SWGameShell>
    );
};