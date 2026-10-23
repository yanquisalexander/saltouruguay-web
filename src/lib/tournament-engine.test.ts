import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCompetition, generateSchedule, recordResult, standings } from './tournament-engine';
import { readCompetition } from './tournament-legacy';

const entrants = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Jugador ${i + 1}`, seed: i + 1 }));

test('every elimination size from 2 to 128 reaches a final with exactly n-1 played matches', () => {
  for (let n = 2; n <= 128; n++) {
    const state = { ...emptyCompetition(), entrants: entrants(n), matches: generateSchedule('single_elimination', entrants(n)) };
    for (const m of state.matches) {
      if (m.completed) continue;
      assert.ok(m.a && m.b, `Unresolved match: ${n} entrants, ${m.id}`);
      recordResult(state, 'single_elimination', m.id, 2, 0);
    }
    assert.equal(state.matches.filter(m => !m.bye).length, n - 1);
    assert.ok(state.matches.at(-1)?.winner);
  }
});

test('round robin has all unique pairings and no double bookings, including odd rosters', () => {
  for (let n = 2; n <= 64; n++) {
    const matches = generateSchedule('round_robin', entrants(n));
    assert.equal(matches.length, n * (n - 1) / 2);
    assert.equal(new Set(matches.map(m => [m.a, m.b].sort().join(':'))).size, matches.length);
    for (const round of new Set(matches.map(m => m.round))) {
      const players = matches.filter(m => m.round === round).flatMap(m => [m.a, m.b]);
      assert.equal(new Set(players).size, players.length);
    }
  }
});

test('changing a winner invalidates only downstream results; changing a score preserves them', () => {
  const state = { ...emptyCompetition(), entrants: entrants(8), matches: generateSchedule('single_elimination', entrants(8)) };
  for (const m of state.matches) recordResult(state, 'single_elimination', m.id, 2, 0);
  recordResult(state, 'single_elimination', state.matches[0].id, 3, 0);
  assert.equal(state.matches.at(-1)?.completed, true);
  recordResult(state, 'single_elimination', state.matches[0].id, 0, 2);
  assert.equal(state.matches.at(-1)?.completed, false);
  assert.equal(state.matches.at(-1)?.a, null);
  assert.equal(state.matches.find(m => m.id === state.matches[0].next)?.a, state.matches[0].b);
  assert.equal(state.matches.find(m => m.round === 2 && m.order === 1)?.completed, true);
});

test('draws, custom scoring, corrections and score validation', () => {
  const state = { ...emptyCompetition(), entrants: entrants(2), matches: generateSchedule('round_robin', entrants(2)) };
  state.points = { win: 5, draw: 2, loss: 0 };
  recordResult(state, 'round_robin', state.matches[0].id, 1, 1);
  assert.ok(standings(state).every(p => p.drawn === 1 && p.points === 2));
  recordResult(state, 'round_robin', state.matches[0].id, 3, 0);
  assert.equal(standings(state)[0].points, 5);
  assert.equal(standings(state)[0].played, 1);
  for (const score of [-1, 0.5, NaN, 10000]) assert.throws(() => recordResult(state, 'round_robin', state.matches[0].id, score, 0));
  assert.throws(() => recordResult(state, 'single_elimination', state.matches[0].id, 1, 1));
});

test('legacy adaptation preserves identity and results while recognizing the actual old bracket', () => {
  const old = { format: 'round_robin', status: 'completed', config: {}, participants: [1, 2].map(id => ({ id, userId: id, seed: id, status: 'confirmed', user: { displayName: `Jugador ${id}`, username: `u${id}` } })), matches: [{ id: 10, round: 1, matchOrder: 0, player1Id: 1, player2Id: 2, score1: 2, score2: 1, winnerId: 1, nextMatchId: null, status: 'completed' }] };
  const adapted = readCompetition(old);
  assert.equal(adapted.format, 'single_elimination');
  assert.equal(adapted.competition.matches[0].winner, 'user-1');
  assert.equal(adapted.competition.matches[0].scoreA, 2);
  assert.equal(adapted.competition.entrants[0].userId, 1);
  assert.deepEqual(old.config, {});
});
