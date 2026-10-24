import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { AnimatePresence, motion } from 'motion/react';
import type { Competition, CompetitionFormat, Fixture } from '@/lib/tournament-engine';
import { formats, statuses, standings } from '@/lib/tournament-engine';
import type { TournamentOverlayState } from '@/lib/tournament-overlay';
import '@/assets/styles/tournaments.css';

export interface OverlayTournament {
  id: number; name: string; description: string | null; format: string; status: string;
  privacy: string; maxParticipants: number | null; bannerUrl?: string | null;
}
export interface OverlayProfile { id: number; username: string; displayName: string; avatar: string | null }

interface Props {
  tournament: OverlayTournament;
  format: CompetitionFormat;
  competition: Competition;
  profiles: OverlayProfile[];
  initialState: TournamentOverlayState;
}

const DATA_REFRESH_MS = 60_000;

export default function TournamentOverlay({ tournament: t0, format: format0, competition: initialCompetition, profiles: initialProfiles, initialState }: Props) {
  const [state, setState] = useState<TournamentOverlayState>(initialState);
  const [tournament, setTournament] = useState<OverlayTournament>(t0);
  const [format, setFormat] = useState<CompetitionFormat>(format0);
  const [competition, setCompetition] = useState<Competition>(initialCompetition);
  const [profiles, setProfiles] = useState<OverlayProfile[]>(initialProfiles);
  const t = tournament;

  const lastRefresh = useRef(initialState.refresh);

  // ─── Estado: montaje inmediato + long polling ─────────────────────────────
  useEffect(() => {
    let mounted = true;
    let version = 0;

    const applyState = (next: TournamentOverlayState, nextVersion: number) => {
      if (!mounted || nextVersion <= version) return;
      version = nextVersion;
      setState(next);
    };

    const poll = async () => {
      while (mounted) {
        try {
          const res = await fetch(`/api/torneos/${t.id}/overlay/state?lastVersion=${version}`);
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          if (mounted) applyState(data.state, data.version);
        } catch {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    };

    (async () => {
      try {
        const res = await fetch(`/api/torneos/${t.id}/overlay/state`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            version = data.version || 0;
            setState(data.state);
          }
        }
      } catch { /* el estado SSR sigue vigente */ }
      if (mounted) void poll();
    })();

    return () => { mounted = false; };
  }, [t.id]);

  // ─── Datos: refetch manual (nonce refresh) + auto cada 60s ────────────────
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/torneos/${t.id}/overlay/data?overlay=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.competition) {
        setCompetition(data.competition);
        if (Array.isArray(data.profiles)) setProfiles(data.profiles);
        if (data.tournament) setTournament(data.tournament);
        if (data.format) setFormat(data.format);
      }
    } catch { /* red caída: mantener datos actuales */ }
  }, [t.id]);

  useEffect(() => {
    if (state.refresh > lastRefresh.current) {
      lastRefresh.current = state.refresh;
      void refreshData();
    } else {
      lastRefresh.current = state.refresh;
    }
  }, [state.refresh, refreshData]);

  useEffect(() => {
    const timer = setInterval(() => void refreshData(), DATA_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshData]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const view = state.view === 'auto' ? (format === 'single_elimination' ? 'bracket' : 'standings') : state.view;
  const rounds = [...new Set(competition.matches.map(m => m.round))].sort((a, b) => a - b);
  const done = competition.matches.filter(m => m.completed && !m.bye).length;
  const total = competition.matches.filter(m => !m.bye).length;
  const final = competition.matches.find(m => !m.next && m.completed && t.format === 'single_elimination');

  const name = (id: string | null, bye = false) =>
    competition.entrants.find(p => p.id === id)?.name ?? (bye ? 'Pase libre' : 'Por definir');
  const profile = (id: string | null) => {
    const userId = competition.entrants.find(p => p.id === id)?.userId;
    return userId ? profiles.find(p => p.id === userId) : undefined;
  };
  const avatar = (id: string | null) => {
    const participantName = name(id);
    const participantProfile = profile(id);
    return (
      <span class="tw-avatar tw-avatar-small" aria-hidden="true">
        {participantProfile?.avatar ? <img src={participantProfile.avatar} alt="" loading="lazy" /> : participantName.slice(0, 1).toLocaleUpperCase()}
      </span>
    );
  };

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dur = reducedMotion ? 0 : 1;

  const matchNode = (m: Fixture, ri: number, mi: number) => (
    <motion.article
      key={m.id}
      class={`tw-match ${m.completed ? 'tw-match-done' : ''}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (0.45 + ri * 0.14 + mi * 0.05) * dur, duration: 0.5 * dur, ease: [0.16, 1, 0.3, 1] }}
    >
      <span class="tw-match-label">{m.bye ? 'Pase automático' : m.completed ? 'Resultado final' : m.a && m.b ? 'Listo para jugar' : 'Espera un resultado'}</span>
      {(['a', 'b'] as const).map(side => (
        <div class={`tw-player ${m.winner && m.winner === m[side] ? 'tw-winner' : ''}`}>
          {m[side] ? avatar(m[side]) : <span class="tw-avatar tw-avatar-small" aria-hidden="true">?</span>}
          <span>{name(m[side], m.bye)}</span>
          <strong>{m.bye ? '—' : (side === 'a' ? m.scoreA : m.scoreB) ?? '—'}</strong>
        </div>
      ))}
    </motion.article>
  );

  return (
    <div class="tw-overlay-root">
      <div class="tw-overlay-scaler" style={{ transform: `scale(${state.scale})` }}>
        <AnimatePresence mode="wait">
          {state.visible && (
            <motion.div
              key={`view-${view}`}
              class="tw-overlay-content"
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(16px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.03, filter: 'blur(20px)', transition: { duration: 0.4 * dur } }}
              transition={{ duration: 0.7 * dur, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Encabezado estilo transmisión */}
              <motion.header
                class="tw-overlay-header"
                initial={{ opacity: 0, y: -28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 * dur, duration: 0.6 * dur, ease: [0.16, 1, 0.3, 1] }}
              >
                {t.bannerUrl && <div class="tw-overlay-banner" style={{ backgroundImage: `url(${t.bannerUrl})` }} aria-hidden="true" />}
                <div class="tw-overlay-header-inner">
                  <span class={`tw-status tw-status-${t.status}`}>{statuses[t.status]}</span>
                  <h1 class="tw-overlay-title">
                    {t.name}
                    <span class="tw-overlay-sweep" aria-hidden="true" />
                  </h1>
                  <p>{formats[format]} <span class="tw-separator">/</span> {t.status !== 'draft' && t.status !== 'registration' ? `${done} / ${total} partidos` : `${competition.entrants.length} participantes`}</p>
                </div>
                <div class="tw-overlay-rule" aria-hidden="true" />
              </motion.header>

              {t.status === 'completed' && (
                <motion.div
                  class="tw-champion"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 * dur, duration: 0.6 * dur }}
                >
                  <span>{final?.winner ? 'Ganador del torneo' : 'Competencia finalizada'}</span>
                  <strong>{final?.winner ? name(final.winner) : `${done} partidos disputados`}</strong>
                </motion.div>
              )}

              {view === 'bracket' ? (
                <div class="tw-bracket tw-overlay-bracket" tabIndex={competition.matches.length ? 0 : undefined} aria-label="Partidos por ronda">
                  {rounds.map((round, ri) => (
                    <motion.section
                      class="tw-round"
                      key={round}
                      initial={{ opacity: 0, x: -22 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (0.3 + ri * 0.14) * dur, duration: 0.55 * dur, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <h3>{ri === rounds.length - 1 ? 'Final' : ri === rounds.length - 2 ? 'Semifinales' : `Ronda ${round}`}</h3>
                      <div class="tw-round-matches">
                        {competition.matches.filter(m => m.round === round).map((m, mi) => matchNode(m, ri, mi))}
                      </div>
                    </motion.section>
                  ))}
                </div>
              ) : (
                <motion.div
                  class="tw-table-scroll tw-overlay-table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 * dur, duration: 0.5 * dur }}
                >
                  <table class="tw-table">
                    <caption class="sr-only">Posiciones de {t.name}</caption>
                    <thead>
                      <tr>{['Pos.', 'Participante', 'PJ', 'G', 'E', 'P', 'Favor', 'Contra', 'Dif.', 'Pts.'].map(h => <th scope="col">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {standings(competition).map((p, i) => (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (0.35 + i * 0.05) * dur, duration: 0.45 * dur, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <td>{i + 1}</td>
                          <th scope="row">
                            <span class="tw-standing-player">
                              {avatar(p.id)}
                              <span>{p.name}{profile(p.id) && <small>@{profile(p.id)!.username}</small>}</span>
                            </span>
                          </th>
                          <td>{p.played}</td>
                          <td>{p.won}</td>
                          <td>{p.drawn}</td>
                          <td>{p.lost}</td>
                          <td>{p.for}</td>
                          <td>{p.against}</td>
                          <td>{p.difference > 0 ? '+' : ''}{p.difference}</td>
                          <td><strong>{p.points}</strong></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
