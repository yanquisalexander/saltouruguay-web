import { pusher } from "@/utils/pusher";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const voice = {
  signal: defineAction({
    input: z.object({
      teamId: z.string(),
      event: z.enum(["signal:offer", "signal:answer", "signal:iceCandidate", "voice:user-joined"]),
      data: z.object({
        fromUserId: z.union([z.string(), z.number()]).optional(),
        toUserId: z.union([z.string(), z.number()]).optional(),
        userId: z.union([z.string(), z.number()]).optional(),
        sdp: z.any().optional(),
        candidate: z.any().optional()
      })
    }),
    handler: async ({ teamId, event, data }, { request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Debes iniciar sesión para usar voice chat"
        });
      }

      // Forward the signaling message via Pusher
      await pusher.trigger(`team-${teamId}-voice-signal`, event, data);

      return { success: true };
    }
  }),

  enable: defineAction({
    input: z.object({
      teamId: z.string(),
    }),
    handler: async ({ teamId }, { request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Debes iniciar sesión para habilitar el voice chat"
        });
      }

      // Check if user is admin or team captain
      if (!session.user.isAdmin) {
        // TODO: Add team captain check here if needed
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden habilitar el voice chat"
        });
      }

      // Publish voice:enabled event to team voice signal channel
      await pusher.trigger(`team-${teamId}-voice-signal`, "voice:enabled", {
        teamId,
        enabledBy: session.user.id,
        timestamp: Date.now()
      });

      return { success: true };
    }
  }),

  disable: defineAction({
    input: z.object({
      teamId: z.string(),
    }),
    handler: async ({ teamId }, { request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Debes iniciar sesión para deshabilitar el voice chat"
        });
      }

      // Check if user is admin or team captain
      if (!session.user.isAdmin) {
        // TODO: Add team captain check here if needed
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden deshabilitar el voice chat"
        });
      }

      // Publish voice:disabled event to team voice signal channel
      await pusher.trigger(`team-${teamId}-voice-signal`, "voice:disabled", {
        teamId,
        disabledBy: session.user.id,
        timestamp: Date.now()
      });

      return { success: true };
    }
  }),

  forceMute: defineAction({
    input: z.object({
      teamId: z.string(),
      targetUserId: z.string(),
    }),
    handler: async ({ teamId, targetUserId }, { request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Debes iniciar sesión para silenciar usuarios"
        });
      }

      // Only admins can force mute
      if (!session.user.isAdmin) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden silenciar usuarios"
        });
      }

      // Publish voice:force-mute event to team voice signal channel
      await pusher.trigger(`team-${teamId}-voice-signal`, "voice:force-mute", {
        teamId,
        targetUserId,
        issuedBy: session.user.id,
        timestamp: Date.now()
      });

      return { success: true };
    }
  }),

  spectate: defineAction({
    input: z.object({
      teamId: z.string(),
      enable: z.boolean(),
    }),
    handler: async ({ teamId, enable }, { request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Debes iniciar sesión para spectear voice chat"
        });
      }

      // Only admins can spectate
      if (!session.user.isAdmin) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden spectear voice chat"
        });
      }

      // Publish voice:spectate event to team voice signal channel
      await pusher.trigger(`team-${teamId}-voice-signal`, enable ? "voice:spectator-joined" : "voice:spectator-left", {
        teamId,
        spectatorId: session.user.id,
        timestamp: Date.now()
      });

      return { success: true };
    }
  })
};
