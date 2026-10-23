import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getSession } from 'auth-astro/server';
import { client as db } from '@/db/client';
import { TournamentsTable, UsersTable } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { generateSchedule, recordResult } from '@/lib/tournament-engine';
import { readCompetition } from '@/lib/tournament-legacy';

export const workspace = defineAction({
  input: z.object({
    tournamentId: z.number().int().positive(), revision: z.number().int().nonnegative(),
    command: z.discriminatedUnion('type', [
      z.object({ type: z.literal('add'), names: z.array(z.string().trim().min(1).max(80)).min(1).max(128) }),
      z.object({ type: z.literal('remove'), id: z.string() }),
      z.object({ type: z.literal('rename'), id: z.string(), name: z.string().trim().min(1).max(80) }),
      z.object({ type: z.literal('reorder'), ids: z.array(z.string()).max(128) }),
      z.object({ type: z.literal('start') }),
      z.object({ type: z.literal('registration'), open: z.boolean() }),
      z.object({ type: z.literal('join') }), z.object({ type: z.literal('leave') }),
      z.object({ type: z.literal('result'), id: z.string(), a: z.number().int().min(0).max(9999), b: z.number().int().min(0).max(9999) }),
      z.object({ type: z.literal('pair'), a: z.string(), b: z.string(), round: z.number().int().min(1).max(100) }),
      z.object({ type: z.literal('deletePair'), id: z.string() }),
      z.object({ type: z.literal('finish') }),
      z.object({ type: z.literal('delete') }),
      z.object({ type: z.literal('settings'), name: z.string().trim().min(3).max(100), description: z.string().max(5000),
        format: z.enum(['single_elimination', 'round_robin', 'pairs']), privacy: z.enum(['public', 'private']),
        registration: z.enum(['manual', 'open']), seeding: z.enum(['ordered', 'random']),
        bannerUrl: z.union([z.literal(''), z.string().url().max(2000)]),
        maxParticipants: z.number().int().min(2).max(128), win: z.number().int().min(0).max(100), draw: z.number().int().min(0).max(100), loss: z.number().int().min(0).max(100) }),
    ]),
  }),
  handler: async ({ tournamentId, revision, command }, context) => {
    const session = await getSession(context.request);
    if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Iniciá sesión para continuar.' });
    const [user, tournament] = await Promise.all([
      db.query.UsersTable.findFirst({ where: eq(UsersTable.id, Number(session.user.id)) }),
      db.query.TournamentsTable.findFirst({ where: eq(TournamentsTable.id, tournamentId), with: { participants: { with: { user: { columns: { displayName: true, username: true } } } }, matches: true } }),
    ]);
    if (!tournament || !user) throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado.' });
    const manager = user.admin === true;
    if (!manager && command.type !== 'join' && command.type !== 'leave') throw new ActionError({ code: 'FORBIDDEN', message: 'Solo el organizador puede gestionar este torneo.' });
    const { competition: state, format, legacy } = readCompetition(tournament);
    if (state.revision !== revision) throw new ActionError({ code: 'CONFLICT', message: 'El torneo cambió. Recargá antes de guardar.' });
    const revisionCheck = legacy ? sql`${TournamentsTable.config}->'competition' IS NULL` : sql`${TournamentsTable.config}->'competition'->>'revision' = ${String(revision)}`;
    if (command.type === 'delete') {
      const deleted = await db.delete(TournamentsTable).where(and(eq(TournamentsTable.id, tournamentId), revisionCheck)).returning({ id: TournamentsTable.id });
      if (!deleted.length) throw new ActionError({ code: 'CONFLICT', message: 'El torneo cambió. Recargá antes de eliminarlo.' });
      return { success: true };
    }
    const preparing = ['draft', 'registration'].includes(tournament.status);
    const patch: Partial<typeof TournamentsTable.$inferInsert> = legacy ? { format } : {};
    try {
      if (['add', 'remove', 'rename', 'reorder', 'settings', 'registration', 'join', 'leave', 'start'].includes(command.type) && !preparing) throw new Error('La preparación está cerrada porque el torneo ya comenzó.');
      switch (command.type) {
        case 'add': {
          const names = new Set(state.entrants.map(p => p.name.toLocaleLowerCase()));
          for (const name of command.names) {
            if (names.has(name.toLocaleLowerCase())) throw new Error(`El participante «${name}» ya existe.`);
            names.add(name.toLocaleLowerCase());
            state.entrants.push({ id: crypto.randomUUID(), name, seed: state.entrants.length + 1 });
          }
          break;
        }
        case 'remove': state.entrants = state.entrants.filter(p => p.id !== command.id); break;
        case 'rename': {
          const entrant = state.entrants.find(p => p.id === command.id);
          if (!entrant) throw new Error('Participante no encontrado.');
          if (state.entrants.some(p => p.id !== entrant.id && p.name.toLocaleLowerCase() === command.name.toLocaleLowerCase())) throw new Error('Ese nombre ya está en uso.');
          entrant.name = command.name; break;
        }
        case 'reorder': {
          if (new Set(command.ids).size !== state.entrants.length || command.ids.length !== state.entrants.length || command.ids.some(id => !state.entrants.some(p => p.id === id))) throw new Error('El orden no incluye a todos los participantes.');
          state.entrants = command.ids.map((id, index) => ({ ...state.entrants.find(p => p.id === id)!, seed: index + 1 })); break;
        }
        case 'join':
          if (tournament.privacy !== 'public' || tournament.status !== 'registration' || state.registration !== 'open') throw new Error('Este torneo no acepta inscripciones.');
          if (state.entrants.some(p => p.userId === user.id)) throw new Error('Ya estás inscripto.');
          if (state.entrants.some(p => p.name.toLocaleLowerCase() === user.displayName.toLocaleLowerCase())) throw new Error('Tu nombre ya está en la lista. Contactá al organizador.');
          state.entrants.push({ id: crypto.randomUUID(), name: user.displayName, userId: user.id, seed: state.entrants.length + 1 }); break;
        case 'leave': state.entrants = state.entrants.filter(p => p.userId !== user.id); break;
        case 'registration':
          if (command.open && (state.registration !== 'open' || tournament.privacy !== 'public')) throw new Error('Elegí inscripción abierta y visibilidad pública en Configuración.');
          patch.status = command.open ? 'registration' : 'draft'; break;
        case 'settings':
          if (state.entrants.length > command.maxParticipants) throw new Error('El cupo no puede ser menor a la lista actual.');
          if (command.bannerUrl && !/^https?:\/\//i.test(command.bannerUrl)) throw new Error('La imagen debe tener una dirección HTTP o HTTPS.');
          Object.assign(patch, { name: command.name, description: command.description, format: command.format, privacy: command.privacy, maxParticipants: command.maxParticipants, bannerUrl: command.bannerUrl || null });
          state.registration = command.registration; state.seeding = command.seeding;
          state.points = { win: command.win, draw: command.draw, loss: command.loss };
          if (command.registration === 'manual' || command.privacy === 'private') patch.status = 'draft';
          break;
        case 'start': {
          if (state.matches.length) throw new Error('El calendario ya existe.');
          if (!['single_elimination', 'round_robin', 'pairs'].includes(format)) throw new Error('Formato no compatible.');
          if (format === 'round_robin' && state.entrants.length > 64) throw new Error('Todos contra todos admite hasta 64 participantes.');
          if (state.seeding === 'random') {
            for (let i = state.entrants.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [state.entrants[i], state.entrants[j]] = [state.entrants[j], state.entrants[i]]; }
            state.entrants.forEach((p, i) => p.seed = i + 1);
          }
          state.matches = generateSchedule(format, state.entrants);
          patch.status = 'in_progress'; patch.startDate = new Date(); break;
        }
        case 'pair':
          if (format !== 'pairs' || tournament.status !== 'in_progress') throw new Error('Solo podés agregar cruces en un torneo manual en juego.');
          if (command.a === command.b || ![command.a, command.b].every(id => state.entrants.some(p => p.id === id))) throw new Error('Elegí dos participantes diferentes.');
          if (state.matches.some(m => m.round === command.round && [m.a, m.b].some(id => id === command.a || id === command.b))) throw new Error('Un participante ya tiene un partido en esa jornada.');
          state.matches.push({ id: crypto.randomUUID(), round: command.round, order: state.matches.length, a: command.a, b: command.b, scoreA: null, scoreB: null, winner: null, completed: false }); break;
        case 'deletePair':
          if (format !== 'pairs' || tournament.status !== 'in_progress') throw new Error('No se puede quitar este partido.');
          if (state.matches.find(m => m.id === command.id)?.completed) throw new Error('No se puede quitar un partido con resultado.');
          state.matches = state.matches.filter(m => m.id !== command.id); break;
        case 'result':
          if (!['in_progress', 'completed'].includes(tournament.status)) throw new Error('El torneo todavía no comenzó.');
          recordResult(state, format, command.id, command.a, command.b);
          patch.status = format !== 'pairs' && state.matches.every(m => m.completed) ? 'completed' : 'in_progress';
          patch.endDate = patch.status === 'completed' ? new Date() : null;
          break;
        case 'finish':
          if (format !== 'pairs' || tournament.status !== 'in_progress' || !state.matches.length || !state.matches.every(m => m.completed)) throw new Error('Completá todos los partidos antes de finalizar.');
          patch.status = 'completed'; patch.endDate = new Date(); break;
      }
      if (state.entrants.length > (patch.maxParticipants ?? tournament.maxParticipants ?? 128)) throw new Error('No hay cupos para todos esos participantes.');
      state.entrants.forEach((p, i) => p.seed = i + 1);
    } catch (error) {
      throw new ActionError({ code: 'BAD_REQUEST', message: (error as Error).message });
    }
    state.revision++;
    // Optimistic compare-and-swap is a single atomic statement, also supported by Neon HTTP.
    const saved = await db.update(TournamentsTable).set({ ...patch, config: sql`jsonb_set(coalesce(${TournamentsTable.config}, '{}'::jsonb), '{competition}', ${JSON.stringify(state)}::jsonb)`, updatedAt: new Date() })
      .where(and(eq(TournamentsTable.id, tournamentId), revisionCheck)).returning({ id: TournamentsTable.id });
    if (!saved.length) throw new ActionError({ code: 'CONFLICT', message: 'Otra persona guardó cambios. Recargá para continuar.' });
    return { success: true };
  },
});
