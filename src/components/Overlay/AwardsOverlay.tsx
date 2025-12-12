import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from 'preact/hooks';
import { LucideTrophy, LucideCrown } from "lucide-preact";

// Types
type OverlayMode = 'hidden' | 'category' | 'nominees' | 'winner';

interface OverlayState {
  mode: OverlayMode;
  categoryId: string;
  visibleNominees: string[];
  winnerId?: string;
}

export const AwardsOverlay = () => {
  const [state, setState] = useState<OverlayState>({
    mode: 'hidden',
    categoryId: '',
    visibleNominees: [],
  });
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/overlay/state?lastVersion=${version}`);
        if (res.status === 200) {
          const data = await res.json();
          if (isMounted && data.version > version) {
            setState(data.state);
            setVersion(data.version);
          }
        }
      } catch (err) {
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        if (isMounted) setTimeout(fetchState, 100);
      }
    };
    fetchState();
    return () => { isMounted = false; };
  }, [version]);

  const category = CATEGORIES.find(c => c.id === state.categoryId);
  const activeNominees = category?.nominees.filter(n => state.visibleNominees.includes(n.id)) || [];

  const nomineesDetails = activeNominees.map(n => {
    // @ts-ignore
    const details = NOMINEES[n.id] || { displayName: n.id };
    return { ...n, ...details, id: n.id };
  });

  // @ts-ignore
  const winnerDetails = state.winnerId ? { ...NOMINEES[state.winnerId], id: state.winnerId } : null;

  // CAMBIO 1: Eliminamos el return null para permitir que AnimatePresence haga el fade-out.
  // Usamos pointer-events para que el overlay no bloquee clicks cuando está 'hidden'.
  const isHidden = state.mode === 'hidden';

  return (
    <div className={`fixed inset-0 w-full h-dvh overflow-hidden bg-transparent font-rubik text-white select-none box-border transition-all ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}>

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">

          {/* --- 1. MODO: CATEGORÍA (INTRO) --- */}
          {state.mode === 'category' && category && (
            <motion.div
              key={`category-${category.id}`} // Key única para forzar animación si cambia categoría
              className="w-full h-full flex flex-col items-center justify-center text-center gap-4 p-16"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)", transition: { duration: 0.5 } }}
              transition={{ duration: 0.8, ease: "circOut" }}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="h-[2px] w-16 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                <span className="text-5xl font-bold uppercase tracking-[0.3em] text-yellow-500 drop-shadow-md">
                  Terna
                </span>
                <div className="h-[2px] w-16 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
              </div>

              <h1 className="text-8xl font-cinzel uppercase text-white leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-balance max-w-5xl">
                {category.name}
              </h1>
            </motion.div>
          )}


          {/* --- 2. MODO: NOMINADOS --- */}
          {state.mode === 'nominees' && category && (
            <motion.div
              key="nominees"
              className="w-full h-full relative flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
            >
              {/* HEADER CATEGORÍA */}
              {/* CAMBIO 2: Aumentado z-index a 50 para asegurar que esté sobre las cards */}
              <motion.div
                key={`header-${category.id}`}
                className="absolute top-12 inset-x-0 flex flex-col items-center z-50"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              >
                <div className="flex flex-col items-center bg-black/80 backdrop-blur-md border border-white/10 rounded-3xl px-12 py-4 shadow-2xl">
                  <span className="text-yellow-500 font-bold tracking-[0.3em] uppercase text-4xl mb-2 text-right">
                    Terna
                  </span>
                  <h2 className="text-7xl font-cinzel uppercase text-white drop-shadow-xl leading-none text-right">
                    {category.name}
                  </h2>
                </div>
              </motion.div>

              {/* CONTENEDOR PRINCIPAL */}
              <div className="w-full h-full z-0">

                {/* --- CASO 1: UN SOLO NOMINADO (Single Card) --- */}
                {activeNominees.length === 1 ? (
                  <div className="w-full h-full flex items-center justify-center pt-24">
                    {(() => {
                      const nominee = nomineesDetails[0];
                      return (
                        <motion.div
                          key={nominee.id}
                          layoutId={nominee.id}
                          initial={{ opacity: 0, scale: 0.9, y: 30 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
                          transition={{ duration: 0.7, type: "spring", bounce: 0.2 }}
                          className="relative w-full max-w-[450px] aspect-[3/4] rounded-[2rem] overflow-hidden border-[4px] border-white/10 bg-[#111] shadow-[0_0_60px_rgba(0,0,0,0.7)]"
                        >
                          <div className="absolute inset-0 overflow-hidden">
                            <motion.img
                              src={`/images/nominees/${nominee.id.toLowerCase()}.webp`}
                              alt={nominee.displayName}
                              className="w-full h-full object-cover"
                              animate={{ scale: [1, 1.1] }}
                              transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                              onError={(e: any) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${nominee.displayName}&background=222&color=fff&size=512` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90"></div>
                          </div>

                          <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center text-center pb-10">
                            <div className="w-12 h-1.5 bg-yellow-500 mb-4 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
                            <h3 className="text-5xl font-anton uppercase text-white leading-[0.9] drop-shadow-[0_5px_10px_rgba(0,0,0,1)]">
                              {nominee.displayName}
                            </h3>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>
                ) : (
                  // --- CASO 2: GRID (Múltiples) ---
                  <div className="w-full h-full flex flex-col justify-center pt-32 px-12">
                    <div className={`grid gap-8 w-full mx-auto ${activeNominees.length === 2 ? 'grid-cols-2 max-w-2xl' :
                      activeNominees.length === 3 ? 'grid-cols-3 max-w-4xl' :
                        'grid-cols-5 max-w-6xl'
                      }`}>
                      {nomineesDetails.map((nominee, i) => (
                        <motion.div
                          key={nominee.id}
                          layoutId={nominee.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)" }}
                          transition={{ delay: i * 0.1, duration: 0.5, type: "spring", bounce: 0.2 }}
                          className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 bg-[#111] shadow-2xl"
                        >
                          <div className="absolute inset-0 overflow-hidden">
                            <motion.img
                              src={`/images/nominees/${nominee.id.toLowerCase()}.webp`}
                              alt={nominee.displayName}
                              className="w-full h-full object-cover"
                              animate={{ scale: [1, 1.08] }}
                              transition={{ duration: 12, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                              onError={(e: any) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${nominee.displayName}&background=222&color=fff&size=512` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90"></div>
                          </div>

                          <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col items-center text-center pb-5">
                            <div className="w-8 h-1 bg-yellow-500 mb-2 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
                            <h3 className="text-2xl font-anton uppercase text-white leading-[0.95] drop-shadow-xl">
                              {nominee.displayName}
                            </h3>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}


          {/* --- 3. MODO: GANADOR (REVEAL) --- */}
          {state.mode === 'winner' && winnerDetails && category && (
            <motion.div
              key="winner"
              className="flex flex-col items-center justify-center w-full h-full relative z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.5 } }}
            >
              <motion.div
                className="absolute w-[800px] h-[800px] bg-yellow-500/15 rounded-full blur-[120px]"
                animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <motion.div
                className="flex flex-col items-center z-10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <div className="flex items-center gap-3 bg-yellow-500 text-black px-8 py-2 rounded-full font-bold text-xl uppercase tracking-widest mb-8 shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                  <LucideTrophy size={24} /> Ganador
                </div>

                {/* Imagen Ganador */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-full border-[8px] border-yellow-500 blur-md opacity-60 animate-pulse"></div>
                  <motion.div
                    className="size-[280px] rounded-full overflow-hidden border-[6px] border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.3)] bg-black"
                    layoutId={winnerDetails.id}
                  >
                    <img
                      src={`/images/nominees/${winnerDetails.id.toLowerCase()}.webp`}
                      alt={winnerDetails.displayName}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]">
                    <LucideCrown size={56} fill="currentColor" />
                  </div>
                </div>

                <h2 className="text-xl text-white/60 font-mono uppercase tracking-[0.2em] mb-4 bg-black/40 px-4 py-1 rounded backdrop-blur-sm">
                  {category.name}
                </h2>

                <h1 className="text-7xl font-anton text-white uppercase leading-none drop-shadow-[0_5px_15px_rgba(0,0,0,1)] text-balance text-center max-w-4xl">
                  {winnerDetails.displayName}
                </h1>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};