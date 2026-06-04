import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";
import { LucideRocket, LucideGamepad2 } from "lucide-preact";

export const GAMES = [
  {
    id: "TeamSelector",
    name: "Selector de equipos",
    icon: "🔢",
    gradient: "from-blue-600/80 to-blue-700/80",
    props: {
      teamsQuantity: { type: Number, min: 2, max: 5, default: 2 },
      playersPerTeam: { type: Number, min: 1, max: 10, default: 4 },
    },
  },
  {
    id: "SimonSays",
    name: "Simón dice",
    icon: "🔴",
    gradient: "from-red-600/80 to-red-700/80",
    props: {},
  },
  {
    id: "CaptainBribery",
    name: "Soborno al capitán",
    icon: "💰",
    gradient: "from-yellow-600/80 to-yellow-700/80",
    props: {},
  },
  {
    id: "AutoElimination",
    name: "Autoeliminación",
    icon: "🚫",
    gradient: "from-neutral-600/80 to-neutral-700/80",
    props: {},
  },
  {
    id: "Dalgona",
    name: "Dalgona (Ppopgi)",
    icon: "🍪",
    gradient: "from-orange-600/80 to-orange-700/80",
    props: {},
  },
  {
    id: "TugOfWar",
    name: "Tug of War",
    icon: "🪢",
    gradient: "from-green-600/80 to-green-700/80",
    props: {},
  },
  {
    id: "Bomb",
    name: "Desactivar la Bomba",
    icon: "💣",
    gradient: "from-red-600/80 to-red-700/80",
    props: {},
  },
  {
    id: "Fishing",
    name: "Fishing (Pesca)",
    icon: "🎣",
    gradient: "from-cyan-600/80 to-cyan-700/80",
    props: {},
  },
  {
    id: "AndIChallenge",
    name: "And I Challenge",
    icon: "🎵",
    gradient: "from-purple-600/80 to-purple-700/80",
    props: {},
  },
];

export const GameSelector = () => {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedGame) {
      const game = GAMES.find((g) => g.id === selectedGame);
      if (game) {
        const initialConfig = Object.entries(game.props).reduce(
          (acc, [propName, propConfig]) => {
            acc[propName] = propConfig.default;
            return acc;
          },
          {} as Record<string, number>,
        );
        setConfig(initialConfig);
      }
    }
  }, [selectedGame]);

  const launchGame = async () => {
    if (!selectedGame) return;
    const { error, data } = await actions.streamerWars.launchGame({
      game: selectedGame,
      props: config,
    });
    if (error) toast.warning(error.message);
    if (data) toast.success("Juego lanzado correctamente");
  };

  const selected = GAMES.find((g) => g.id === selectedGame);

  return (
    <div class="bg-[#0a0a0a] border border-neutral-800 rounded-lg overflow-hidden mb-8">
      <div class="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-[#08080a]">
        <LucideGamepad2 size={16} class="text-[#b4cd02]" />
        <span class="font-anton text-xs tracking-[0.25em] uppercase text-[#b4cd02]">
          Lanzar juego
        </span>
        <span class="ml-auto font-teko text-[10px] tracking-widest text-neutral-700 uppercase">
          {GAMES.length} disponibles
        </span>
      </div>

      <div class="p-5">
        <div class="flex flex-wrap gap-2">
          {GAMES.map(({ id, name, icon, gradient }) => (
            <button
              key={id}
              class={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-anton tracking-wide uppercase transition-all ${
                selectedGame === id
                  ? `bg-linear-to-r ${gradient} text-white shadow-lg scale-105`
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-[#b4cd02]/30 hover:text-neutral-200"
              }`}
              onClick={() => setSelectedGame(id)}
            >
              <span class="text-base">{icon}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>

        {selected && Object.keys(selected.props).length > 0 && (
          <div class="mt-5 pt-5 border-t border-neutral-800">
            <h3 class="font-teko text-sm tracking-[0.3em] uppercase text-neutral-500 mb-4">
              Configuración de {selected.name}
            </h3>
            <div class="flex flex-wrap gap-6">
              {Object.entries(selected.props).map(([propName, propConfig]) => (
                <div key={propName} class="flex items-center gap-3">
                  <label class="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                    {propName.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <input
                    type="number"
                    min={propConfig.min}
                    max={propConfig.max}
                    value={config[propName] ?? propConfig.default}
                    onInput={(e) =>
                      setConfig({
                        ...config,
                        [propName]: parseInt((e.target as HTMLInputElement).value),
                      })
                    }
                    class="w-16 bg-[#050508] text-white text-sm font-mono text-center p-2 outline-hidden border border-neutral-800 focus:border-[#b4cd02]/40 rounded-sm"
                  />
                  <span class="font-teko text-[10px] text-neutral-700">
                    {propConfig.min}-{propConfig.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div class="mt-5 pt-5 border-t border-neutral-800 flex items-center justify-between">
            <div class="font-teko text-xs text-neutral-600 tracking-wider">
              {Object.keys(config).length > 0
                ? Object.entries(config)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")
                : "Sin configuración adicional"}
            </div>
            <button
              onClick={launchGame}
              class="flex items-center gap-2 bg-[#b4cd02] hover:bg-[#b4cd02]/90 text-black font-anton text-xs tracking-[0.2em] uppercase py-2.5 px-6 rounded-sm transition-all shadow-[0_0_15px_rgba(180,205,2,0.15)] hover:shadow-[0_0_25px_rgba(180,205,2,0.3)]"
            >
              <LucideRocket size={14} />
              Lanzar {selected.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
