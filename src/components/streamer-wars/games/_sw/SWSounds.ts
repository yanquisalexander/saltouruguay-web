import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

/**
 * Mapa canónico de sonidos por intención (no por juego).
 * Prohíbe usar SIMON_SAYS_* fuera de Simon; Bomb/AndI dejan de estar mudos.
 */
export const swSound = {
  correct() { playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.6 }); },
  error() { playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6 }); },
  click() { playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK, volume: 0.5 }); },
  countdown() { playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.7 }); },
  win() { playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.8 }); },
  lose() { playSound({ sound: STREAMER_WARS_SOUNDS.ELIMINATED, volume: 0.8 }); },
  warning() { playSound({ sound: STREAMER_WARS_SOUNDS.WARNING, volume: 0.7 }); },
};
