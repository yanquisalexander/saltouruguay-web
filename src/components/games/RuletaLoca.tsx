import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { motion, useMotionValue, animate } from "motion/react";
import { WHEEL_SEGMENTS, type WheelSegment } from "@/utils/games/wheel-segments";
import { GameHUD, GameReward } from "./GameHUD";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_CHANNELS_RULETA, PUSHER_EVENTS_RULETA } from "@/consts/pusher";
import {
    LucideGamepad2,
    LucideMaximize2,
    LucideMinimize2,
    LucideTrophy,
    LucideRotateCcw,
    LucideSparkles,
    LucideCopy,
    LucideUsers,
    LucideDoorOpen,
    LucideLogOut,
    LucidePlay,
    LucideX,
    LucideStar,
} from "lucide-preact";

interface RuletaLocaProps {
    initialSession?: any;
    initialPhrase?: any;
    initialRoom?: {
        session: any;
        players: { id: number; username: string; avatar: string | null }[];
        phrase: any;
    } | null;
    userId?: number;
}

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const VOWELS = new Set(["A", "E", "I", "O", "U"]);
const CONSONANTS = ALPHABET.filter(l => !VOWELS.has(l));

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const RuletaLoca = ({ initialSession, initialPhrase, initialRoom, userId: propUserId }: RuletaLocaProps) => {
    const [session, setSession] = useState(initialRoom?.session || initialSession);
    const [phrase, setPhrase] = useState(initialRoom?.phrase || initialPhrase);
    const [gameState, setGameState] = useState<"loading" | "idle" | "spinning" | "guessing" | "won" | "lost">("idle");
    const [currentWheelValue, setCurrentWheelValue] = useState(0);
    const [currentSegment, setCurrentSegment] = useState<WheelSegment | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [showSolveInput, setShowSolveInput] = useState(false);
    const [isStalemate, setIsStalemate] = useState(false);
    const [showVowelDialog, setShowVowelDialog] = useState(false);
    const [showLetterDialog, setShowLetterDialog] = useState(false);
    const [showWheelDialog, setShowWheelDialog] = useState(false);
    const [remoteSpinnerId, setRemoteSpinnerId] = useState<number | null>(null);
    const [solveGuess, setSolveGuess] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const wheelRotation = useMotionValue(0);
    const lastTickCountRef = useRef(Math.floor(0 / 45));
    const gameContainerRef = useRef<HTMLDivElement | null>(null);
    const isAnimatingRef = useRef(false);
    const pendingTurnRef = useRef<any>(null);
    const [userId] = useState(propUserId);

    // ─── Multiplayer state ───
    const [roomCode, setRoomCode] = useState<string | null>(initialRoom?.session?.roomCode || null);
    const [players, setPlayers] = useState<{ id: number; username: string; avatar: string | null }[]>(initialRoom?.players || []);
    const [joinCodeInput, setJoinCodeInput] = useState("");
    const [showLobby, setShowLobby] = useState(initialRoom?.session?.status === 'waiting' ?? false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const VOWEL_COST = 100;
    const isMultiplayer = session?.gameMode === 'multi';
    const allConsonantsGuessed = (() => {
        if (!phrase || !session?.guessedLetters) return false;
        const guessed = session.guessedLetters.map((l: string) =>
            l.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
        );
        const guessedSet = new Set(guessed);
        const phraseNormalized = phrase.phrase
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const consonantsInPhrase = new Set<string>();
        for (const ch of phraseNormalized) {
            if (/[A-ZÑ]/.test(ch) && !['A', 'E', 'I', 'O', 'U'].includes(ch)) {
                consonantsInPhrase.add(ch);
            }
        }
        return consonantsInPhrase.size > 0 && [...consonantsInPhrase].every(c => guessedSet.has(c));
    })();
    const currentTurnUserId = isMultiplayer && session?.turnOrder?.length
        ? session.turnOrder[session.currentTurnIdx]
        : null;
    const isMyTurn = isMultiplayer ? currentTurnUserId === userId : true;
    const playerTotalScore = isMultiplayer
        ? (session?.scores?.[String(userId)] || 0) + (session?.currentScore || 0)
        : session?.currentScore || 0;

    const isInitialized = !!session;

    function processPendingTurn() {
        isAnimatingRef.current = false;
        const data = pendingTurnRef.current;
        if (!data) return;
        pendingTurnRef.current = null;
        setSession((prev: any) => {
            const idx = (prev?.turnOrder || []).indexOf(data.currentTurnUserId);
            return { ...prev, currentTurnIdx: idx >= 0 ? idx : 0, currentScore: 0 };
        });
        setGameState("idle");
        setShowWheelDialog(false);
        setShowLetterDialog(false);
        setShowVowelDialog(false);
        if (data.currentTurnUserId === userId) {
            toast("¡Es tu turno!");
        } else {
            const p = players.find((p: { id: number }) => p.id === data.currentTurnUserId);
            const name = p?.username || `Jugador ${data.currentTurnUserId}`;
            toast.info(`Turno de ${name}`);
        }
    }

    useEffect(() => {
        if (!isInitialized) {
            loadGameState();
        }

        const unsubscribe = wheelRotation.onChange((latest: number) => {
            const currentTickCount = Math.floor(latest / 45);
            if (currentTickCount > lastTickCountRef.current) {
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 0.3 });
                lastTickCountRef.current = currentTickCount;
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === gameContainerRef.current);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // ─── Multiplayer: Pusher subscription ───
    const channelName = roomCode ? PUSHER_CHANNELS_RULETA.ROOM(roomCode) : "";
    usePusherChannel({
        channelName,
        enabled: !!roomCode,
        events: {
            [PUSHER_EVENTS_RULETA.ROOM_PLAYER_JOINED]: (data: any) => {
                setPlayers(prev => {
                    if (prev.find(p => p.id === data.userId)) return prev;
                    return [...prev, { id: data.userId, username: data.username, avatar: data.avatar }];
                });
            },
            [PUSHER_EVENTS_RULETA.ROOM_PLAYER_LEFT]: (data: any) => {
                setPlayers(prev => prev.filter(p => p.id !== data.userId));
            },
            [PUSHER_EVENTS_RULETA.ROOM_GAME_STARTING]: (data: any) => {
                setIsStalemate(false);
                setSession((prev: any) => ({
                    ...prev,
                    status: "playing",
                    turnOrder: data.turnOrder,
                    currentTurnIdx: 0,
                    guessedLetters: [],
                    gameMode: 'multi',
                }));
                setPhrase({ phrase: data.phrase.phrase, category: data.phrase.category });
                setGameState("idle");
                setShowLobby(false);
            },
            [PUSHER_EVENTS_RULETA.GAME_WHEEL_SPUN]: (data: any) => {
                if (data.userId !== userId) {
                    isAnimatingRef.current = true;
                    setShowWheelDialog(true);
                    setRemoteSpinnerId(data.userId);
                    setCurrentSegment(data.segment);
                    setIsSpinning(true);

                    const seg = data.segment;
                    const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === seg.label);
                    const segmentAngle = (segmentIndex * 45) + 22.5;
                    const targetVisualAngle = (360 - segmentAngle + 360) % 360;
                    const currentRotation = wheelRotation.get();
                    const currentFullRotations = Math.floor(currentRotation / 360);
                    let targetRotation = (currentFullRotations * 360) + targetVisualAngle;
                    if (targetRotation <= currentRotation) targetRotation += 360;
                    const randomSpins = 5 + Math.floor(Math.random() * 4);
                    const finalRotation = targetRotation + (randomSpins * 360);

                    lastTickCountRef.current = Math.floor(wheelRotation.get() / 45);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GIRAR, volume: 0.5, reverbAmount: 0.3 });

                    const p = players.find((p: { id: number }) => p.id === data.userId);
                    const name = p?.username || `Jugador ${data.userId}`;

                    animate(wheelRotation, finalRotation, {
                        duration: 4,
                        ease: [0.25, 0.1, 0.25, 1],
                        onComplete: () => {
                            setIsSpinning(false);

                            if (seg.type === "bankrupt") {
                                toast.error(`${name} sacó ¡Bancarrota!`);
                                playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                            } else if (seg.type === "lose_turn") {
                                toast.warning(`${name} pierde el turno`);
                                playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.EQUIPO_ELIMINADO, volume: 0.5, reverbAmount: 0.3 });
                            } else {
                                toast.success(`${name} giró ${seg.label} puntos!`);
                                playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ELIJE_CONSONANTE, volume: 0.7, reverbAmount: 0.1 });
                            }

                            setTimeout(() => {
                                setShowWheelDialog(false);
                                setRemoteSpinnerId(null);
                                processPendingTurn();
                            }, 2000);
                        }
                    });
                } else {
                    setCurrentSegment(data.segment);
                }
            },
            [PUSHER_EVENTS_RULETA.GAME_LETTER_GUESSED]: (data: any) => {
                if (data.userId !== userId) {
                    const p = players.find(p => p.id === data.userId);
                    const name = p?.username || `Jugador ${data.userId}`;
                    if (data.found) {
                        toast.success(`${name} encontró la letra "${data.letter}"`);
                    } else {
                        toast.error(`${name} falló con "${data.letter}"`);
                    }
                }
                setSession((prev: any) => ({
                    ...prev,
                    guessedLetters: data.guessedLetters,
                    currentScore: data.currentScore,
                }));
            },
            [PUSHER_EVENTS_RULETA.GAME_PUZZLE_SOLVED]: (data: any) => {
                if (data.userId !== userId) {
                    const p = players.find(p => p.id === data.userId);
                    const name = p?.username || `Jugador ${data.userId}`;
                    toast.success(`¡${name} resolvió el panel!`);
                }
                setIsStalemate(false);
                setSession((prev: any) => ({
                    ...prev,
                    guessedLetters: data.guessedLetters || prev?.guessedLetters || [],
                    status: "won",
                }));
            },
            [PUSHER_EVENTS_RULETA.GAME_VOWEL_BOUGHT]: (data: any) => {
                if (data.userId !== userId) {
                    const p = players.find((p: { id: number }) => p.id === data.userId);
                    const name = p?.username || `Jugador ${data.userId}`;
                    toast.info(`${name} compró la vocal "${data.letter}"`);
                }
                setSession((prev: any) => ({
                    ...prev,
                    guessedLetters: data.guessedLetters || prev?.guessedLetters || [],
                    currentScore: data.currentScore,
                }));
            },
            [PUSHER_EVENTS_RULETA.GAME_TURN_CHANGED]: (data: any) => {
                if (isAnimatingRef.current) {
                    pendingTurnRef.current = data;
                    return;
                }
                setSession((prev: any) => {
                    const idx = (prev?.turnOrder || []).indexOf(data.currentTurnUserId);
                    return { ...prev, currentTurnIdx: idx >= 0 ? idx : 0, currentScore: 0 };
                });
                setGameState("idle");
                setShowWheelDialog(false);
                setShowLetterDialog(false);
                if (data.currentTurnUserId === userId) {
                    toast("¡Es tu turno!");
                } else {
                    const p = players.find(p => p.id === data.currentTurnUserId);
                    const name = p?.username || `Jugador ${data.currentTurnUserId}`;
                    toast.info(`Turno de ${name}`);
                }
            },
            [PUSHER_EVENTS_RULETA.ROOM_GAME_ENDED]: (data: any) => {
                setIsStalemate(false);
                if (data.winnerId !== userId) {
                    setRewardAmount(0);
                    setShowReward(true);
                }
                setSession((prev: any) => ({
                    ...prev,
                    status: "won",
                }));
                setTimeout(() => setGameState("won"), 2000);
            },
            [PUSHER_EVENTS_RULETA.GAME_PLAYER_FORFEIT]: (data: any) => {
                setPlayers(prev => prev.filter(p => p.id !== data.userId));
                toast.info("Un jugador abandonó la partida");
            },
            [PUSHER_EVENTS_RULETA.GAME_STALEMATE]: (data: any) => {
                playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_MULTI_SIN_PUNTOS_PARA_VOCALES, volume: 0.6 });
                const phraseText = data.phrase || "";
                const allLetters = [...new Set(
                    phraseText
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                        .split("")
                        .filter(ch => /[A-ZÑ]/.test(ch))
                )];
                setSession((prev: any) => ({
                    ...prev,
                    guessedLetters: allLetters,
                    status: "won",
                    scores: data.finalScores || prev?.scores || {},
                }));
                setPhrase((prev: any) => prev ? { ...prev, phrase: phraseText } : { phrase: phraseText, category: "" });
                setRewardAmount(0);
                setShowReward(false);
                setGameState("won");
                setIsStalemate(true);
                setShowLetterDialog(false);
                setShowWheelDialog(false);
                setShowSolveInput(false);
                setShowVowelDialog(false);
                toast.info("¡Empate! No hay más movidas posibles");
            },
        },
    });

    const toggleFullscreen = async () => {
        if (!gameContainerRef.current) return;
        try {
            if (!document.fullscreenElement) await gameContainerRef.current.requestFullscreen();
            else await document.exitFullscreen();
        } catch (error) {
            console.error("Error toggling fullscreen:", error);
        }
    };

    const loadGameState = async () => {
        try {
            setGameState("loading");
            const result = await actions.games.ruletaLoca.getGameState();
            if (result.data?.hasActiveGame) {
                setSession(result.data.session);
                setPhrase(result.data.phrase);
                setGameState("idle");
            } else {
                setGameState("idle");
            }
        } catch (error) {
            console.error("Error loading game state:", error);
            setGameState("idle");
        }
    };

    // ─── Multiplayer actions ───
    const handleCreateRoom = async () => {
        setError(null);
        setIsStalemate(false);
        try {
            const res = await actions.games.ruletaLoca.createRoom();
            if (res.data) {
                setRoomCode(res.data.roomCode);
                setSession(res.data.session);
                setPlayers([{ id: userId!, username: "Tú", avatar: null }]);
                setShowLobby(true);
                toast.success("Sala creada. Compartí el código con tus amigos.");
            }
        } catch (e: any) {
            setError(e.message || "Error al crear sala");
            toast.error(e.message || "Error al crear sala");
        }
    };

    const handleJoinRoom = async () => {
        const code = joinCodeInput.trim().toUpperCase();
        if (!code) return;
        setError(null);
        setIsStalemate(false);
        try {
            const res = await actions.games.ruletaLoca.joinRoom({ roomCode: code });
            if (res.data) {
                setRoomCode(code);
                setSession(res.data.session);
                setPlayers(res.data.players || []);
                setShowLobby(true);
                setShowJoinModal(false);
                setJoinCodeInput("");
                setError(null);
                toast.success("¡Te uniste a la sala!");
            }
        } catch (e: any) {
            setError(e.message || "Error al unirse a la sala");
            toast.error(e.message || "Error al unirse a la sala");
        }
    };

    const handleLeaveRoom = async () => {
        try {
            await actions.games.ruletaLoca.leaveRoom();
            setRoomCode(null);
            setSession(null);
            setPhrase(null);
            setPlayers([]);
            setShowLobby(false);
            setGameState("idle");
        } catch (e: any) {
            toast.error(e.message || "Error al salir");
        }
    };

    const handleStartMultiplayerGame = async () => {
        setIsStalemate(false);
        try {
            setGameState("loading");
            const res = await actions.games.ruletaLoca.startMultiplayerGame();
            if (res.data) {
                setSession(res.data.session);
                setPhrase(res.data.phrase);
                setGameState("idle");
                setShowLobby(false);
            }
        } catch (e: any) {
            toast.error(e.message || "Error al iniciar");
            setGameState("idle");
        }
    };

    const startNewGame = async () => {
        setIsStalemate(false);
        try {
            setGameState("loading");
            const result = await actions.games.ruletaLoca.startGame();
            if (result.data) {
                setSession(result.data.session);
                setPhrase(result.data.phrase);
                setGameState("idle");
                toast.success("¡Nuevo juego iniciado!");
            }
        } catch (error: any) {
            console.error("Error starting game:", error);
            toast.error(error.message || "Error al iniciar el juego");
            setGameState("idle");
        }
    };

    const handleSpinWheel = async () => {
        if (isSpinning || gameState === "guessing") return;
        if (isMultiplayer && !isMyTurn) {
            toast.error("No es tu turno");
            return;
        }

        try {
            setIsSpinning(true);
            setGameState("spinning");
            isAnimatingRef.current = true;
            playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GIRAR, volume: 0.5, reverbAmount: 0.3 });

            const result = isMultiplayer
                ? await actions.games.ruletaLoca.spinWheelMulti()
                : await actions.games.ruletaLoca.spinWheel();

            if (result.data) {
                const segment = result.data.segment;
                setCurrentSegment(segment);
                setCurrentWheelValue(segment.value);

                const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === segment.label);
                const segmentAngle = (segmentIndex * 45) + 22.5;
                const targetVisualAngle = (360 - segmentAngle + 360) % 360;
                const currentRotation = wheelRotation.get();
                const currentFullRotations = Math.floor(currentRotation / 360);
                let targetRotation = (currentFullRotations * 360) + targetVisualAngle;

                if (targetRotation <= currentRotation) targetRotation += 360;

                const randomSpins = 5 + Math.floor(Math.random() * 4);
                const finalRotation = targetRotation + (randomSpins * 360);

                lastTickCountRef.current = Math.floor(wheelRotation.get() / 45);

                await new Promise<void>(resolve => {
                    animate(wheelRotation, finalRotation, {
                        duration: 4,
                        ease: [0.25, 0.1, 0.25, 1],
                        onComplete: () => resolve()
                    });
                });

                setIsSpinning(false);

                if (result.data.stalemate) {
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_MULTI_SIN_PUNTOS_PARA_VOCALES, volume: 0.6 });
                    const phraseText = phrase?.phrase || "";
                    const allLetters = [...new Set(
                        phraseText
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                            .split("")
                            .filter(ch => /[A-ZÑ]/.test(ch))
                    )];
                    setShowWheelDialog(false);
                    setSession((prev: any) => ({
                        ...prev,
                        guessedLetters: allLetters,
                        status: "won",
                        scores: result.data.session?.scores || prev?.scores || {},
                    }));
                    setRewardAmount(0);
                    setShowReward(false);
                    setGameState("won");
                    setIsStalemate(true);
                    toast.info("¡Empate! No hay más movidas posibles");
                } else if (segment.type === "bankrupt") {
                    toast.error("¡Bancarrota!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                    await sleep(2000);
                    setShowWheelDialog(false);
                    if (result.data.session) setSession(result.data.session);
                    processPendingTurn();
                    setGameState("idle");
                } else if (segment.type === "lose_turn") {
                    toast.warning("¡Pierdes el turno!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.EQUIPO_ELIMINADO, volume: 0.5, reverbAmount: 0.3 });
                    await sleep(2000);
                    setShowWheelDialog(false);
                    if (result.data.session) setSession(result.data.session);
                    processPendingTurn();
                    setGameState("idle");
                } else {
                    processPendingTurn();
                    toast.success(`¡Giraste ${segment.label} puntos!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ELIJE_CONSONANTE, volume: 0.7, reverbAmount: 0.1 });
                    setGameState("guessing");
                    setShowWheelDialog(false);
                    setShowLetterDialog(true);
                }
            } else {
                isAnimatingRef.current = false;
            }
        } catch (error: any) {
            console.error("Error spinning wheel:", error);
            toast.error("Error al girar la ruleta");
            setIsSpinning(false);
            setGameState("idle");
            processPendingTurn();
        }
    };

    const handleSolvePuzzle = async () => {
        if (!session || !solveGuess.trim()) return;
        if (isMultiplayer && !isMyTurn) {
            toast.error("No es tu turno");
            return;
        }

        try {
            const action = isMultiplayer
                ? actions.games.ruletaLoca.solvePuzzleMulti({
                    guess: solveGuess,
                })
                : actions.games.ruletaLoca.solvePuzzle({
                    sessionId: session.id,
                    guess: solveGuess,
                });
            const result = await action;

            if (result.data) {
                if (result.data.success) {
                    setSession(result.data.session);
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    setIsStalemate(false);
                    setShowSolveInput(false);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GANAR, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => setGameState("won"), 3000);
                } else if (result.data.stalemate) {
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_MULTI_SIN_PUNTOS_PARA_VOCALES, volume: 0.6 });
                    const phraseText = phrase?.phrase || "";
                    const allLetters = [...new Set(
                        phraseText
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                            .split("")
                            .filter(ch => /[A-ZÑ]/.test(ch))
                    )];
                    setShowSolveInput(false);
                    setSolveGuess("");
                    setSession((prev: any) => ({
                        ...prev,
                        guessedLetters: allLetters,
                        status: "won",
                        scores: result.data.session?.scores || prev?.scores || {},
                    }));
                    setRewardAmount(0);
                    setShowReward(false);
                    setGameState("won");
                    setIsStalemate(true);
                    toast.info("¡Empate! No hay más movidas posibles");
                } else {
                    isAnimatingRef.current = true;
                    toast.error("¡Incorrecto!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA, volume: 0.6, reverbAmount: 0.2 });
                    await sleep(1500);
                    playSound({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_FRASE_VOCERA, volume: 0.5 });
                    if (result.data.session) setSession(result.data.session);
                    processPendingTurn();
                    setShowSolveInput(false);
                    setSolveGuess("");
                }
            }
        } catch (error: any) {
            console.error("Error solving puzzle:", error);
            toast.error("Error al resolver el panel");
        }
    };

    const handleBuyVowel = async (letter: string) => {
        if (!session || gameState !== "idle") return;
        if (isMultiplayer && !isMyTurn) {
            toast.error("No es tu turno");
            return;
        }
        if (playerTotalScore < VOWEL_COST) {
            toast.error(`Necesitas ${VOWEL_COST} puntos para comprar una vocal`);
            return;
        }

        try {
            const action = isMultiplayer
                ? actions.games.ruletaLoca.buyVowelMulti({ letter })
                : actions.games.ruletaLoca.buyVowel({ sessionId: session.id, letter });

            const result = await action;

            if (result.data) {
                if (result.data.puzzleSolved) {
                    setSession(result.data.session);
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    setIsStalemate(false);
                    setShowVowelDialog(false);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GANAR, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => setGameState("won"), 3000);
                } else {
                    setSession(result.data.session);
                    setShowVowelDialog(false);
                    toast.success(`Compraste la vocal "${letter}"!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.6, reverbAmount: 0.1 });
                    setGameState("idle");
                }
            }
        } catch (error: any) {
            console.error("Error buying vowel:", error);
            toast.error(error.message || "Error al comprar vocal");
        }
    };

    const handleGuessLetter = async (letter: string) => {
        if (gameState !== "guessing" || !session || !currentSegment) return;
        if (isMultiplayer && !isMyTurn) {
            toast.error("No es tu turno");
            return;
        }
        setSelectedLetter(letter);

        try {
            const action = isMultiplayer
                ? actions.games.ruletaLoca.guessLetterMulti({
                    letter,
                    wheelValue: currentWheelValue,
                })
                : actions.games.ruletaLoca.guessLetter({
                    sessionId: session.id,
                    letter,
                    wheelValue: currentWheelValue,
                });

            const result = await action;

            setShowLetterDialog(false);

            if (result.data) {
                if (result.data.puzzleSolved) {
                    setSession(result.data.session);
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    setIsStalemate(false);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GANAR, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => setGameState("won"), 3000);
                } else if (result.data.found) {
                    setSession(result.data.session);
                    toast.success(`¡Letra "${letter}" encontrada!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.6, reverbAmount: 0.1 });
                    setGameState("idle");
                } else if (result.data.stalemate) {
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_MULTI_SIN_PUNTOS_PARA_VOCALES, volume: 0.6 });
                    const phraseText = phrase?.phrase || "";
                    const allLetters = [...new Set(
                        phraseText
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                            .split("")
                            .filter(ch => /[A-ZÑ]/.test(ch))
                    )];
                    setSession((prev: any) => ({
                        ...prev,
                        guessedLetters: allLetters,
                        status: "won",
                        scores: result.data.session?.scores || prev?.scores || {},
                    }));
                    setRewardAmount(0);
                    setShowReward(false);
                    setGameState("won");
                    setIsStalemate(true);
                    toast.info("¡Empate! No hay más movidas posibles");
                } else {
                    isAnimatingRef.current = true;
                    toast.error(`La letra "${letter}" no está.`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA, volume: 0.5, reverbAmount: 0.2 });
                    await sleep(1200);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA_VOCERA, volume: 0.5, reverbAmount: 0.1 });
                    if (result.data.session) setSession(result.data.session);
                    processPendingTurn();
                    setGameState("idle");
                }
            }
        } catch (error: any) {
            console.error("Error guessing letter:", error);
            toast.error("Error al adivinar la letra");
            setGameState("idle");
        }
        setSelectedLetter(null);
    };

    const handleForfeit = async () => {
        if (!session) return;
        if (isMultiplayer) {
            if (!confirm("¿Estás seguro de que quieres salir de la partida?")) return;
            try {
                await actions.games.ruletaLoca.forfeitMulti();
                setSession(null);
                setPhrase(null);
                setRoomCode(null);
                setPlayers([]);
                setShowLobby(false);
                setGameState("idle");
            } catch (e: any) {
                toast.error(e.message || "Error al salir");
            }
            return;
        }
        if (!confirm("¿Estás seguro de que quieres rendirte?")) return;
        try {
            await actions.games.ruletaLoca.forfeitGame({ sessionId: session.id });
            setGameState("lost");
        } catch (error: any) {
            console.error("Error forfeiting:", error);
        }
    };

    // ─── RENDER: Phrase Panel ───

    const renderPhrasePanel = () => {
        if (!phrase || !session) return null;
        const words = phrase.phrase.split(" ");

        return (
            <div class="flex flex-wrap gap-3 md:gap-5 justify-center items-center mb-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                {words.map((word: string, wordIndex: number) => (
                    <div key={wordIndex} class="flex gap-1.5 md:gap-2">
                        {word.split("").map((char: string, charIndex: number) => {
                            const normalizedChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                            const isLetter = /[A-ZÑ]/.test(normalizedChar);
                            const isGuessed = session.guessedLetters?.some((letter: string) =>
                                letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === normalizedChar
                            );

                            return (
                                <div
                                    key={charIndex}
                                    class={`
                                        w-10 h-12 md:w-14 md:h-16 flex items-center justify-center
                                        text-xl md:text-3xl font-bold font-rubik
                                        rounded-lg border transition-all duration-300
                                        ${isLetter
                                            ? isGuessed
                                                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-sm"
                                                : "bg-white/[0.03] border-white/[0.08] text-transparent"
                                            : "bg-transparent border-transparent"
                                        }
                                    `}
                                >
                                    {isLetter ? (isGuessed ? char : "") : (
                                        <span class="text-white/20 text-sm">{char}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    // ─── RENDER: SVG Wheel ───

    const SEGMENT_COLORS = [
        "#ef4444", "#3b82f6", "#22c55e", "#eab308",
        "#a855f7", "#ec4899", "#64748b", "#f97316",
    ];

    const renderWheel = () => {
        const cx = 200, cy = 200, r = 180;
        const segAngle = 360 / WHEEL_SEGMENTS.length;

        const segments = WHEEL_SEGMENTS.map((seg, i) => {
            const startAngle = i * segAngle;
            const endAngle = startAngle + segAngle;
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            const largeArc = segAngle > 180 ? 1 : 0;

            const midAngle = (startAngle + endAngle) / 2;
            const midRad = (midAngle - 90) * Math.PI / 180;
            const labelR = r * 0.62;
            const lx = cx + labelR * Math.cos(midRad);
            const ly = cy + labelR * Math.sin(midRad);

            return { seg, i, startAngle, endAngle, x1, y1, x2, y2, largeArc, lx, ly, midAngle };
        });

        return (
            <svg width="400" height="400" viewBox="0 0 400 400" class="drop-shadow-xl">
                <defs>
                    <filter id="wheelShadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.4" />
                    </filter>
                </defs>

                <g filter="url(#wheelShadow)">
                    {segments.map((s) => (
                        <path
                            key={s.i}
                            d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2} Z`}
                            fill={SEGMENT_COLORS[s.i]}
                            stroke="rgba(255,255,255,0.1)"
                            stroke-width="1"
                        />
                    ))}

                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />

                    {segments.map((s) => (
                        <g key={`label-${s.i}`}>
                            <text
                                x={s.lx}
                                y={s.ly}
                                text-anchor="middle"
                                dominant-baseline="central"
                                fill="white"
                                font-size={s.seg.label.length > 4 ? "14" : "18"}
                                font-weight="700"
                                font-family="Teko, sans-serif"
                                transform={`rotate(${s.midAngle + 90}, ${s.lx}, ${s.ly})`}
                                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                            >
                                {s.seg.label}
                            </text>
                        </g>
                    ))}
                </g>

                {/* Center hub */}
                <circle cx={cx} cy={cy} r="28" fill="#1a1a1a" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
                <circle cx={cx} cy={cy} r="12" fill="#eab308" />
                <circle cx={cx} cy={cy} r="6" fill="#1a1a1a" />
            </svg>
        );
    };

    const renderPointer = () => (
        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
            <svg width="32" height="36" viewBox="0 0 32 36" class="drop-shadow-lg">
                <polygon points="16,36 0,0 32,0" fill="#ef4444" />
                <polygon points="16,30 4,3 28,3" fill="#dc2626" />
            </svg>
        </div>
    );

    // ─── RENDER ───

    if (gameState === "loading" && !session) {
        return (
            <div class="flex items-center justify-center min-h-[60vh]">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-10 h-10 rounded-full border-2 border-yellow-500/30 border-t-yellow-400 animate-spin" />
                    <p class="font-teko text-xl text-white/40 tracking-wide uppercase">Preparando juego...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={gameContainerRef}
                class="w-full min-h-[calc(100dvh-80px)] flex flex-col"
            >
                <div class="max-w-4xl mx-auto w-full flex flex-col flex-1 px-4 pb-8">

                    {/* Header */}
                    <div class="flex items-center justify-between mb-6 pt-4">
                        <div class="flex items-center gap-3">
                            <div class="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                                <LucideGamepad2 size={24} />
                            </div>
                            <div>
                                <h1 class="font-teko text-3xl md:text-4xl font-bold text-white uppercase tracking-wide leading-none">
                                    Ruleta <span class="text-yellow-400">Loca</span>
                                </h1>
                                <p class="text-xs font-rubik text-white/40">Adiviná la frase, acumulá puntos</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            class="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                        >
                            {isFullscreen ? <LucideMinimize2 size={18} /> : <LucideMaximize2 size={18} />}
                        </button>
                    </div>

                    {/* Main content */}
                    {showLobby ? (
                        /* ─── Multiplayer Lobby ─── */
                        <div class="flex flex-col items-center justify-center flex-1">
                            <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-10 text-center max-w-lg w-full backdrop-blur-sm">
                                <div class="p-4 bg-yellow-500/10 rounded-full w-fit mx-auto mb-4">
                                    <LucideUsers size={28} class="text-yellow-400" />
                                </div>
                                <div class="flex items-center justify-center gap-2 mb-1">
                                    <h2 class="font-teko text-3xl text-white uppercase tracking-wide">Sala</h2>
                                </div>
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <code class="font-teko text-2xl tracking-widest bg-white/[0.04] px-4 py-1.5 rounded-lg border border-white/[0.08] text-yellow-400 select-all">
                                        {roomCode}
                                    </code>
                                    <button
                                        onClick={() => { if (roomCode) navigator.clipboard.writeText(roomCode); toast.success("¡Código copiado!") }}
                                        class="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/50 hover:text-white transition-all"
                                        title="Copiar código"
                                    >
                                        <LucideCopy size={16} />
                                    </button>
                                </div>

                                <p class="font-rubik text-sm text-white/40 mb-4">
                                    Compartí este código con tus amigos para que se unan.
                                </p>

                                {/* Player list */}
                                <div class="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 mb-6">
                                    <p class="font-teko text-lg text-white/60 uppercase tracking-wide mb-3 text-left">Jugadores ({players.length})</p>
                                    <div class="space-y-2">
                                        {players.map(p => (
                                            <div key={p.id} class="flex items-center gap-3 bg-white/[0.02] rounded-lg px-3 py-2">
                                                <div class="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400 font-teko text-sm">
                                                    {p.avatar ? <img src={p.avatar} class="w-8 h-8 rounded-full" alt="" /> : (p.username?.charAt(0).toUpperCase() || "?")}
                                                </div>
                                                <span class="font-rubik text-white/70 text-sm flex-1 text-left">{p.username}</span>
                                                {p.id === session?.ownerId && (
                                                    <span class="flex items-center gap-1 text-xs font-rubik text-yellow-400/60">
                                                        <LucideStar size={12} /> Anfitrión
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div class="flex gap-3">
                                    <button
                                        onClick={handleLeaveRoom}
                                        class="flex-1 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-teko text-base font-bold uppercase tracking-wide border border-red-500/20 hover:border-red-500/40 transition-all inline-flex items-center justify-center gap-2"
                                    >
                                        <LucideLogOut size={16} />
                                        Salir
                                    </button>
                                    {session?.ownerId === userId && (
                                        <button
                                            onClick={handleStartMultiplayerGame}
                                            disabled={players.length < 2}
                                            class="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-white/[0.03] disabled:text-white/20 text-black font-teko text-base font-bold uppercase tracking-wide transition-all inline-flex items-center justify-center gap-2"
                                        >
                                            <LucidePlay size={16} />
                                            Iniciar
                                        </button>
                                    )}
                                </div>
                                {players.length < 2 && session?.ownerId === userId && (
                                    <p class="text-xs font-rubik text-white/30 mt-3">Esperando al menos 2 jugadores...</p>
                                )}
                            </div>
                        </div>
                    ) : !session || !phrase ? (
                        <div class="flex flex-col items-center justify-center flex-1">
                            <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center max-w-lg w-full backdrop-blur-sm">
                                <div class="p-4 bg-yellow-500/10 rounded-full w-fit mx-auto mb-6">
                                    <LucideSparkles size={32} class="text-yellow-400" />
                                </div>
                                <p class="font-rubik text-white/60 mb-8 leading-relaxed">
                                    Presioná el botón para comenzar una nueva partida y desafiar tu suerte.
                                </p>
                                <div class="flex flex-col gap-3">
                                    <button
                                        onClick={startNewGame}
                                        class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-xl font-bold uppercase tracking-wide transition-all shadow-lg shadow-yellow-500/15"
                                    >
                                        <LucideGamepad2 size={22} />
                                        Un jugador
                                    </button>
                                    <div class="flex gap-3">
                                        <button
                                            onClick={handleCreateRoom}
                                            class="flex-1 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-teko text-base font-bold uppercase tracking-wide border border-blue-500/20 hover:border-blue-500/40 transition-all"
                                        >
                                            Crear sala
                                        </button>
                                        <button
                                            onClick={() => setShowJoinModal(true)}
                                            class="flex-1 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-teko text-base font-bold uppercase tracking-wide border border-blue-500/20 hover:border-blue-500/40 transition-all"
                                        >
                                            Unirse
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : gameState === "won" ? (
                        <div class="flex flex-col items-center justify-center flex-1 animate-in zoom-in-95 duration-300">
                            <div class={`rounded-2xl border ${isStalemate ? 'border-yellow-500/30 bg-linear-to-b from-yellow-900/20 to-black' : 'border-green-500/30 bg-linear-to-b from-green-900/20 to-black'} p-10 text-center max-w-lg w-full shadow-lg`}>
                                <div class={`p-4 ${isStalemate ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-green-500 text-black'} rounded-full w-fit mx-auto mb-4 shadow-lg`}>
                                    {isStalemate ? <LucideX size={36} /> : <LucideTrophy size={36} />}
                                </div>
                                <h2 class="font-teko text-4xl text-yellow-400 uppercase tracking-wide mb-2">{isStalemate ? "Empate" : "¡Victoria!"}</h2>

                                {isMultiplayer && players.length > 0 ? (
                                    <div class="w-full mb-4">
                                        <p class="font-teko text-lg text-white/50 uppercase tracking-wide mb-3 text-center">Puntajes finales</p>
                                        <div class="space-y-2">
                                            {[...players].sort((a, b) => {
                                                const s = session?.scores || {};
                                                return ((s[b.id] || 0) - (s[a.id] || 0));
                                            }).map((p, idx) => {
                                                const s = session?.scores || {};
                                                const pScore = s[p.id] || 0;
                                                return (
                                                    <div key={p.id} class={`flex items-center justify-between px-4 py-2 rounded-lg ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/[0.02]'}`}>
                                                        <span class="font-rubik text-white/70">
                                                            {idx === 0 && <LucideTrophy size={14} class="inline mr-1 text-yellow-400" />}
                                                            {p.username}{p.id === userId ? " (tú)" : ""}
                                                        </span>
                                                        <span class="font-teko text-lg font-bold text-white">{pScore}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <p class="font-teko text-2xl text-white/80 mb-2">{session.currentScore} puntos</p>
                                )}

                                <div class="bg-white/[0.03] rounded-xl p-4 mb-6 border border-white/[0.06]">
                                    <p class="font-rubik text-white/70 text-lg">"{phrase.phrase}"</p>
                                </div>
                                {isMultiplayer ? (
                                    <button
                                        onClick={() => { setSession(null); setPhrase(null); setRoomCode(null); setPlayers([]); setGameState("idle"); setIsStalemate(false); }}
                                        class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-lg font-bold uppercase tracking-wide transition-all shadow-lg"
                                    >
                                        <LucideRotateCcw size={18} />
                                        Volver al menú
                                    </button>
                                ) : (
                                    <button
                                        onClick={startNewGame}
                                        class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-lg font-bold uppercase tracking-wide transition-all shadow-lg"
                                    >
                                        <LucideRotateCcw size={18} />
                                        Jugar otra vez
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : gameState === "lost" ? (
                        <div class="flex flex-col items-center justify-center flex-1">
                            <div class="rounded-2xl border border-red-500/30 bg-linear-to-b from-red-900/20 to-black p-10 text-center max-w-lg w-full shadow-lg">
                                <h2 class="font-teko text-4xl text-white/80 uppercase tracking-wide mb-4">Game Over</h2>
                                <div class="bg-white/[0.03] rounded-xl p-4 mb-6 border border-white/[0.06]">
                                    <p class="font-rubik text-white/60">La frase era:</p>
                                    <p class="font-rubik text-white/90 text-lg mt-1">"{phrase.phrase}"</p>
                                </div>
                                <button
                                    onClick={startNewGame}
                                    class="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-lg font-bold uppercase tracking-wide transition-all shadow-lg"
                                >
                                    <LucideRotateCcw size={18} />
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div class="flex flex-col items-center flex-1">
                            {/* Multiplayer scoreboard */}
                            {isMultiplayer && players.length > 0 && (
                                <div class="w-full mb-4 flex flex-wrap gap-2 justify-center">
                                    {players.map(p => {
                                        const isTurn = currentTurnUserId === p.id;
                                        const scoresVal = typeof session?.scores === 'object' ? session?.scores : {};
                                        const pScore = scoresVal[p.id] || 0;
                                        const isCurrentPlayer = p.id === userId;
                                        return (
                                            <div key={p.id} class={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-rubik transition-all ${isTurn ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-white/[0.02] border-white/[0.06] text-white/50'}`}>
                                                <span>{p.username}{isCurrentPlayer ? " (tú)" : ""}</span>
                                                <span class="font-bold">{pScore}</span>
                                                {isTurn && <span class="text-xs text-yellow-400/60">●</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Turn indicator for multiplayer */}
                            {isMultiplayer && currentTurnUserId && (
                                <div class="w-full text-center mb-2">
                                    <p class="font-teko text-lg text-white/50 uppercase tracking-wide">
                                        {isMyTurn
                                            ? "¡Es tu turno!"
                                            : `Turno de ${players.find(p => p.id === currentTurnUserId)?.username || "otro jugador"}`
                                        }
                                    </p>
                                </div>
                            )}

                            {/* HUD */}
                            <div class="w-full mb-6">
                                <GameHUD
                                    score={session.currentScore}
                                    showCoins={false}
                                    additionalInfo={{
                                        label: "Categoría",
                                        value: phrase.category,
                                    }}
                                />
                            </div>

                            {/* Phrase panel */}
                            {renderPhrasePanel()}

                            {/* Controls */}
                            <div class="flex flex-col items-center gap-5 w-full max-w-md mx-auto mt-auto">
                                <button
                                    onClick={() => setShowWheelDialog(true)}
                                    disabled={isSpinning || gameState === "guessing" || (isMultiplayer && !isMyTurn)}
                                    class={`
                                        w-full py-4 rounded-xl font-teko text-xl font-bold uppercase tracking-wide transition-all
                                        ${isSpinning || gameState === "guessing" || (isMultiplayer && !isMyTurn)
                                            ? "bg-white/[0.03] text-white/20 cursor-not-allowed"
                                            : "bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black shadow-lg shadow-yellow-500/15"
                                        }
                                    `}
                                >
                                    {isSpinning ? "Girando..." : gameState === "guessing" ? "¡Elegí letra!" : "Abrir ruleta"}
                                </button>

                                <div class="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowVowelDialog(true)}
                                        disabled={gameState !== "idle" || (isMultiplayer && !isMyTurn) || playerTotalScore < VOWEL_COST}
                                        class="flex-1 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 disabled:bg-white/[0.02] disabled:text-white/20 text-purple-400 font-teko text-base font-bold uppercase tracking-wide border border-purple-500/20 hover:border-purple-500/40 disabled:border-white/[0.04] transition-all"
                                    >
                                        Vocal ({VOWEL_COST}pts)
                                    </button>
                                    <button
                                        onClick={() => setShowSolveInput(true)}
                                        disabled={isSpinning || gameState !== "idle" || (isMultiplayer && !isMyTurn)}
                                        class="flex-1 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 disabled:bg-white/[0.02] disabled:text-white/20 text-green-400 font-teko text-base font-bold uppercase tracking-wide border border-green-500/20 hover:border-green-500/40 disabled:border-white/[0.04] transition-all"
                                    >
                                        Resolver
                                    </button>
                                    <button
                                        onClick={handleForfeit}
                                        class="flex-1 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-teko text-base font-bold uppercase tracking-wide border border-red-500/20 hover:border-red-500/40 transition-all"
                                    >
                                        {isMultiplayer ? "Salir" : "Rendirse"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── MODALS ─── */}

                {/* Join Room Modal */}
                {showJoinModal && (
                    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-6 w-full max-w-sm shadow-xl">
                            <div class="flex items-center justify-between mb-5">
                                <h2 class="font-teko text-2xl text-white uppercase tracking-wide">Unirse a sala</h2>
                                <button onClick={() => { setShowJoinModal(false); setJoinCodeInput(""); setError(null); }} class="text-white/30 hover:text-white/60">
                                    <LucideX size={20} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={joinCodeInput}
                                onInput={e => setJoinCodeInput((e.target as HTMLInputElement).value.toUpperCase())}
                                placeholder="RL-XXXX"
                                class="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl text-yellow-400 font-teko text-xl text-center p-4 mb-5 uppercase tracking-wide outline-hidden focus:border-yellow-500/50 transition-all placeholder:text-white/15"
                                autoFocus
                            />
                            {error && <p class="text-red-400 font-rubik text-sm mb-3 text-center">{error}</p>}
                            <button
                                onClick={handleJoinRoom}
                                disabled={joinCodeInput.trim().length < 4}
                                class="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-white/[0.03] disabled:text-white/20 text-black font-teko text-base font-bold uppercase tracking-wide transition-all inline-flex items-center justify-center gap-2"
                            >
                                <LucideDoorOpen size={16} />
                                Unirse
                            </button>
                        </div>
                    </div>
                )}

                {/* Wheel Modal */}
                {showWheelDialog && (
                    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div class="flex flex-col items-center gap-6">
                            {remoteSpinnerId ? (
                                <h2 class="font-teko text-3xl text-white/60 uppercase tracking-wide">
                                    {players.find(p => p.id === remoteSpinnerId)?.username || `Jugador ${remoteSpinnerId}`} está girando...
                                </h2>
                            ) : (
                                <h2 class="font-teko text-3xl text-yellow-400 uppercase tracking-wide">¡Girá la ruleta!</h2>
                            )}

                            <div class="relative">
                                <motion.div
                                    style={{ rotate: wheelRotation }}
                                    class="will-change-transform"
                                >
                                    {renderWheel()}
                                </motion.div>
                                {renderPointer()}
                            </div>

                            {currentSegment && !isSpinning && (
                                <p class="font-teko text-2xl text-white/80">{currentSegment.label} puntos</p>
                            )}

                            {!remoteSpinnerId && (
                                <button
                                    onClick={handleSpinWheel}
                                    disabled={isSpinning}
                                    class={`
                                        px-10 py-4 rounded-xl font-teko text-xl font-bold uppercase tracking-wide transition-all
                                        ${isSpinning
                                            ? "bg-white/[0.03] text-white/20 cursor-not-allowed"
                                            : "bg-red-500 hover:bg-red-400 active:scale-[0.98] text-white shadow-lg shadow-red-500/20"
                                        }
                                    `}
                                >
                                    {isSpinning ? "Girando..." : "¡Girar!"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Letter Selection Modal */}
                {showLetterDialog && (
                    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-6 md:p-8 max-w-xl w-full shadow-xl">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="font-teko text-2xl text-yellow-400 uppercase tracking-wide">Elegí una consonante</h2>
                                <span class="text-sm font-rubik text-white/30">{currentWheelValue} pts en juego</span>
                            </div>

                            <div class="grid grid-cols-7 gap-2 md:gap-3 justify-items-center">
                                {CONSONANTS.map((letter) => {
                                    const guessed = session?.guessedLetters || [];
                                    const normalizedLetter = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                                    const isGuessed = guessed.some((l: string) =>
                                        l.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === normalizedLetter
                                    );
                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleGuessLetter(letter)}
                                            disabled={isGuessed}
                                            class={`
                                                w-10 h-10 md:w-14 md:h-14 flex items-center justify-center
                                                text-lg md:text-2xl font-bold font-rubik
                                                rounded-xl border transition-all duration-150
                                                ${isGuessed
                                                    ? "bg-white/[0.02] border-white/[0.04] text-white/15 cursor-not-allowed"
                                                    : "bg-white/[0.04] border-white/[0.08] text-white hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-400 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                                                }
                                            `}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                            {isMultiplayer && allConsonantsGuessed && (
                                <div class="mt-5 flex flex-col items-center gap-2">
                                    <p class="text-sm font-rubik text-white/40">No quedan consonantes por adivinar en la frase</p>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await actions.games.ruletaLoca.passTurnMulti();
                                                if (res.data?.stalemate) {
                                                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_MULTI_SIN_PUNTOS_PARA_VOCALES, volume: 0.6 });
                                                    const phraseText = phrase?.phrase || "";
                                                    const allLetters = [...new Set(
                                                        phraseText
                                                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                                                            .split("")
                                                            .filter(ch => /[A-ZÑ]/.test(ch))
                                                    )];
                                                    setSession((prev: any) => ({
                                                        ...prev,
                                                        guessedLetters: allLetters,
                                                        status: "won",
                                                        scores: res.data.session?.scores || prev?.scores || {},
                                                    }));
                                                    setRewardAmount(0);
                                                    setShowReward(false);
                                                    setGameState("won");
                                                    setIsStalemate(true);
                                                    setShowLetterDialog(false);
                                                    toast.info("¡Empate! No hay más movidas posibles");
                                                } else {
                                                    setShowLetterDialog(false);
                                                }
                                            } catch (e: any) {
                                                toast.error(e.message || "Error al pasar turno");
                                            }
                                        }}
                                        class="px-6 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 font-teko text-base uppercase tracking-wide transition-all"
                                    >
                                        Pasar turno
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Vowel Dialog */}
                {showVowelDialog && (
                    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-6 md:p-8 max-w-sm w-full shadow-xl">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="font-teko text-2xl text-purple-400 uppercase tracking-wide">Comprar vocal</h2>
                                <span class="text-sm font-rubik text-white/30">-{VOWEL_COST} pts</span>
                            </div>
                            <p class="font-rubik text-sm text-white/40 mb-5 text-center">Tenés {playerTotalScore} pts disponibles</p>
                            <div class="grid grid-cols-5 gap-3 justify-items-center">
                                {["A", "E", "I", "O", "U"].map((letter) => {
                                    const guessed = session?.guessedLetters || [];
                                    const normalizedLetter = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                                    const isGuessed = guessed.some((l: string) =>
                                        l.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === normalizedLetter
                                    );
                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleBuyVowel(letter)}
                                            disabled={isGuessed}
                                            class={`
                                                w-14 h-14 flex items-center justify-center
                                                text-2xl font-bold font-rubik
                                                rounded-xl border transition-all duration-150
                                                ${isGuessed
                                                    ? "bg-white/[0.02] border-white/[0.04] text-white/15 cursor-not-allowed"
                                                    : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                                                }
                                            `}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setShowVowelDialog(false)}
                                class="w-full mt-5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-white/50 font-teko text-sm uppercase tracking-wide transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Solve Modal */}
                {showSolveInput && (
                    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-6 w-full max-w-md shadow-xl">
                            <h2 class="font-teko text-2xl text-white uppercase tracking-wide mb-2">Resolver panel</h2>
                            <p class="font-rubik text-sm text-white/40 mb-5">Escribí la frase exacta. Si fallás, perdés el turno.</p>
                            <input
                                type="text"
                                value={solveGuess}
                                onInput={(e) => setSolveGuess((e.target as HTMLInputElement).value)}
                                class="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl text-yellow-400 font-teko text-xl text-center p-4 mb-5 uppercase tracking-wide outline-hidden focus:border-yellow-500/50 transition-all placeholder:text-white/15"
                                placeholder="FRASE..."
                                autoFocus
                            />
                            <div class="flex justify-center gap-3">
                                <button
                                    onClick={() => { setShowSolveInput(false); setSolveGuess(""); }}
                                    class="flex-1 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-white/60 font-teko text-base font-bold uppercase tracking-wide border border-white/[0.06] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSolvePuzzle}
                                    disabled={!solveGuess.trim()}
                                    class="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-white/[0.03] disabled:text-white/20 text-black font-teko text-base font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed"
                                >
                                    Resolver
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reward Modal */}
                <GameReward
                    coins={rewardAmount}
                    visible={showReward}
                    onComplete={() => setShowReward(false)}
                />
            </div>
        </>
    );
};
