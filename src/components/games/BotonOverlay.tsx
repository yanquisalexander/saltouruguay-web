import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS_BOTON, PUSHER_EVENTS_BOTON } from "@/consts/pusher";
import { actions } from "astro:actions";

interface BotonState {
  userId: string;
  username: string;
  image: string | null;
  pressedAt: number;
}

export default function BotonOverlay() {
  const pressedBy = useSignal<BotonState | null>(null);

  useEffect(() => {
    actions.games.boton.getState().then(({ data }) => {
      if (data?.state) pressedBy.value = data.state;
    });

    pusherService.subscribe(PUSHER_CHANNELS_BOTON.GAME);

    const onPressed = (state: BotonState) => {
      pressedBy.value = state;
    };

    const onCleaned = () => {
      pressedBy.value = null;
    };

    pusherService.bind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_PRESSED, onPressed);
    pusherService.bind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_CLEANED, onCleaned);

    return () => {
      pusherService.unbind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_PRESSED, onPressed);
      pusherService.unbind(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_CLEANED, onCleaned);
      pusherService.unsubscribe(PUSHER_CHANNELS_BOTON.GAME);
    };
  }, []);

  if (!pressedBy.value) {
    return (
      <div class="w-dvw h-dvh flex items-center justify-center">
        <div class="text-center">
          <div class="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
            <span class="font-anton text-4xl text-white/30">?</span>
          </div>
          <p class="font-anton text-2xl text-white/20 tracking-wide">
            Esperando...
          </p>
        </div>
      </div>
    );
  }

  const state = pressedBy.value;

  return (
    <div class="w-dvw h-dvh flex items-center justify-center">
      <div class="text-center animate-in fade-in zoom-in duration-300">
        <div class="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl shadow-amber-500/50 mb-4">
          {state.image ? (
            <img
              src={state.image}
              alt={state.username}
              class="w-full h-full object-cover"
            />
          ) : (
            <div class="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span class="font-anton text-5xl text-stone-900">
                {state.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <p class="font-anton text-4xl text-white tracking-wide drop-shadow-lg">
          {state.username}
        </p>
        <p class="font-rubik text-sm text-white/50 mt-1">
          apretó el botón primero
        </p>
      </div>
    </div>
  );
}
