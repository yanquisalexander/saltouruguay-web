import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import {
  closeCongaHand,
  createCongaRoom,
  discardCongaCard,
  drawCongaCard,
  getCongaRoomState,
  joinCongaRoom,
  leaveCongaRoom,
  startCongaGame,
} from "@/utils/games/conga";

async function run<T>(request: Request, operation: (userId: number) => Promise<T>, unauthenticatedMessage: string) {
  const session = await getSession(request);
  if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Iniciá sesión para jugar a la Conga" });
  try {
    return await operation(Number(session.user.id));
  } catch (error) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : unauthenticatedMessage,
    });
  }
}

export const conga = {
  createRoom: defineAction({ handler: (_, { request }) => run(request, createCongaRoom, "No se pudo crear la sala") }),
  joinRoom: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8) }),
    handler: ({ roomCode }, { request }) => run(request, userId => joinCongaRoom(userId, roomCode), "No se pudo entrar a la sala"),
  }),
  leaveRoom: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8) }),
    handler: ({ roomCode }, { request }) => run(request, async userId => { await leaveCongaRoom(userId, roomCode); return { success: true }; }, "No se pudo salir de la sala"),
  }),
  getRoomState: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8) }),
    handler: ({ roomCode }, { request }) => run(request, userId => getCongaRoomState(userId, roomCode), "No se pudo cargar la sala"),
  }),
  startGame: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8) }),
    handler: ({ roomCode }, { request }) => run(request, userId => startCongaGame(userId, roomCode), "No se pudo empezar la partida"),
  }),
  drawCard: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8), from: z.enum(["deck", "discard"]) }),
    handler: ({ roomCode, from }, { request }) => run(request, userId => drawCongaCard(userId, roomCode, from), "No se pudo robar la carta"),
  }),
  discardCard: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8), cardId: z.string() }),
    handler: ({ roomCode, cardId }, { request }) => run(request, userId => discardCongaCard(userId, roomCode, cardId), "No se pudo descartar"),
  }),
  closeHand: defineAction({
    input: z.object({ roomCode: z.string().min(4).max(8), cardId: z.string() }),
    handler: ({ roomCode, cardId }, { request }) => run(request, userId => closeCongaHand(userId, roomCode, cardId), "No se pudo cerrar la mano"),
  }),
};
