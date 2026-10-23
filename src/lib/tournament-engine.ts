/** Versioned tournament aggregate. Entrant IDs belong to the tournament, never to Users. */
export type CompetitionFormat = 'single_elimination' | 'round_robin' | 'pairs';
export interface Entrant { id: string; name: string; userId?: number; seed: number }
export interface Fixture {
  id: string; round: number; order: number; a: string | null; b: string | null;
  scoreA: number | null; scoreB: number | null; winner: string | null;
  completed: boolean; bye?: boolean; next?: string; slot?: 'a' | 'b';
}
export interface Competition {
  version: 1; revision: number; entrants: Entrant[]; matches: Fixture[];
  registration: 'manual' | 'open'; seeding: 'ordered' | 'random';
  points: { win: number; draw: number; loss: number };
}
export const formats: Record<CompetitionFormat, string> = {
  single_elimination: 'Eliminación directa', round_robin: 'Todos contra todos', pairs: 'Cruces manuales',
};
export const statuses: Record<string, string> = { draft: 'En preparación', registration: 'Inscripciones abiertas', in_progress: 'En juego', completed: 'Finalizado' };
export function emptyCompetition(registration: Competition['registration'] = 'manual'): Competition {
  return { version: 1, revision: 0, entrants: [], matches: [], registration, seeding: 'ordered', points: { win: 3, draw: 1, loss: 0 } };
}
export function competitionFrom(config: unknown): Competition | null {
  const value = (config as { competition?: Competition } | null)?.competition;
  return value?.version === 1 ? structuredClone(value) : null;
}
const fixture = (round: number, order: number, a: string | null = null, b: string | null = null): Fixture => ({
  id: `r${round}m${order}`, round, order, a, b, scoreA: null, scoreB: null, winner: null, completed: false,
});
export function generateSchedule(format: CompetitionFormat, entrants: Entrant[]): Fixture[] {
  if (entrants.length < 2) throw new Error('Agregá al menos dos participantes.');
  const ids = [...entrants].sort((a, b) => a.seed - b.seed).map(p => p.id);
  if (format === 'pairs') return [];
  if (format === 'round_robin') {
    const rotation: (string | null)[] = [...ids];
    if (rotation.length % 2) rotation.push(null);
    const matches: Fixture[] = [];
    for (let r = 1; r < rotation.length; r++) {
      for (let i = 0; i < rotation.length / 2; i++) {
        const a = rotation[i], b = rotation[rotation.length - 1 - i];
        if (a && b) matches.push(fixture(r, i, r % 2 ? a : b, r % 2 ? b : a));
      }
      rotation.splice(1, 0, rotation.pop()!);
    }
    return matches;
  }
  const size = 2 ** Math.ceil(Math.log2(ids.length));
  let seeds = [1, 2];
  while (seeds.length < size) seeds = seeds.flatMap(s => [s, seeds.length * 2 + 1 - s]);
  const rounds = Math.log2(size), matches: Fixture[] = [];
  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < size / 2 ** r; i++) {
      const m = fixture(r, i, r === 1 ? ids[seeds[i * 2] - 1] ?? null : null, r === 1 ? ids[seeds[i * 2 + 1] - 1] ?? null : null);
      if (r < rounds) { m.next = `r${r + 1}m${Math.floor(i / 2)}`; m.slot = i % 2 ? 'b' : 'a'; }
      matches.push(m);
    }
  }
  for (const m of matches.filter(m => m.round === 1 && (!m.a || !m.b))) {
    m.completed = true; m.bye = true; m.winner = m.a ?? m.b;
    const next = matches.find(n => n.id === m.next);
    if (next && m.slot) next[m.slot] = m.winner;
  }
  return matches;
}
export function recordResult(state: Competition, format: CompetitionFormat, id: string, a: number, b: number) {
  const match = state.matches.find(m => m.id === id);
  if (!match?.a || !match.b || match.bye) throw new Error('Este partido todavía no tiene dos participantes.');
  if (![a, b].every(s => Number.isSafeInteger(s) && s >= 0 && s <= 9999)) throw new Error('Ingresá marcadores enteros entre 0 y 9999.');
  if (format === 'single_elimination' && a === b) throw new Error('Un cruce de eliminación necesita un ganador.');
  const winner = a === b ? null : a > b ? match.a : match.b;
  // Changing an upstream winner invalidates all dependent results and slots.
  if (match.completed && match.winner !== winner) {
    let source = match;
    while (source.next) {
      const target = state.matches.find(m => m.id === source.next);
      if (!target || !source.slot) break;
      target[source.slot] = null; target.scoreA = null; target.scoreB = null;
      target.completed = false; target.winner = null; source = target;
    }
  }
  Object.assign(match, { scoreA: a, scoreB: b, winner, completed: true });
  const next = state.matches.find(m => m.id === match.next);
  if (next && match.slot) next[match.slot] = winner;
}
export function standings(state: Competition) {
  const rows = state.entrants.map(p => ({ ...p, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, difference: 0, points: 0 }));
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const m of state.matches) {
    if (!m.completed || m.bye || m.scoreA === null || m.scoreB === null) continue;
    const a = byId.get(m.a!), b = byId.get(m.b!);
    if (!a || !b) continue;
    for (const [row, own, other] of [[a, m.scoreA, m.scoreB], [b, m.scoreB, m.scoreA]] as const) {
      row.played++; row.for += own; row.against += other; row.difference = row.for - row.against;
      if (own > other) { row.won++; row.points += state.points.win; }
      else if (own === other) { row.drawn++; row.points += state.points.draw; }
      else { row.lost++; row.points += state.points.loss; }
    }
  }
  return rows.sort((a, b) => b.points - a.points || b.difference - a.difference || b.for - a.for || a.seed - b.seed);
}
