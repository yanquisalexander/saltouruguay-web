import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { TEAMS } from "@/consts/Teams";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideDot } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";

export const ButtonBox = ({ session, pusher, teamsQuantity, playersPerTeam }: { session: Session; pusher: Pusher; teamsQuantity: number; playersPerTeam: number }) => {
    const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[keyof typeof TEAMS] | null>(null);
    const [playersTeams, setPlayersTeams] = useState<{ [team: string]: { playerNumber: number; avatar: string; displayName: string }[] }>({});

    const handleSelectTeam = (team: typeof TEAMS[keyof typeof TEAMS]) => {
        setSelectedTeam(team);
    }

    useEffect(() => {
        if (!selectedTeam) return;

        if (Object.keys(playersTeams).some((team) => playersTeams[team].some(({ playerNumber }) => playerNumber === session.user.streamerWarsPlayerNumber))) {
            toast.error("Ya estás unido a un equipo");
            return;
        }

        if (Object.keys(playersTeams).some((team) => playersTeams[team].length >= playersPerTeam)) {
            toast.error("El equipo ya está lleno");
            return;
        }

        actions.streamerWars.joinTeam({ team: selectedTeam }).then(({ error, data }) => {
            if (error) {
                console.error(error);
                toast.warning(error)
                return;
            }
            toast.success("Te has unido al equipo correctamente");
        })
    }, [selectedTeam]);

    useEffect(() => {
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log(data);
            setPlayersTeams(data.playersTeams);
        })

        const channel = pusher.subscribe("streamer-wars");
        channel.bind("player-joined", () => {
            actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
                if (error) {
                    console.error(error);
                    return;
                }
                setPlayersTeams(data.playersTeams);
            })
        })

    }, []);

    const COLORS = [
        { team: TEAMS.BLUE, color: "#3498db" },
        { team: TEAMS.RED, color: "#e74c3c" },
        { team: TEAMS.YELLOW, color: "#f1c40f" },
        { team: TEAMS.PURPLE, color: "#8e44ad" },
        { team: TEAMS.WHITE, color: "#ecf0f1" },
    ];

    return (
        <div class="flex flex-col items-center justify-center w-full space-y-6 mt-8">
            {/* Botonera de Equipos */}
            <header class="flex items-center justify-center space-x-4">
                <h1 class="text-white text-2xl font-bold">Selecciona un equipo</h1>
            </header>
            <div class="flex flex-wrap items-center justify-center gap-4">
                {COLORS.slice(0, teamsQuantity).map(({ team, color }) => (
                    <div key={team} class="flex flex-col items-center">
                        <button
                            class={`w-20 h-20 rounded-full bg-[var(--bg)] shadow-lg hover:scale-110 transform transition duration-200`}
                            style={`--bg: ${color}`}
                            onClick={() => {
                                playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK });
                                handleSelectTeam(team)
                            }}
                        >
                            <span class="sr-only">{`Unirse al equipo ${team}`}</span>
                        </button>
                        <span class="mt-2 text-white text-sm font-semibold">{team}</span>
                    </div>
                ))}
            </div>

            {/* Lista de Jugadores */}
            <div class="flex flex-col items-center justify-center w-full space-y-4 pt-16">
                <h2 class="text-white text-xl font-bold">Jugadores en cada equipo</h2>
                <div class="grid grid-cols-4 gap-4">
                    {Object.keys(playersTeams).map((team) => (
                        <div key={team} class="flex flex-col items-center justify-center">
                            <span class="text-white text-lg font-bold">
                                Equipo {team} (x{playersTeams[team].length} / {playersPerTeam})
                                <LucideDot class="inline-block align-middle" size={56} color={COLORS.find(({ team: t }) => t === team)?.color} />
                            </span>
                            <div class="space-y-2 mt-2">
                                {playersTeams[team].map(({ avatar, displayName }) => (
                                    <div key={displayName} class="flex items-center space-x-3">
                                        <img src={avatar} alt={`${displayName}'s avatar`} class="w-10 h-10 rounded-full ring-2 ring-white" />
                                        <span class="text-white text-sm font-semibold">{displayName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
