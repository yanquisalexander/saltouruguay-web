import { useState, useEffect, useRef } from "preact/hooks";
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

export default function BotonOverlay() {
  const [pressedBy, setPressedBy] = useState<BotonState | null>(null);
  const winnerSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Precargar el audio una sola vez
    winnerSoundRef.current = new Audio("/sounds/winner.mp3");
    winnerSoundRef.current.volume = 0.8;
    winnerSoundRef.current.load();

    actions.games.boton.getState().then(({ data }) => {
      if (data?.state) setPressedBy(data.state);
    });

    pusherService.subscribe(PUSHER_CHANNELS_BOTON.GAME);

    const onPressed = (state: BotonState) => {
      setPressedBy(state);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

      if (winnerSoundRef.current) {
        winnerSoundRef.current.currentTime = 0;
        winnerSoundRef.current.play().catch((err) => {
          console.warn("No se pudo reproducir el sonido:", err);
        });
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

  if (!pressedBy) {
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

  return (
    <div class="w-dvw h-dvh flex items-center justify-center">
      <div class="text-center animate-in fade-in zoom-in duration-300">
        <div class="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl shadow-amber-500/50 mb-4">
          {pressedBy.image ? (
            <img
              src={pressedBy.image}
              alt={pressedBy.username}
              class="w-full h-full object-cover"
            />
          ) : (
            <div class="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span class="font-anton text-5xl text-stone-900">
                {pressedBy.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <p class="font-anton text-4xl text-white tracking-wide drop-shadow-lg">
          {pressedBy.username}
        </p>
        <p class="font-rubik text-sm text-white/50 mt-1">
          apretó el botón primero
        </p>
      </div>
    </div>
  );
}