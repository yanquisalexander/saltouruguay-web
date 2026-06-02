import { motion, AnimatePresence } from "motion/react";
import { CDN_PREFIX, playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import pusherClient from "@/services/pusher.client";
import { cloneElement, type JSX } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { INSTRUCTIONS_REGISTRY, type ScriptItem } from "./InmersiveInstructionsConst";
import type { Players } from "../admin/streamer-wars/Players";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "@/consts/pusher";
import { Typewriter } from "./cinematic/Typewriter";
import { Atmosphere } from "./cinematic/Atmosphere";
import { ProgressDots } from "./cinematic/ProgressDots";
import { CinematicTimer } from "./cinematic/CinematicTimer";
import { itemVariants, itemTransition } from "./cinematic/transitions";
import { MOOD_STYLES, type Mood } from "./cinematic/moods";

interface InmersiveInstructionsProps {
  players?: Players[];
}

export const InmersiveInstructions = ({ players }: InmersiveInstructionsProps) => {
  const [activeScript, setActiveScript] = useState<ScriptItem[] | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);

  const totalDuration = activeScript
    ? activeScript.reduce((acc, item) => acc + item.duration, 0) / 1000
    : 0;

  // 1. PUSHER LISTENER
  useEffect(() => {
    const channel = pusherClient.subscribe(PUSHER_CHANNELS.GLOBAL);

    const handleInstructions = (data: { id: string }) => {
      console.log("Instrucción inmersiva recibida:", data.id);
      const script = INSTRUCTIONS_REGISTRY[data.id];

      if (script) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        script.forEach((item) => {
          if (item.audioPath) {
            const audio = new Audio(`${CDN_PREFIX}scripts/${item.audioPath}.mp3`);
            audio.preload = "auto";
          }
        });

        setActiveScript(script);
        activeIdRef.current = data.id;
        setCurrentIndex(0);
        setExiting(false);
        setIsVisible(true);
      } else {
        console.warn(`No se encontró script para el ID: ${data.id}`);
      }
    };

    channel.bind(PUSHER_EVENTS.INMERSIVE_INSTRUCTIONS, handleInstructions);

    return () => {
      channel.unbind(PUSHER_EVENTS.INMERSIVE_INSTRUCTIONS, handleInstructions);
    };
  }, []);

  // 2. PLAYBACK LOGIC
  useEffect(() => {
    if (!activeScript || !isVisible) return;

    const playItem = (index: number) => {
      if (index >= activeScript.length) {
        document.dispatchEvent(
          new CustomEvent("inmersive-instructions-ended", { detail: { id: activeIdRef.current } })
        );
        setIsVisible(false);
        return;
      }

      setCurrentIndex(index);
      const item = activeScript[index];

      if (item.audioPath) {
        const path = `scripts/${item.audioPath}`;
        if (item.omitReverb) {
          playSound({ sound: path, volume: item.volume || 1 });
        } else {
          playSoundWithReverb({ sound: path, volume: item.volume || 1 });
        }
      }

      if (item.execute) {
        item.execute();
      }

      timeoutRef.current = window.setTimeout(() => {
        playItem(index + 1);
      }, item.duration);
    };

    playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.3 });
    playItem(0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeScript]);

  const currentItem = isVisible && activeScript ? activeScript[currentIndex] : null;
  const mood: Mood = currentItem?.mood || "neutral";
  const moodStyle = MOOD_STYLES[mood];

  const renderComponent = () => {
    if (!currentItem?.component) return null;
    const el =
      typeof currentItem.component === "function"
        ? currentItem.component({ players })
        : currentItem.component;
    return cloneElement(el as JSX.Element, { key: currentIndex });
  };

  const handleExitComplete = () => {
    if (!isVisible) {
      setExiting(true);
    }
  };

  // Cleanup outside AnimatePresence to avoid state updates during exit
  useEffect(() => {
    if (exiting) {
      setActiveScript(null);
      setExiting(false);
    }
  }, [exiting]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && activeScript && currentItem && (
        <motion.div
          key="inmersive-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed inset-0 z-9000 transition-shadow duration-500 ${moodStyle.bg} ${moodStyle.glow}`}
        >
          {/* BACKGROUND ATMOSPHERE */}
          {currentItem.atmosphere && currentItem.atmosphere !== "none" && (
            <Atmosphere type={currentItem.atmosphere} />
          )}

          {/* TIMER */}
          {totalDuration > 0 && <CinematicTimer totalSeconds={totalDuration} mood={mood} />}

          {/* LETTERBOX BARS */}
          {currentItem.letterbox && (
            <>
              <div className="fixed top-0 left-0 right-0 h-16 md:h-24 bg-black z-20" />
              <div className="fixed bottom-0 left-0 right-0 h-16 md:h-24 bg-black z-20" />
            </>
          )}

          {/* FULLSCREEN MODE */}
          {currentItem.fullScreen ? (
            <div className="relative z-10 size-full">
              {renderComponent()}
            </div>
          ) : (
            /* NORMAL LAYOUT */
            <div
              className={`relative z-10 flex min-h-dvh h-full w-full flex-col justify-center items-center ${
                currentItem.shake ? "animate-shake" : ""
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${currentIndex}`}
                  variants={itemVariants[currentItem.transitionIn || "fade"]}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={itemTransition}
                  className="flex flex-col items-center justify-center w-full"
                >
                  {/* CUSTOM COMPONENT */}
                  {currentItem?.component && (
                    <div className="min-h-[200px] flex items-center justify-center">
                      {renderComponent()}
                    </div>
                  )}

                  {/* TEXT WITH TYPEWRITER */}
                  {currentItem?.text && (
                    <div className="mt-12 fixed bottom-16 bg-neutral-900/40 px-2 py-1 max-w-2xl w-full mx-auto">
                      {currentItem.textAnimation === "none" ? (
                        <p className="font-mono text-center text-white text-md leading-relaxed">
                          {currentItem.text}
                        </p>
                      ) : (
                        <Typewriter
                          text={currentItem.text}
                          speed={currentItem.typewriterSpeed || 35}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* PROGRESS DOTS */}
          <ProgressDots
            total={activeScript.length}
            current={currentIndex}
            activeClass={moodStyle.progressActive}
            pastClass={moodStyle.progressPast}
            futureClass={moodStyle.progressFuture}
          />

          {/* SHAKE KEYFRAMES */}
          {currentItem.shake && (
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10% { transform: translateX(-4px) rotate(-0.5deg); }
                20% { transform: translateX(4px) rotate(0.5deg); }
                30% { transform: translateX(-3px); }
                40% { transform: translateX(3px); }
                50% { transform: translateX(-2px); }
                60% { transform: translateX(2px); }
                70% { transform: translateX(-1px); }
                80% { transform: translateX(1px); }
                90% { transform: translateX(0); }
              }
              .animate-shake {
                animation: shake 0.5s ease-in-out;
              }
            `}</style>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};