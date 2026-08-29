import { useState, useEffect } from "preact/hooks";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS_BOTON, PUSHER_EVENTS_BOTON } from "@/consts/pusher";
import { actions } from "astro:actions";
import confetti from "canvas-confetti";

interface BotonState {
  userId: string;
  username: string;
  image: string | null;
  pressedAt: number;
}

interface Props {
  user: {
    id: string;
    name: string;
    image: string | null;
    isAdmin: boolean;
  };
}

export default function BotonGame({ user }: Props) {
  const [pressedBy, setPressedBy] = useState<BotonState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    actions.games.boton.getState().then(({ data }) => {
      if (data?.state) setPressedBy(data.state);
    });

    pusherService.subscribe(PUSHER_CHANNELS_BOTON.GAME);

    const onPressed = (state: BotonState) => {
      setPressedBy(state);
      if (state.userId === user.id) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      }
    };

    const onCleaned = () => {
      setPressedBy(null);
    };

    pusherService.bind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_PRESSED, onPressed);
    pusherService.bind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_CLEANED, onCleaned);

    return () => {
      pusherService.unbind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_PRESSED, onPressed);
      pusherService.unbind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_CLEANED, onCleaned);
      pusherService.unsubscribe(PUSHER_CHANNELS_BOTON.GAME);
    };
  }, []);

  async function handlePress() {
    setLoading(true);
    setError(null);
    const { data, error: actionError } = await actions.games.boton.press();
    setLoading(false);
    if (actionError) {
      setError(actionError.message);
    } else if (data?.state) {
      setPressedBy(data.state);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    }
  }

  async function handleClean() {
    setLoading(true);
    setError(null);
    const { error: actionError } = await actions.games.boton.clean();
    setLoading(false);
    if (actionError) {
      setError(actionError.message);
    }
  }

  const someonePressed = pressedBy !== null;
  const isMe = pressedBy?.userId === user.id;

  return (
    <div class="min-h-dvh flex flex-col items-center justify-center p-4">
      <div class="text-center mb-8">
        <h1 class="font-anton text-5xl sm:text-7xl text-white tracking-wide">
          ¿QUIÉN APRETÓ?
        </h1>
        <p class="text-white/30 font-rubik text-sm mt-2">
          El primero en apretar el botón gana
        </p>
      </div>

      {error && (
        <div class="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 font-rubik text-sm text-center max-w-sm">
          {error}
        </div>
      )}

      {someonePressed ? (
        <div class="flex flex-col items-center gap-4">
          <div class="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse">
            {pressedBy!.image ? (
              <img
                src={pressedBy!.image}
                alt={pressedBy!.username}
                class="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span class="font-anton text-4xl text-stone-900">
                {pressedBy!.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div class="text-center">
            <p class="font-anton text-2xl text-white">
              {isMe ? "¡VOS apretaste!" : `${pressedBy!.username} apretó primero!`}
            </p>
            <p class="text-white/30 font-rubik text-xs mt-1">
              Esperando a que el admin limpie...
            </p>
          </div>

          {user.isAdmin && (
            <button
              onClick={handleClean}
              disabled={loading}
              class="mt-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-anton text-lg tracking-wider px-8 py-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {loading ? "Limpiando..." : "LIMPIAR"}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handlePress}
          disabled={loading}
          class="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 disabled:opacity-50 shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 transition-all duration-200 hover:scale-105 active:scale-90 flex items-center justify-center group"
        >
          <span class="font-anton text-4xl sm:text-5xl text-white group-hover:scale-110 transition-transform duration-200">
            {loading ? "..." : "APRETÁ"}
          </span>
        </button>
      )}

      <div class="absolute bottom-4 left-0 right-0 text-center">
        <p class="text-white/10 font-rubik text-[10px]">
          {user.name} · {user.isAdmin ? "Admin" : "Jugador"}
        </p>
      </div>
    </div>
  );
}
