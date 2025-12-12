import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from 'preact/hooks';

// Types
type OverlayMode = 'hidden' | 'category' | 'nominees' | 'winner' | 'paused';

interface OverlayState {
  mode: OverlayMode;
  categoryId: string;
  visibleNominees: string[]; // Nominee IDs
  winnerId?: string;
  previousMode?: OverlayMode;
}

const POLL_INTERVAL = 1000; // Fallback poll interval if long polling fails immediately

export const AwardsOverlay = () => {
  const [state, setState] = useState<OverlayState>({
    mode: 'hidden',
    categoryId: '',
    visibleNominees: [],
  });
  const [version, setVersion] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(true);

  // Long Polling Logic
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/overlay/state?lastVersion=${version}`);
        if (res.status === 200) {
          const data = await res.json();
          if (isMounted && data.version > version) {
            setState(data.state);
            setVersion(data.version);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
        // If error, wait a bit before retrying to avoid spamming
        if (isMounted) setIsConnected(false);
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        if (isMounted) {
          // Immediately poll again for "long polling" effect, 
          // or short delay if connection closed fast.
          // Since our API handles the wait, we can call immediately.
          timeoutId = setTimeout(fetchState, 100);
        }
      }
    };

    fetchState();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [version]);

  // Derived Data
  const category = CATEGORIES.find(c => c.id === state.categoryId);
  // Filter nominees that are in the "visibleNominees" list
  const activeNominees = category?.nominees.filter(n => state.visibleNominees.includes(n.id)) || [];

  const nomineesDetails = activeNominees.map(n => {
    // @ts-ignore
    const details = NOMINEES[n.id] || { displayName: n.id };
    return { ...n, ...details, id: n.id };
  });

  const winnerDetails = state.winnerId
    // @ts-ignore
    ? NOMINEES[state.winnerId]
    : null;

  // Render Helpers
  if (state.mode === 'hidden') return null;

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center font-rubik text-white p-12">
      <AnimatePresence mode="wait">

        {/* Category Mode */}
        {state.mode === 'category' && category && (
          <motion.div
            key="category"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center flex flex-col items-center gap-6"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              className="h-2 bg-yellow-500 rounded-full mb-4"
            />
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-[0.2em] text-yellow-500 drop-shadow-lg">
              Categoría
            </h2>
            <h1 className="text-7xl md:text-9xl font-anton uppercase text-white drop-shadow-2xl max-w-5xl leading-tight">
              {category.name}
            </h1>
          </motion.div>
        )}


        {/* Nominees Grid Mode (Multiple) */}
        {state.mode === 'nominees' && category && activeNominees.length > 1 && (
          <motion.div
            key="nominees-grid"
            className="w-full max-w-7xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.header
              className="flex items-center gap-6 mb-12 border-b-2 border-white/20 pb-6"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h2 className="text-5xl font-anton uppercase text-yellow-500">
                {category.name}
              </h2>
              <span className="text-2xl font-light text-white/60 tracking-widest uppercase">
                / Nominados
              </span>
            </motion.header>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              layout
            >
              <AnimatePresence>
                {nomineesDetails.map((nominee, index) => (
                  <motion.div
                    key={nominee.id}
                    layoutId={nominee.id}
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                    transition={{
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    className="relative group bg-black/60 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                    <div className="flex items-center aspect-video bg-white/5 relative overflow-hidden">
                      <img
                        src={`/images/nominees/${nominee.id.toLowerCase()}.webp`}
                        alt={nominee.displayName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75 group-hover:brightness-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${nominee.displayName}&background=random&size=512`;
                        }}
                      />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6">
                      <motion.div
                        className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 uppercase tracking-wide"
                      >
                        Nominado
                      </motion.div>
                      <h3 className="text-3xl font-anton uppercase text-white drop-shadow-md">
                        {nominee.displayName}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* Single Nominee Focus Mode */}
        {state.mode === 'nominees' && category && activeNominees.length === 1 && (
          <motion.div
            key={Math.random()}
            className="flex items-center justify-center w-full max-w-6xl mx-auto absolute inset-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
            transition={{ type: "spring", bounce: 0.3 }}
          >
            {/* Background elements for visual interest */}
            <motion.div
              className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            <div className="flex flex-row items-center gap-12 bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-5xl w-full">
              {/* Left: Image */}
              <motion.div
                className="shrink-0 w-80 h-80 rounded-2xl overflow-hidden border-4 border-white/5 relative shadow-2xl"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <img
                  src={`/images/nominees/${nomineesDetails[0].id.toLowerCase()}.webp`}
                  // @ts-ignore
                  alt={nomineesDetails[0].displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // @ts-ignore
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${nomineesDetails[0].displayName}&background=0A0A0A&color=fff&size=512`;
                  }}
                />
              </motion.div>

              {/* Right: Info */}
              <div class="flex flex-col flex-1 gap-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-2 block">
                    {category.name}
                  </span>
                  <h2 className="text-6xl md:text-7xl font-anton uppercase text-white leading-none">
                    {/* @ts-ignore */}
                    {nomineesDetails[0].displayName}
                  </h2>
                </motion.div>

                <motion.div
                  className="h-1 w-32 bg-yellow-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: 128 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />

                <motion.p
                  className="text-white/60 text-lg font-light max-w-md mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Nominado oficial en la categoría {category.name}.
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}



      </AnimatePresence>
    </div>
  );
};
