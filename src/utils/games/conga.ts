import { and, eq, inArray, sql } from "drizzle-orm";
import { client } from "@/db/client";
import { CongaGameRoomsTable, UsersTable } from "@/db/schema";

export type CongaCard = { id: string; suit: number; rank: number };
type PlayerState = { id: number; hand: CongaCard[]; score: number };
type CongaState = {
  revision: number;
  players: PlayerState[];
  drawPile: CongaCard[];
  discardPile: CongaCard[];
  turnIndex: number;
  turnsPlayed: number;
  hasDrawn: boolean;
  lastAction?: { type: string; userId: number; card?: CongaCard; at: number };
};

const MAX_PLAYERS = 4;
const MAX_SCORE = 100;
const suitNames = ["oros", "copas", "espadas", "bastos"];
const cleanCode = (code: string) => code.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);

function makeDeck(): CongaCard[] {
  return suitNames.flatMap((_, suit) => Array.from({ length: 12 }, (_, i) => ({
    id: `${suit}-${i + 1}`,
    suit,
    rank: i + 1,
  })));
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cardPoints(card: CongaCard) {
  return card.rank >= 10 ? 10 : card.rank;
}

function isMeld(cards: CongaCard[]): boolean {
  if (cards.length < 3) return false;
  const set = cards.every(card => card.rank === cards[0].rank) && new Set(cards.map(card => card.suit)).size === cards.length;
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  const run = sorted.every(card => card.suit === sorted[0].suit)
    && sorted.every((card, index) => index === 0 || card.rank === sorted[index - 1].rank + 1);
  return set || run;
}

function getMeldedCardIdsFlat(hand: CongaCard[]): string[] {
  if (hand.length < 3) return [];
  let best: string[] = [];
  const n = hand.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const group = hand.filter((_, index) => mask & (1 << index));
    if (!isMeld(group)) continue;
    const groupIds = new Set(group.map(card => card.id));
    const rest = hand.filter(card => !groupIds.has(card.id));
    const covered = group.map(card => card.id).concat(getMeldedCardIdsFlat(rest));
    if (covered.length > best.length) best = covered;
  }
  return best;
}

function deadwood(hand: CongaCard[]) {
  const melded = getMeldedCardIdsFlat(hand);
  return hand.filter(card => !melded.includes(card.id)).reduce((sum, card) => sum + cardPoints(card), 0);
}

function isConga(hand: CongaCard[]) {
  return hand.length === 7 && new Set(hand.map(card => card.suit)).size === 1
    && [...hand].sort((a, b) => a.rank - b.rank).every((card, index, cards) => index === 0 || card.rank === cards[index - 1].rank + 1);
}

function parseState(value: unknown): CongaState {
  return value as CongaState;
}

async function getRoom(roomCode: string) {
  const [room] = await client.select().from(CongaGameRoomsTable).where(eq(CongaGameRoomsTable.roomCode, cleanCode(roomCode))).limit(1);
  return room;
}

function assertMember(room: NonNullable<Awaited<ReturnType<typeof getRoom>>>, userId: number) {
  if (!room.playerIds.includes(userId)) throw new Error("No pertenecés a esta sala");
}

async function emitRoom(roomCode: string, event: "conga:room-updated" | "conga:game-updated") {
  const { pusher } = await import("@/utils/pusher");
  const { PUSHER_CHANNELS_CONGA } = await import("@/consts/pusher");
  await pusher.trigger(PUSHER_CHANNELS_CONGA.ROOM(roomCode), event, { revision: Date.now() });
}

async function notifyRoom(roomCode: string, event: "conga:room-updated" | "conga:game-updated") {
  try {
    await emitRoom(roomCode, event);
  } catch (error) {
    console.error("Conga Pusher notification failed", error);
  }
}

export async function createCongaRoom(userId: number) {
  const [active] = await client.select({ id: CongaGameRoomsTable.id, roomCode: CongaGameRoomsTable.roomCode })
    .from(CongaGameRoomsTable)
    .where(sql`${userId} = ANY(${CongaGameRoomsTable.playerIds}::int[]) AND ${CongaGameRoomsTable.status} IN ('waiting', 'playing')`)
    .limit(1);
  if (active) return active;

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const [room] = await client.insert(CongaGameRoomsTable).values({
      roomCode,
      ownerId: userId,
      playerIds: [userId],
      state: { revision: 0, players: [], drawPile: [], discardPile: [], turnIndex: 0, turnsPlayed: 0, hasDrawn: false } as CongaState,
    }).returning({ id: CongaGameRoomsTable.id, roomCode: CongaGameRoomsTable.roomCode });
    if (room) return room;
  }
  throw new Error("No se pudo crear la sala. Probá de nuevo.");
}

export async function joinCongaRoom(userId: number, roomCode: string) {
  const clean = cleanCode(roomCode);
  const room = await getRoom(clean);
  if (!room || room.status !== "waiting") throw new Error("La sala no existe o ya empezó");
  if (room.playerIds.includes(userId)) return room;
  if (room.playerIds.length >= MAX_PLAYERS) throw new Error("La sala ya está completa");
  const [active] = await client.select({ id: CongaGameRoomsTable.id }).from(CongaGameRoomsTable)
    .where(sql`${userId} = ANY(${CongaGameRoomsTable.playerIds}::int[]) AND ${CongaGameRoomsTable.status} IN ('waiting', 'playing')`).limit(1);
  if (active) throw new Error("Ya estás en otra partida activa");
  const [joined] = await client.update(CongaGameRoomsTable)
    .set({ playerIds: sql`array_append(${CongaGameRoomsTable.playerIds}, ${userId})`, updatedAt: new Date() })
    .where(and(
      eq(CongaGameRoomsTable.id, room.id),
      eq(CongaGameRoomsTable.status, "waiting"),
      sql`cardinality(${CongaGameRoomsTable.playerIds}) < ${MAX_PLAYERS}`,
      sql`NOT (${userId} = ANY(${CongaGameRoomsTable.playerIds}::int[]))`,
    ))
    .returning({ id: CongaGameRoomsTable.id });
  if (!joined) throw new Error("La sala se llenó o cambió. Actualizá y probá de nuevo.");
  await notifyRoom(clean, "conga:room-updated");
  return getRoom(clean);
}

export async function leaveCongaRoom(userId: number, roomCode: string) {
  const room = await getRoom(roomCode);
  if (!room) return;
  assertMember(room, userId);
  const remaining = room.playerIds.filter(id => id !== userId);
  if (!remaining.length || room.status === "playing") {
    const state = parseState(room.state) as CongaState & { winnerId?: number };
    if (room.status === "playing" && remaining.length === 1) state.winnerId = remaining[0];
    await client.update(CongaGameRoomsTable).set({ status: "finished", playerIds: remaining, state, updatedAt: new Date() }).where(eq(CongaGameRoomsTable.id, room.id));
  } else {
    await client.update(CongaGameRoomsTable).set({
      playerIds: remaining,
      ownerId: room.ownerId === userId ? remaining[0] : room.ownerId,
      updatedAt: new Date(),
    }).where(eq(CongaGameRoomsTable.id, room.id));
  }
  await notifyRoom(cleanCode(roomCode), "conga:room-updated");
}

export async function startCongaGame(userId: number, roomCode: string) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error("No encontramos esa sala");
  assertMember(room, userId);
  if (room.ownerId !== userId) throw new Error("Solo quien creó la sala puede empezar");
  if (room.playerIds.length < 2) throw new Error("Se necesitan al menos 2 jugadores");
  if (room.status !== "waiting") throw new Error("La partida ya empezó");
  const deck = shuffle(makeDeck());
  const players = room.playerIds.map(id => ({ id, hand: deck.splice(0, 7), score: 0 }));
  const state: CongaState = {
    revision: 1, players, drawPile: deck.slice(1), discardPile: [deck[0]],
    turnIndex: 0, turnsPlayed: 0, hasDrawn: false,
  };
  await client.update(CongaGameRoomsTable).set({ status: "playing", state, updatedAt: new Date() }).where(eq(CongaGameRoomsTable.id, room.id));
  await notifyRoom(cleanCode(roomCode), "conga:game-updated");
  return getCongaRoomState(userId, roomCode);
}

export async function getCongaRoomState(userId: number, roomCode: string) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error("No encontramos esa sala");
  assertMember(room, userId);
  const users = await client.select({ id: UsersTable.id, username: UsersTable.username, displayName: UsersTable.displayName, avatar: UsersTable.avatar }).from(UsersTable).where(inArray(UsersTable.id, room.playerIds));
  const state = parseState(room.state);
  const currentPlayer = state.players.find(player => player.id === userId);
  return {
    roomCode: room.roomCode,
    status: room.status,
    ownerId: room.ownerId,
    players: room.playerIds.map(id => ({
      id,
      username: users.find(user => user.id === id)?.username || users.find(user => user.id === id)?.displayName || `Jugador ${id}`,
      avatar: users.find(user => user.id === id)?.avatar || null,
      cardCount: state.players.find(player => player.id === id)?.hand.length || 0,
      score: state.players.find(player => player.id === id)?.score || 0,
      active: state.players.some(player => player.id === id),
    })),
    hand: currentPlayer?.hand || [],
    turnUserId: state.players[state.turnIndex]?.id || null,
    hasDrawn: state.hasDrawn,
    drawCount: state.drawPile.length,
    discardTop: state.discardPile.at(-1) || null,
    lastAction: state.lastAction
      ? {
        type: state.lastAction.type,
        userId: state.lastAction.userId,
        at: state.lastAction.at,
        ...(state.lastAction.type !== "draw-deck" && state.lastAction.card ? { card: state.lastAction.card } : {}),
      }
      : null,
    revision: state.revision,
    winnerId: (state as CongaState & { winnerId?: number }).winnerId || null,
    canCloseCardIds: state.hasDrawn && state.turnsPlayed >= state.players.length && currentPlayer
      ? currentPlayer.hand.filter(card => deadwood(currentPlayer.hand.filter(item => item.id !== card.id)) <= 5).map(card => card.id)
      : [],
  };
}

async function updateGame(userId: number, roomCode: string, mutate: (room: NonNullable<Awaited<ReturnType<typeof getRoom>>>, state: CongaState) => { state: CongaState; status?: "playing" | "finished" }) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error("No encontramos esa sala");
  assertMember(room, userId);
  if (room.status !== "playing") throw new Error("La partida no está en curso");
  const result = mutate(room, parseState(room.state));
  result.state.revision++;
  const [updated] = await client.update(CongaGameRoomsTable)
    .set({ state: result.state, ...(result.status ? { status: result.status } : {}), updatedAt: new Date() })
    .where(and(
      eq(CongaGameRoomsTable.id, room.id),
      eq(CongaGameRoomsTable.updatedAt, room.updatedAt),
      sql`${CongaGameRoomsTable.state}->>'revision' = ${String(parseState(room.state).revision)}`,
    ))
    .returning({ id: CongaGameRoomsTable.id });
  if (!updated) throw new Error("La partida cambió en otro dispositivo. Actualizando estado…");
  await notifyRoom(cleanCode(roomCode), "conga:game-updated");
  return getCongaRoomState(userId, roomCode);
}

function currentPlayerFor(state: CongaState, userId: number) {
  const player = state.players[state.turnIndex];
  if (!player || player.id !== userId) throw new Error("No es tu turno");
  return player;
}

export async function drawCongaCard(userId: number, roomCode: string, from: "deck" | "discard") {
  return updateGame(userId, roomCode, (_room, state) => {
    const player = currentPlayerFor(state, userId);
    if (state.hasDrawn) throw new Error("Ya robaste una carta este turno");
    let card: CongaCard | undefined;
    if (from === "discard") card = state.discardPile.pop();
    else {
      card = state.drawPile.pop();
      if (!card && state.discardPile.length > 1) {
        const top = state.discardPile.pop()!;
        state.drawPile = shuffle(state.discardPile);
        state.discardPile = [top];
        card = state.drawPile.pop();
      }
    }
    if (!card) throw new Error("No quedan cartas para robar");
    player.hand.push(card);
    state.hasDrawn = true;
    state.lastAction = { type: from === "deck" ? "draw-deck" : "draw-discard", userId, card, at: Date.now() };
    return { state };
  });
}

function finishTurn(state: CongaState, userId: number, card: CongaCard) {
  state.discardPile.push(card);
  state.turnsPlayed++;
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  state.hasDrawn = false;
  state.lastAction = { type: "discard", userId, card, at: Date.now() };
}

export async function discardCongaCard(userId: number, roomCode: string, cardId: string) {
  return updateGame(userId, roomCode, (_room, state) => {
    const player = currentPlayerFor(state, userId);
    if (!state.hasDrawn) throw new Error("Primero tenés que robar una carta");
    if (player.hand.length !== 8) throw new Error("Tu mano no está lista para descartar");
    const index = player.hand.findIndex(card => card.id === cardId);
    if (index < 0) throw new Error("Esa carta no está en tu mano");
    const [card] = player.hand.splice(index, 1);
    finishTurn(state, userId, card);
    return { state };
  });
}

export async function closeCongaHand(userId: number, roomCode: string, cardId: string) {
  return updateGame(userId, roomCode, (_room, state) => {
    const player = currentPlayerFor(state, userId);
    if (!state.hasDrawn || player.hand.length !== 8) throw new Error("Robá una carta antes de cortar");
    if (state.turnsPlayed < state.players.length) throw new Error("Hay que esperar una vuelta completa antes de cortar");
    const index = player.hand.findIndex(card => card.id === cardId);
    if (index < 0) throw new Error("Elegí una carta para descartar y cortar");
    const [closingCard] = player.hand.splice(index, 1);
    const cutScore = deadwood(player.hand);
    if (cutScore > 5) throw new Error(`No podés cortar: te quedan ${cutScore} puntos sin combinar`);
    finishTurn(state, userId, closingCard);

    const conga = isConga(player.hand);
    for (const contender of state.players) {
      if (conga) break;
      contender.score += contender.id === userId && deadwood(contender.hand) === 0
        ? -10
        : deadwood(contender.hand);
    }
    if (conga) {
      player.score = 0;
      (state as CongaState & { winnerId?: number }).winnerId = userId;
      return { state, status: "finished" as const };
    }
    const alive = state.players.filter(contender => contender.score < MAX_SCORE);
    if (alive.length <= 1) {
      (state as CongaState & { winnerId?: number }).winnerId = alive[0]?.id ?? [...state.players].sort((a, b) => a.score - b.score)[0]?.id ?? userId;
      return { state, status: "finished" as const };
    }

    const nextPlayerId = state.players[state.turnIndex]?.id;
    const seatedPlayers = state.players;
    state.players = alive;
    const nextPlayerIndex = alive.findIndex(contender => contender.id === nextPlayerId);
    if (nextPlayerIndex >= 0) state.turnIndex = nextPlayerIndex;
    else {
      const previousIndex = seatedPlayers.findIndex(contender => contender.id === nextPlayerId);
      state.turnIndex = alive.findIndex(contender => seatedPlayers.indexOf(contender) >= previousIndex);
      if (state.turnIndex < 0) state.turnIndex = 0;
    }

    // The hand ends on a cut; a new hand starts automatically with the same room and cumulative scores.
    const deck = shuffle(makeDeck());
    for (const contender of state.players) contender.hand = deck.splice(0, 7);
    state.drawPile = deck.slice(1);
    state.discardPile = [deck[0]];
    state.turnsPlayed = 0;
    state.hasDrawn = false;
    state.lastAction = { type: "new-hand", userId, at: Date.now() };
    return { state };
  });
}

export async function getCurrentCongaRoomCode(userId: number) {
  const [room] = await client.select({ roomCode: CongaGameRoomsTable.roomCode }).from(CongaGameRoomsTable)
    .where(sql`${userId} = ANY(${CongaGameRoomsTable.playerIds}::int[]) AND ${CongaGameRoomsTable.status} IN ('waiting', 'playing')`)
    .limit(1);
  return room?.roomCode || null;
}
