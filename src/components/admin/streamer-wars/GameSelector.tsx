import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";

export const GAMES = [
    {
        id: "TeamSelector",
        name: "Selector de equipos",
        icon: "🔢",
        classNames: "bg-gradient-to-r from-blue-500 to-blue-700",
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
        name: "Simón dice",
        icon: "🔴",
        classNames: "bg-gradient-to-r from-red-500 to-red-700",
        props: {}
    },
    {
        id: "CaptainBribery",
        name: "Soborno al capitán",
        icon: "💰",
        classNames: "bg-gradient-to-r from-yellow-500 to-yellow-700",
        props: {}
    },
    {
        id: "AutoElimination",
        name: "Autoeliminación",
        icon: "🚫",
        classNames: "bg-gradient-to-r from-gray-500 to-gray-700",
        props: {}
    },
    {
        id: "Dalgona",
        name: "Dalgona (Ppopgi)",
        icon: "🍪",
        classNames: "bg-gradient-to-r from-orange-500 to-orange-700",
        props: {}
    },
    {
        id: "TugOfWar",
        name: "Tug of War (Juego de la Cuerda)",
        icon: "🪢",
        classNames: "bg-gradient-to-r from-green-500 to-green-700",
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
            const game = GAMES.find((g) => g.id === selectedGame);
            if (game) {
                const initialConfig = Object.entries(game.props).reduce((acc, [propName, propConfig]) => {
                    acc[propName] = propConfig.default;
                    return acc;
                }, {} as Record<string, number>);

                setConfig(initialConfig);
            }
        }
    }, [selectedGame]);

    const launchGame = async () => {
        if (!selectedGame) return;


        const { error, data } = await actions.streamerWars.launchGame({
            game: selectedGame,
            props: config
        });

        if (error) {
            toast.warning(error.message);
        }

        if (data) {
            toast.success("Juego lanzado correctamente");
        }
    };



    return (
        <div class="flex flex-col items-center">
            <h1 class="text-3xl font-bold text-center mb-4">Selecciona el juego</h1>
            <div class="flex flex-wrap justify-center">
                {GAMES.map(({ id, name, icon, classNames }) => (
                    <button
                        key={id}
                        class={`flex items-center justify-center bg-white text-black rounded-lg p-4 m-2 border-2 ${classNames} ${selectedGame === id ? " border-white" : "border-transparent"}`}
                        onClick={() => setSelectedGame(id)}
                    >
                        {icon} <span class="ml-2">{name}</span>
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
