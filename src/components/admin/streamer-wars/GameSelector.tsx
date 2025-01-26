import { actions } from "astro:actions";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export const GAMES = [
    {
        id: "ButtonBox",
        props: {
            teams: {
                type: Number,
                min: 2,
                max: 5,
            },
            maxPlayersPerTeam: 0,
        },
    },
];

const GameConfigurator = ({ game }: { game: typeof GAMES[number] }) => {
    const [teams, setTeams] = useState(game.props.teams.min);
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(game.props.maxPlayersPerTeam);

    return (
        <div class="flex flex-col items-center">
            <div class="flex items-center mb-4">
                <label class="mr-2">Equipos</label>
                <input
                    type="number"
                    min={game.props.teams.min}
                    max={game.props.teams.max}
                    value={teams}
                    onInput={(e) => setTeams(parseInt(e.currentTarget.value))}
                    class="border rounded p-1 w-16 text-center"
                />
            </div>
            <div class="flex items-center mb-4">
                <label class="mr-2">Jugadores por equipo</label>
                <input
                    type="number"
                    value={maxPlayersPerTeam}
                    onInput={(e) => setMaxPlayersPerTeam(parseInt(e.currentTarget.value))}
                    class="border rounded p-1 w-16 text-center"
                />
            </div>
            <div class="mt-4">
                <p class="text-sm text-gray-600">
                    Equipos configurados: <strong>{teams}</strong>
                </p>
                <p class="text-sm text-gray-600">
                    Máx. jugadores por equipo: <strong>{maxPlayersPerTeam}</strong>
                </p>
            </div>
        </div>
    );
};

export const GameSelector = () => {
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    const launchGame = async () => {
        if (!selectedGame) return;

        const { error, data } = await actions.streamerWars.launchGame({
            game: selectedGame,
        });

        if (error) {
            toast.warning(error);
        }

        if (data) {
            toast.success("Juego lanzado correctamente");
        }
    };

    const sendToWaitingRoom = async () => {
        const { error, data } = await actions.streamerWars.sendToWaitingRoom();

        if (error) {
            toast.warning("Error al enviar a la sala de espera: " + error);
        }

        if (data) {
            toast.success("Todos enviados a la sala de espera");
        }
    };

    return (
        <div class="flex flex-col items-center">
            <h1 class="text-3xl font-bold text-center mb-4">Selecciona el juego</h1>
            <div class="flex flex-wrap justify-center">
                {GAMES.map(({ id }) => (
                    <button
                        key={id}
                        class={`bg-gray-800 text-white rounded-lg px-4 py-2 m-2 ${selectedGame === id ? "bg-green-500" : ""}`}
                        onClick={() => setSelectedGame(id)}
                    >
                        {id}
                    </button>
                ))}
            </div>
            <div class="mt-4">
                {selectedGame && (
                    <div>
                        <h2 class="text-xl font-bold text-center mb-4">Configuración</h2>
                        {GAMES.find((game) => game.id === selectedGame) && (
                            <GameConfigurator game={GAMES.find((game) => game.id === selectedGame)!} />
                        )}
                        <button
                            onClick={launchGame}
                            class="bg-blue-600 text-white rounded-lg px-4 py-2 mt-4"
                        >
                            Lanzar juego
                        </button>
                    </div>
                )}
                <button
                    onClick={sendToWaitingRoom}
                    class="bg-red-600 text-white rounded-lg px-4 py-2 mt-4"
                >
                    Enviar a todos a sala de espera
                </button>
            </div>
        </div>
    );
};
