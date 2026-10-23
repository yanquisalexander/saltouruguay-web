import { useEffect, useRef, useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { formats, statuses, standings, type Competition, type CompetitionFormat, type Fixture } from '@/lib/tournament-engine';
import '@/assets/styles/tournaments.css';

export interface WorkspaceTournament {
  id: number; name: string; description: string | null; format: string; status: string;
  privacy: string; maxParticipants: number | null; bannerUrl?: string | null;
}
export interface ParticipantProfile { id: number; username: string; displayName: string; avatar: string | null }
export default function TournamentWorkspace({ tournament: t, competition: c, profiles = [], canManage = false, currentUserId }: {
  tournament: WorkspaceTournament; competition: Competition; profiles?: ParticipantProfile[]; canManage?: boolean; currentUserId?: number;
}) {
  const preparing = ['draft', 'registration'].includes(t.status);
  const [tab, setTab] = useState(preparing && canManage ? 'participants' : 'competition');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [names, setNames] = useState('');
  const [editing, setEditing] = useState<Fixture | null>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input, button:not(:disabled)') ?? []);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); document.body.style.overflow = overflow; previous?.focus(); };
  }, [editing]);
  const joined = c.entrants.some(p => p.userId === currentUserId);
  const name = (id: string | null, bye = false) => c.entrants.find(p => p.id === id)?.name ?? (bye ? 'Pase libre' : 'Por definir');
  const profile = (id: string | null) => {
    const userId = c.entrants.find(p => p.id === id)?.userId;
    return userId ? profiles.find(p => p.id === userId) : undefined;
  };
  const avatar = (id: string | null, size: 'small' | 'large' = 'small') => {
    const participantName = name(id);
    const participantProfile = profile(id);
    return <span class={`tw-avatar tw-avatar-${size}`} aria-hidden="true">
      {participantProfile?.avatar ? <img src={participantProfile.avatar} alt="" loading="lazy" /> : participantName.slice(0, 1).toLocaleUpperCase()}
    </span>;
  };
  const rounds = [...new Set(c.matches.map(m => m.round))].sort((a, b) => a - b);
  const done = c.matches.filter(m => m.completed && !m.bye).length;
  const total = c.matches.filter(m => !m.bye).length;
  const final = c.matches.find(m => !m.next && m.completed && t.format === 'single_elimination');
  type Command = Parameters<typeof actions.tournaments.workspace>[0]['command'];
  async function run(command: Command) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await actions.tournaments.workspace({ tournamentId: t.id, revision: c.revision, command });
      if (result.error) { setError(result.error.message); setBusy(false); return; }
      if (command.type === 'delete') window.location.assign(canManage ? '/admin/torneos' : '/torneos');
      else window.location.reload();
    } catch { setError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.'); setBusy(false); }
  }
  function move(index: number, delta: number) {
    const ids = c.entrants.map(p => p.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    void run({ type: 'reorder', ids });
  }
  return <section class="tw" aria-busy={busy}>
    <a class="tw-back" href={canManage ? '/admin/torneos' : '/torneos'}>{canManage ? 'Administración de torneos' : 'Torneos de la comunidad'}</a>
    <header class="tw-header">
      <div><span class={`tw-status tw-status-${t.status}`}>{statuses[t.status]}</span><h1>{t.name}</h1>
        <p>{formats[t.format as CompetitionFormat]} <span class="tw-separator">/</span> {c.entrants.length} participantes <span class="tw-separator">/</span> {t.privacy === 'private' ? 'Torneo interno' : 'Público'}</p></div>
      <div class="tw-actions">
        {canManage && preparing && <button disabled={busy || c.entrants.length < 2} class="tw-primary" onClick={() => setTab('launch')}>Preparar inicio</button>}
        {currentUserId && !canManage && preparing && (joined ? <button disabled={busy} onClick={() => run({ type: 'leave' })}>Salir del torneo</button> : t.status === 'registration' && c.registration === 'open' && <button class="tw-primary" disabled={busy || c.entrants.length >= (t.maxParticipants ?? 128)} onClick={() => run({ type: 'join' })}>Inscribirme</button>)}
        {!currentUserId && t.status === 'registration' && <a href="/auth/signin">Iniciá sesión para inscribirte</a>}
        {canManage && t.format === 'pairs' && t.status === 'in_progress' && <button disabled={busy || !total || done !== total} onClick={() => run({ type: 'finish' })}>Finalizar torneo</button>}
      </div>
    </header>
    {error && <div class="tw-error" role="alert">{error} <button onClick={() => window.location.reload()}>Recargar</button></div>}
    {t.status === 'completed' && <div class="tw-champion"><span>{final?.winner ? 'Ganador del torneo' : 'Competencia finalizada'}</span><strong>{final?.winner ? name(final.winner) : `${done} partidos disputados`}</strong></div>}
    <nav class="tw-tabs" aria-label="Secciones del torneo">{[['competition', 'Competencia'], ['participants', 'Participantes'], ['standings', 'Posiciones'], ...(canManage ? [['settings', 'Configuración']] : [])].map(([id, label]) => <button aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setError(''); }}>{label}</button>)}</nav>
    <div class="tw-body">
      <main>
        {tab === 'launch' && <div class="tw-panel tw-prose"><h2>Todo listo para jugar</h2><p>Se cerrará la lista de {c.entrants.length} participantes. {t.format === 'pairs' ? 'Después elegís los cruces de cada jornada.' : t.format === 'round_robin' ? `Se crearán ${c.entrants.length * (c.entrants.length - 1) / 2} partidos. Cada participante se enfrenta una vez con los demás.` : 'Se generará el cuadro y se asignarán pases libres cuando sean necesarios.'}</p><p>Orden: {c.seeding === 'random' ? 'sorteo al iniciar' : 'según la lista de participantes'}. Los participantes y el formato quedan cerrados al iniciar.</p><div class="tw-actions"><button class="tw-primary" disabled={busy} onClick={() => run({ type: 'start' })}>Iniciar torneo</button><button onClick={() => setTab('participants')}>Revisar participantes</button></div></div>}
        {tab === 'participants' && <>
          <div class="tw-section-title"><h2>Lista de participantes</h2><span>{c.entrants.length} / {t.maxParticipants ?? 128}</span></div>
          {canManage && preparing && <form class="tw-panel tw-add" onSubmit={e => { e.preventDefault(); void run({ type: 'add', names: names.split('\n').map(s => s.trim()).filter(Boolean) }); }}>
            <label htmlFor="entrant-names">Agregar jugadores o parejas</label><p>Un nombre por línea. No necesitan una cuenta. Para competir en pareja, escribí el nombre de la dupla.</p>
            <textarea id="entrant-names" rows={3} required maxLength={11000} value={names} onInput={e => setNames(e.currentTarget.value)} placeholder={'Nombre del jugador o de la pareja\nOtro participante'} />
            <button class="tw-primary" disabled={busy || !names.trim()}>Agregar a la lista</button>
          </form>}
          {!c.entrants.length && <div class="tw-empty"><h3>La competencia empieza con su gente</h3><p>{canManage ? 'Agregá los nombres arriba o abrí las inscripciones desde Configuración.' : 'El organizador todavía está preparando la lista.'}</p></div>}
          <ol class="tw-entrants">{c.entrants.map((p, i) => { const userProfile = profile(p.id); return <li key={p.id}><span class="tw-seed">{i + 1}</span>{avatar(p.id, 'large')}<div><strong>{p.name}</strong><small>{userProfile ? `@${userProfile.username}` : 'Participante cargado manualmente'}</small></div>{canManage && preparing && <div class="tw-actions"><button disabled={busy || i === 0} aria-label={`Subir a ${p.name}`} onClick={() => move(i, -1)}>↑</button><button disabled={busy || i === c.entrants.length - 1} aria-label={`Bajar a ${p.name}`} onClick={() => move(i, 1)}>↓</button><button disabled={busy} onClick={() => { const value = window.prompt('Nombre del participante', p.name); if (value?.trim()) void run({ type: 'rename', id: p.id, name: value.trim() }); }}>Editar</button><button disabled={busy} onClick={() => run({ type: 'remove', id: p.id })}>Quitar</button></div>}</li>})}</ol>
        </>}
        {tab === 'competition' && <>
          <div class="tw-section-title"><h2>{t.format === 'single_elimination' ? 'El camino a la final' : 'Jornadas y resultados'}</h2><span>{done} / {total} partidos</span></div>
          {canManage && t.format === 'pairs' && t.status === 'in_progress' && <form class="tw-panel tw-pair" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: 'pair', a: String(f.get('a')), b: String(f.get('b')), round: Number(f.get('round')) }); }}>
            <h3>Crear enfrentamiento</h3>{['a', 'b'].map((side, i) => <label>Participante {i + 1}<select name={side} required><option value="">Elegir participante</option>{c.entrants.map(p => <option value={p.id}>{p.name}</option>)}</select></label>)}<label>Jornada<input name="round" type="number" min={1} max={100} defaultValue={1} required /></label><button disabled={busy} class="tw-primary">Agregar cruce</button>
          </form>}
          {!c.matches.length && <div class="tw-empty"><h3>{preparing ? 'Los cruces todavía no se generaron' : 'Elegí quién juega contra quién'}</h3><p>{preparing ? 'Primero se completa la lista de participantes. Al iniciar aparecerá la competencia acá.' : 'Agregá los enfrentamientos de cada jornada. Los resultados alimentan la tabla de posiciones.'}</p>{canManage && preparing && <button onClick={() => setTab('participants')}>Preparar participantes</button>}</div>}
          <div class={t.format === 'single_elimination' ? 'tw-bracket' : 'tw-fixtures'} tabIndex={c.matches.length ? 0 : undefined} aria-label="Partidos por ronda">{rounds.map((round, ri) => <section class="tw-round" key={round}><h3>{t.format === 'single_elimination' ? ri === rounds.length - 1 ? 'Final' : ri === rounds.length - 2 ? 'Semifinales' : `Ronda ${round}` : `Jornada ${round}`}</h3><div class="tw-round-matches">{c.matches.filter(m => m.round === round).map(m => <article class={`tw-match ${m.completed ? 'tw-match-done' : ''}`} key={m.id}>
            <span class="tw-match-label">{m.bye ? 'Pase automático' : m.completed ? 'Resultado final' : m.a && m.b ? 'Listo para jugar' : 'Espera un resultado'}</span>
            {(['a', 'b'] as const).map(side => <div class={`tw-player ${m.winner && m.winner === m[side] ? 'tw-winner' : ''}`}>{m[side] ? avatar(m[side]) : <span class="tw-avatar tw-avatar-small" aria-hidden="true">?</span>}<span>{name(m[side], m.bye)}</span><strong>{m.bye ? '—' : (side === 'a' ? m.scoreA : m.scoreB) ?? '—'}</strong></div>)}
            {canManage && m.a && m.b && !m.bye && <button class="tw-match-action" disabled={busy} onClick={() => setEditing(m)}>{m.completed ? 'Corregir resultado' : 'Cargar resultado'}</button>}
            {canManage && t.format === 'pairs' && !m.completed && <button class="tw-match-action" disabled={busy} onClick={() => run({ type: 'deletePair', id: m.id })}>Quitar cruce</button>}
          </article>)}</div></section>)}</div>
        </>}
        {tab === 'standings' && <><h2>Tabla de posiciones</h2><p class="tw-muted">{t.format === 'single_elimination' ? 'Estadísticas de partidos jugados. El ganador del torneo se define en la final.' : `Victoria: ${c.points.win} pts. Empate: ${c.points.draw} pts. Derrota: ${c.points.loss} pts.`} Desempate: diferencia, tantos a favor y orden inicial. Los pases libres no suman.</p><div class="tw-table-scroll"><table class="tw-table"><caption class="sr-only">Posiciones de {t.name}</caption><thead><tr>{['Pos.', 'Participante', 'PJ', 'G', 'E', 'P', 'Favor', 'Contra', 'Dif.', 'Pts.'].map(h => <th scope="col">{h}</th>)}</tr></thead><tbody>{standings(c).map((p, i) => <tr><td>{i + 1}</td><th scope="row"><span class="tw-standing-player">{avatar(p.id)}<span>{p.name}{profile(p.id) && <small>@{profile(p.id)!.username}</small>}</span></span></th><td>{p.played}</td><td>{p.won}</td><td>{p.drawn}</td><td>{p.lost}</td><td>{p.for}</td><td>{p.against}</td><td>{p.difference > 0 ? '+' : ''}{p.difference}</td><td><strong>{p.points}</strong></td></tr>)}</tbody></table></div>{!c.entrants.length && <p class="tw-muted">Las posiciones aparecerán cuando haya participantes.</p>}</>}
        {tab === 'settings' && canManage && <form class="tw-panel tw-settings" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: 'settings', name: String(f.get('name')), description: String(f.get('description')), bannerUrl: String(f.get('bannerUrl')), format: String(f.get('format')) as CompetitionFormat, privacy: String(f.get('privacy')) as 'public' | 'private', registration: String(f.get('registration')) as Competition['registration'], seeding: String(f.get('seeding')) as Competition['seeding'], maxParticipants: Number(f.get('maxParticipants')), win: Number(f.get('win')), draw: Number(f.get('draw')), loss: Number(f.get('loss')) }); }}>
          <h2>Preparar el torneo</h2>{!preparing && <p>El torneo ya comenzó. El formato, la lista y las reglas están cerrados.</p>}
          <fieldset disabled={busy || !preparing}>
            <label>Nombre<input name="name" defaultValue={t.name} required minLength={3} maxLength={100} /></label>
            <label>Descripción y reglas<textarea name="description" rows={4} defaultValue={t.description ?? ''} maxLength={5000} /></label>
            <label>Imagen de portada<input name="bannerUrl" type="url" defaultValue={t.bannerUrl ?? ''} maxLength={2000} placeholder="https://cdn.saltouruguayserver.com/..." /></label>
            <label>Formato<select name="format" defaultValue={t.format}>{Object.entries(formats).map(([id, label]) => <option value={id}>{label}</option>)}</select></label>
            <label>Visibilidad<select name="privacy" defaultValue={t.privacy}><option value="public">Público, visible para todos</option><option value="private">Interno, solo organizador y administradores</option></select></label>
            <label>Participantes<select name="registration" defaultValue={c.registration}><option value="manual">Los carga el organizador</option><option value="open">Inscripción con cuenta de la comunidad</option></select></label>
            <label>Cupo<input name="maxParticipants" type="number" min={2} max={128} required defaultValue={t.maxParticipants ?? 128} /></label>
            <label>Orden inicial<select name="seeding" defaultValue={c.seeding}><option value="ordered">Usar el orden de la lista</option><option value="random">Sortear al iniciar</option></select></label>
            <div class="tw-points">{(['win', 'draw', 'loss'] as const).map((key, i) => <label>{['Puntos por victoria', 'Por empate', 'Por derrota'][i]}<input name={key} type="number" min={0} max={100} defaultValue={c.points[key]} required /></label>)}</div>
            <button class="tw-primary">Guardar configuración</button>
          </fieldset>
          {preparing && c.registration === 'open' && t.privacy === 'public' && <button type="button" disabled={busy} onClick={() => run({ type: 'registration', open: t.status !== 'registration' })}>{t.status === 'registration' ? 'Cerrar inscripciones' : 'Abrir inscripciones'}</button>}
          <div class="tw-danger"><h3>Eliminar torneo</h3><p>Se borrarán la lista, los cruces y todos los resultados.</p><button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar «${t.name}» y todos sus resultados?`)) void run({ type: 'delete' }); }}>Eliminar este torneo</button></div>
        </form>}
      </main>
      <aside class="tw-aside"><h3>La competencia</h3><p>{t.description || 'El organizador todavía no agregó una descripción.'}</p><dl><dt>Formato</dt><dd>{formats[t.format as CompetitionFormat]}</dd><dt>Inscripción</dt><dd>{c.registration === 'manual' ? 'Carga del organizador' : 'Abierta a la comunidad'}</dd><dt>Estado</dt><dd>{statuses[t.status]}</dd></dl>{canManage && <p>Compartí la dirección de esta página para seguir los resultados.{t.privacy === 'private' && ' El acceso de este torneo es interno.'}</p>}</aside>
    </div>
    {editing && <div class="tw-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setEditing(null); }}><section ref={dialog} class="tw-modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={e => { if (e.key === 'Escape' && !busy) setEditing(null); }}><h2 id="result-title">{editing.completed ? 'Corregir resultado' : 'Cargar resultado'}</h2><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: 'result', id: editing.id, a: Number(f.get('a')), b: Number(f.get('b')) }); }}>
      {(['a', 'b'] as const).map((side, i) => <label>{name(editing[side])}<input autoFocus={i === 0} name={side} type="number" min={0} max={9999} required defaultValue={(side === 'a' ? editing.scoreA : editing.scoreB) ?? 0} /></label>)}
      {editing.completed && t.format === 'single_elimination' && <p>Cambiar el ganador borra los resultados de los cruces posteriores que dependan de este partido.</p>}
      {error && <p role="alert" class="tw-error">{error}</p>}<div class="tw-actions"><button class="tw-primary" disabled={busy}>Guardar resultado</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div>
    </form></section></div>}
  </section>;
}

