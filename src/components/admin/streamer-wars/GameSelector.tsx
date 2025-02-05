import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";

export const GAMES = [
    {
        id: "TeamSelector",
        props: {
            teamsQuantity: {
                type: Number,
                min: 2,
                max: 5,
                default: 2
            },
            playersPerTeam: {
                type: Number,
                min: 1,
                max: 10,
                default: 4
            }
        }
    },
    {
        id: "SimonSays",
        props: {}
    }
    // Más juegos pueden añadirse con sus propias props
];

const GameConfigurator = ({
    game,
    config,
    setConfig
}: {
    game: typeof GAMES[number],
    config: Record<string, number>,
    setConfig: (cfg: Record<string, number>) => void
}) => {
    const handleChange = (propName: string, value: number) => {
        setConfig({
            ...config,
            [propName]: value
        });
    };

    return (
        <div class="flex flex-col items-center">
            {Object.entries(game.props).map(([propName, propConfig]) => (
                <div key={propName} class="flex items-center mb-4">
                    <label class="mr-2 capitalize">{propName}</label>
                    <input
                        type="number"
                        min={propConfig.min}
                        max={propConfig.max}
                        value={config[propName]}
                        onInput={(e) => handleChange(
                            propName,
                            parseInt(e.currentTarget.value)
                        )}
                        class="border bg-neutral-950 rounded p-1 w-16 text-center"
                    />
                </div>
            ))}
            <div class="mt-4">
                {Object.entries(config).map(([propName, value]) => (
                    <p key={propName} class="text-sm text-gray-600">
                        {propName}: <strong>{value}</strong>
                    </p>
                ))}
            </div>
        </div>
    );
};

export const GameSelector = () => {
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [config, setConfig] = useState<Record<string, number>>({});

    // Inicializar configuración cuando cambia el juego
    useEffect(() => {
        if (selectedGame) {
            const game = GAMES.find(g => g.id === selectedGame);
            if (!game) return;
            const initialConfig = Object.fromEntries(
                Object.entries(game.props).map(([key, cfg]) => [
                    key,
                    cfg.default || cfg.min
                ])
            );
            setConfig(initialConfig);
        }
    }, [selectedGame]);

    const launchGame = async () => {
        if (!selectedGame) return;


        const { error, data } = await actions.streamerWars.launchGame({
            game: selectedGame,
            props: config
        });

        if (error) {
            toast.warning(error);
        }

        if (data) {
            toast.success("Juego lanzado correctamente");
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
                            <GameConfigurator
                                game={GAMES.find(g => g.id === selectedGame)!}
                                config={config}
                                setConfig={setConfig}
                            />)}
                        <button
                            onClick={launchGame}
                            class="bg-blue-600 text-white rounded-lg px-4 py-2 mt-4"
                        >
                            Lanzar juego
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
