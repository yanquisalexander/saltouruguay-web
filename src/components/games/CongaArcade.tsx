import { actions } from "astro:actions";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { toast } from "sonner";
import { LucideArrowLeft, LucideCopy, LucideCrown, LucideDoorOpen, LucideGamepad2, LucideRefreshCw, LucideSparkles, LucideUsers } from "lucide-preact";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_CHANNELS_CONGA, PUSHER_EVENTS_CONGA } from "@/consts/pusher";

type Card = { id: string; suit: number; rank: number };
type RoomState = {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  ownerId: number;
  players: { id: number; username: string; avatar: string | null; cardCount: number; score: number; active?: boolean }[];
  hand: Card[];
  turnUserId: number | null;
  hasDrawn: boolean;
  drawCount: number;
  discardTop: Card | null;
  canCloseCardIds: string[];
  winnerId: number | null;
  lastAction: { type: string; userId: number; card?: Card } | null;
};

const SUITS = ["Oros", "Copas", "Espadas", "Bastos"];
const SUIT_SYMBOLS = ["☀", "🏆", "⚔", "🌵"];
const CARD_SPRITE = "/images/arcade/baraja-conga.png";

function CardSprite({ card, back = false, small = false, selected = false, onClick }: { card?: Card | null; back?: boolean; small?: boolean; selected?: boolean; onClick?: () => void }) {
  const col = back ? 0 : (card?.rank ?? 1) - 1;
  const row = back ? 4 : card?.suit ?? 0;
  return <button
    type="button"
    aria-label={back ? "Mazo de cartas" : card ? `${card.rank} de ${SUITS[card.suit]}` : "Carta"}
    onClick={onClick}
    disabled={!onClick}
    class={`relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg border-2 bg-[#171527] bg-no-repeat shadow-[0_5px_0_#10101b] transition duration-150 ${small ? "w-12 sm:w-14" : "w-[4.2rem] sm:w-[5.25rem]"} ${selected ? "-translate-y-3 border-amber-300 shadow-[0_8px_0_#10101b,0_0_22px_#facc1560]" : "border-[#342d49]"} ${onClick ? "cursor-pointer hover:-translate-y-2 hover:border-cyan-300" : "cursor-default"}`}
    style={{ backgroundImage: `url('${CARD_SPRITE}')`, backgroundSize: "1200% 500%", backgroundPosition: `${(col / 11) * 100}% ${(row / 4) * 100}%`, imageRendering: "pixelated" }}
  />;
}

function PixelButton({ children, onClick, disabled = false, tone = "pink", className = "" }: { children: ComponentChildren; onClick: () => void; disabled?: boolean; tone?: "pink" | "cyan" | "yellow" | "quiet"; className?: string }) {
  const colors = {
    pink: "border-fuchsia-300 bg-fuchsia-500 text-white shadow-[0_4px_0_#a21caf] hover:bg-fuchsia-400",
    cyan: "border-cyan-200 bg-cyan-500 text-slate-950 shadow-[0_4px_0_#0e7490] hover:bg-cyan-300",
    yellow: "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_4px_0_#b45309] hover:bg-yellow-200",
    quiet: "border-white/20 bg-white/5 text-white shadow-[0_4px_0_#151321] hover:bg-white/10",
  };
  return <button type="button" disabled={disabled} onClick={onClick} class={`border-2 px-4 py-3 font-press-start-2p text-[9px] leading-5 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${colors[tone]} ${className}`}>{children}</button>;
}

export function CongaArcade({ userId, initialRoomCode }: { userId: number; initialRoomCode: string | null }) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshRoom = useCallback(async () => {
    if (!roomCode) return;
    const result = await actions.games.conga.getRoomState({ roomCode });
    if (result.data) setRoom(result.data as RoomState);
    else if (result.error) setError(result.error.message || "No se pudo actualizar la sala");
  }, [roomCode]);

  const onRoomUpdated = useCallback(() => { void refreshRoom(); }, [refreshRoom]);
  const events = useMemo(() => ({
    [PUSHER_EVENTS_CONGA.ROOM_UPDATED]: onRoomUpdated,
    [PUSHER_EVENTS_CONGA.GAME_UPDATED]: onRoomUpdated,
  }), [onRoomUpdated]);
  usePusherChannel({ channelName: roomCode ? PUSHER_CHANNELS_CONGA.ROOM(roomCode) : "", enabled: !!roomCode, events });

  useEffect(() => { void refreshRoom(); }, [refreshRoom]);

  const runAction = async (action: () => Promise<{ data?: any; error?: any }>, success?: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result.error) throw new Error(result.error.message || "No se pudo completar la acción");
      if (result.data?.roomCode) setRoomCode(result.data.roomCode);
      if (result.data?.players) setRoom(result.data as RoomState);
      else if (roomCode) await refreshRoom();
      if (success) toast.success(success);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo salió mal";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const currentTurn = room?.turnUserId === userId;
  const selectedCanClose = !!selectedCard && !!room?.canCloseCardIds.includes(selectedCard);

  const createRoom = async () => {
    await runAction(() => actions.games.conga.createRoom(), "¡Sala creada!");
  };
  const joinRoom = async () => {
    const result = await runAction(() => actions.games.conga.joinRoom({ roomCode: joinCode.trim() }), "¡Te sumaste a la sala!");
    if (result?.roomCode) setJoinCode("");
  };
  const copyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast.success("Código copiado");
  };

  if (room?.status === "waiting" || !roomCode) return <main class="min-h-screen overflow-hidden bg-[#100e20] px-4 pb-16 pt-8 text-white sm:pt-12">
    <div class="pointer-events-none fixed inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(#39e7ef 1px, transparent 1px), radial-gradient(#ff42c5 1px, transparent 1px)", backgroundSize: "36px 36px", backgroundPosition: "0 0, 18px 18px" }} />
    <div class="relative mx-auto max-w-5xl">
      <a href="/comunidad/juegos" class="inline-flex items-center gap-2 font-press-start-2p text-[9px] text-cyan-200 hover:text-white"><LucideArrowLeft size={15} /> VOLVER AL ARCADE</a>
      <header class="my-10 text-center sm:my-14">
        <span class="inline-flex items-center gap-2 border-2 border-cyan-300/60 bg-cyan-400/10 px-4 py-2 font-press-start-2p text-[9px] text-cyan-200"><LucideGamepad2 size={16} /> ARCADE SALTANO</span>
        <h1 class="mt-6 font-press-start-2p text-3xl leading-relaxed text-transparent [background:linear-gradient(90deg,#36e0e8,#f34ebc,#ffe45e)] bg-clip-text sm:text-5xl">CONGA!</h1>
        <p class="mt-4 font-teko text-2xl tracking-wide text-white/70">Armá las combinaciones. Cerrá antes que el resto.</p>
      </header>
      <section class="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.1fr_.9fr]">
        <div class="border-2 border-fuchsia-400/70 bg-[#201a36] p-6 shadow-[8px_8px_0_#76165f] sm:p-8">
          <p class="font-press-start-2p text-[10px] text-amber-200">PARTIDA MULTIJUGADOR</p>
          <p class="mt-4 font-rubik text-sm leading-6 text-white/65">De 2 a 4 jugadores · Baraja española de 48 cartas · ¡Conga de siete y ganás!</p>
          {roomCode && room ? <>
            <div class="mt-7 flex items-center justify-between border-2 border-cyan-300/50 bg-[#12101f] p-4">
              <div><p class="font-press-start-2p text-[8px] text-white/50">CÓDIGO DE SALA</p><p class="mt-3 font-press-start-2p text-2xl tracking-[0.2em] text-cyan-200">{room.roomCode}</p></div>
              <button onClick={copyCode} class="border-2 border-white/20 p-3 text-white hover:border-cyan-300" aria-label="Copiar código"><LucideCopy /></button>
            </div>
            <div class="mt-6 space-y-2">
              {room.players.map((player, index) => <div key={player.id} class="flex items-center gap-3 border border-white/10 bg-white/[0.03] p-3">
                {player.avatar ? <img src={player.avatar} alt="" class="size-10 border-2 border-cyan-300 object-cover pixelated" /> : <div class="grid size-10 place-items-center border-2 border-cyan-300 bg-cyan-400/10 font-press-start-2p text-xs text-cyan-200">{index + 1}</div>}
                <span class="font-rubik font-semibold">{player.username}</span>
                {player.id === room.ownerId && <span class="ml-auto font-press-start-2p text-[8px] text-amber-200">ANFITRIÓN</span>}
              </div>)}
              {Array.from({ length: 4 - room.players.length }).map((_, i) => <div key={i} class="flex items-center gap-3 border border-dashed border-white/15 p-3 font-rubik text-sm text-white/30"><LucideUsers size={20} /> Esperando jugador…</div>)}
            </div>
            {room.ownerId === userId && <PixelButton className="mt-6 w-full" tone="yellow" disabled={busy || room.players.length < 2} onClick={() => void runAction(() => actions.games.conga.startGame({ roomCode: room.roomCode }))}>{room.players.length < 2 ? "ESPERANDO JUGADORES" : "¡EMPEZAR PARTIDA!"}</PixelButton>}
            <PixelButton className="mt-4 w-full" tone="quiet" disabled={busy} onClick={() => void runAction(() => actions.games.conga.leaveRoom({ roomCode: room.roomCode })).then(() => { setRoom(null); setRoomCode(null); })}>SALIR DE LA SALA</PixelButton>
          </> : <div class="mt-7 grid gap-3">
            <PixelButton tone="pink" disabled={busy} onClick={() => void createRoom()}>CREAR SALA NUEVA</PixelButton>
            <div class="flex gap-2"><input value={joinCode} onInput={event => setJoinCode((event.currentTarget as HTMLInputElement).value.toUpperCase())} maxLength={6} placeholder="CÓDIGO" class="min-w-0 flex-1 border-2 border-white/20 bg-[#12101f] px-3 font-press-start-2p text-sm tracking-widest text-white placeholder:text-white/25 focus:border-cyan-300 focus:outline-none" /><PixelButton tone="cyan" disabled={busy || joinCode.trim().length < 4} onClick={() => void joinRoom()}>UNIRSE</PixelButton></div>
          </div>}
          {error && <p role="alert" class="mt-4 border border-red-400/40 bg-red-400/10 p-3 font-rubik text-sm text-red-200">{error}</p>}
        </div>
        <aside class="border-2 border-amber-300/60 bg-[#1a1730] p-6 shadow-[8px_8px_0_#815516] sm:p-8">
          <h2 class="font-press-start-2p text-[10px] leading-6 text-amber-200">CÓMO SE JUEGA</h2>
          <ol class="mt-5 space-y-4 font-rubik text-sm leading-6 text-white/70">
            <li><b class="text-cyan-200">01.</b> Robá del mazo o del descarte.</li>
            <li><b class="text-cyan-200">02.</b> Armá piernas o escaleras del mismo palo.</li>
            <li><b class="text-cyan-200">03.</b> Descartá para terminar tu turno.</li>
            <li><b class="text-cyan-200">04.</b> Cortá con hasta 5 puntos sueltos. ¡Con siete en escalera ganás!</li>
          </ol>
          <div class="mt-8 flex items-center gap-3 border-t border-white/10 pt-5 text-fuchsia-200"><LucideSparkles size={20} /><p class="font-teko text-xl">Una partida, cuatro jugadores y mucha suerte.</p></div>
        </aside>
      </section>
    </div>
  </main>;

  if (!room) return <main class="grid min-h-screen place-items-center bg-[#100e20] text-white"><div class="text-center"><LucideRefreshCw class="mx-auto animate-spin text-cyan-300" /><p class="mt-4 font-press-start-2p text-[9px]">CARGANDO PARTIDA…</p>{error && <button class="mt-4 text-sm text-cyan-200 underline" onClick={() => void refreshRoom()}>Reintentar</button>}</div></main>;

  if (room.status === "finished") return <main class="min-h-screen bg-[#100e20] px-4 py-10 text-white"><div class="mx-auto max-w-3xl border-2 border-amber-300 bg-[#201a36] p-6 text-center shadow-[8px_8px_0_#815516] sm:p-10"><LucideCrown class="mx-auto size-12 text-amber-300" /><h1 class="mt-5 font-press-start-2p text-xl leading-relaxed text-amber-200 sm:text-3xl">¡PARTIDA TERMINADA!</h1><p class="mt-3 font-teko text-2xl text-white/70">Ganador: {room.players.find(player => player.id === room.winnerId)?.username || "Conga"}</p><div class="mt-8 space-y-2">{room.players.sort((a, b) => a.score - b.score).map(player => <div class="flex justify-between border border-white/10 p-4 font-rubik"><span>{player.username}</span><b class="text-cyan-200">{player.score} pts</b></div>)}</div><a class="mt-8 inline-flex items-center gap-2 font-press-start-2p text-[9px] text-cyan-200" href="/comunidad/juegos"><LucideArrowLeft size={14} /> VOLVER AL ARCADE</a></div></main>;

  const lastPlayer = room.players.find(player => player.id === room.lastAction?.userId);
  return <main class="min-h-screen overflow-hidden bg-[#100e20] px-3 pb-10 pt-5 text-white sm:px-6 sm:pt-8">
    <div class="pointer-events-none fixed inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#39e7ef 1px, transparent 1px), radial-gradient(#ff42c5 1px, transparent 1px)", backgroundSize: "36px 36px", backgroundPosition: "0 0, 18px 18px" }} />
    <div class="relative mx-auto max-w-6xl">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b-2 border-cyan-300/40 pb-4">
        <div><a href="/comunidad/juegos" class="font-press-start-2p text-[8px] text-white/50 hover:text-cyan-200">← ARCADE</a><h1 class="mt-3 font-press-start-2p text-lg text-fuchsia-300 sm:text-2xl">CONGA!</h1></div>
        <div class="flex items-center gap-3"><span class="font-press-start-2p text-[8px] text-white/50">SALA</span><b class="font-press-start-2p text-base tracking-widest text-cyan-200">{room.roomCode}</b><button onClick={copyCode} aria-label="Copiar código" class="border border-white/20 p-2 text-cyan-200"><LucideCopy size={16} /></button></div>
      </header>

      <section class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {room.players.map((player, index) => <div key={player.id} class={`flex items-center gap-2 border-2 p-2 sm:gap-3 sm:p-3 ${room.turnUserId === player.id ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[0.03]"}`}>
          {player.avatar ? <img src={player.avatar} class="size-8 border border-white/30 object-cover sm:size-10" alt="" /> : <span class="grid size-8 place-items-center border border-white/30 font-press-start-2p text-[9px] sm:size-10">{index + 1}</span>}
          <div class="min-w-0"><p class="truncate font-rubik text-xs font-bold sm:text-sm">{player.username}{player.id === userId ? " (vos)" : ""}</p><p class="font-press-start-2p text-[7px] text-white/45">{player.active === false ? "FUERA" : `${player.score} PTS · ${player.cardCount} CARTAS`}</p></div>
          {room.turnUserId === player.id && <span class="ml-auto hidden font-press-start-2p text-[7px] text-amber-200 sm:block">TURNO</span>}
        </div>)}
      </section>

      <section class="mt-6 border-2 border-emerald-300/40 bg-[#172528]/90 p-4 shadow-[6px_6px_0_#0b3f3c] sm:mt-8 sm:p-7">
        <div class="flex flex-wrap items-center justify-between gap-2"><p class="font-press-start-2p text-[8px] text-emerald-200">MESA DE JUEGO</p><p class="font-rubik text-sm text-white/55">{currentTurn ? (room.hasDrawn ? "Elegí una carta para descartar" : "Tu turno: robá una carta") : `Turno de ${room.players.find(player => player.id === room.turnUserId)?.username || "otro jugador"}`}</p></div>
        <div class="mt-7 flex min-h-36 items-center justify-center gap-8 sm:gap-16">
          <div class="text-center"><p class="mb-3 font-press-start-2p text-[7px] text-white/45">MAZO · {room.drawCount}</p><CardSprite back onClick={currentTurn && !room.hasDrawn ? () => void runAction(() => actions.games.conga.drawCard({ roomCode: room.roomCode, from: "deck" })) : undefined} /><p class="mt-3 font-teko text-lg text-white/40">Robar</p></div>
          <div class="text-center"><p class="mb-3 font-press-start-2p text-[7px] text-white/45">DESCARTE</p>{room.discardTop ? <CardSprite card={room.discardTop} onClick={currentTurn && !room.hasDrawn ? () => void runAction(() => actions.games.conga.drawCard({ roomCode: room.roomCode, from: "discard" })) : undefined} /> : <div class="aspect-[2/3] w-[4.2rem] border-2 border-dashed border-white/15 sm:w-[5.25rem]" />}<p class="mt-3 font-teko text-lg text-white/40">{lastPlayer ? `Por ${lastPlayer.username}` : ""}</p></div>
        </div>
      </section>

      <section class="mt-7 border-2 border-fuchsia-400/45 bg-[#201a36] p-4 shadow-[6px_6px_0_#76165f] sm:mt-9 sm:p-6">
        <div class="flex items-center justify-between"><h2 class="font-press-start-2p text-[8px] text-fuchsia-200">TU MANO</h2><span class="font-rubik text-xs text-white/45">{room.hand.length} cartas</span></div>
        <div class="mt-7 flex min-h-36 flex-wrap items-end justify-center gap-1.5 sm:gap-3">
          {room.hand.map(card => <div key={card.id} class="flex flex-col items-center gap-1"><CardSprite card={card} selected={selectedCard === card.id} onClick={currentTurn && room.hasDrawn ? () => setSelectedCard(card.id) : undefined} /><span class="font-press-start-2p text-[7px] text-white/40">{card.rank} {SUIT_SYMBOLS[card.suit]}</span></div>)}
        </div>
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          <PixelButton tone="pink" disabled={busy || !currentTurn || !room.hasDrawn || !selectedCard} onClick={() => { if (!selectedCard) return; void runAction(() => actions.games.conga.discardCard({ roomCode: room.roomCode, cardId: selectedCard })).then(result => { if (result) setSelectedCard(null); }); }}>DESCARTAR</PixelButton>
          <PixelButton tone="yellow" disabled={busy || !currentTurn || !selectedCanClose} onClick={() => { if (!selectedCard) return; void runAction(() => actions.games.conga.closeHand({ roomCode: room.roomCode, cardId: selectedCard })).then(result => { if (result) setSelectedCard(null); }); }}>CORTAR</PixelButton>
          {selectedCard && <button onClick={() => setSelectedCard(null)} class="px-3 font-rubik text-xs text-white/45 underline">Limpiar selección</button>}
        </div>
        {error && <p role="alert" class="mx-auto mt-4 max-w-lg text-center font-rubik text-sm text-red-200">{error}</p>}
      </section>
      <p class="mt-6 flex items-center justify-center gap-2 font-rubik text-xs text-white/35"><LucideDoorOpen size={14} />Las jugadas se sincronizan en tiempo real</p>
    </div>
  </main>;
}
