import { useState } from 'preact/hooks';
import { formats, statuses, type CompetitionFormat } from '@/lib/tournament-engine';
import type { WorkspaceTournament } from './TournamentWorkspace';
import '@/assets/styles/tournaments.css';

export default function TournamentHub({ tournaments }: {
  tournaments: (WorkspaceTournament & { count: number })[];
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const visible = tournaments.filter(t =>
    (!query || t.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) &&
    (filter === 'all' || t.status === filter)
  );

  return <section class="tw tw-hub">
    <header class="tw-header">
      <div>
        <h1>Torneos</h1>
        <p>Competencias, cruces y resultados de la comunidad.</p>
      </div>
    </header>

    <div class="tw-toolbar">
      <nav class="tw-tabs" aria-label="Filtrar torneos">
        {[
          ['all', 'Todos'],
          ['registration', 'Inscripciones'],
          ['in_progress', 'En juego'],
          ['completed', 'Finalizados'],
        ].map(([id, label]) =>
          <button aria-current={filter === id ? 'page' : undefined} onClick={() => setFilter(id)}>{label}</button>
        )}
      </nav>
      <input type="search" aria-label="Buscar torneo" placeholder="Buscar torneo" value={query} onInput={e => setQuery(e.currentTarget.value)} />
    </div>

    <div class="tw-tournament-list">
      {visible.map(t => <a class="tw-tournament" href={`/torneos/${t.id}`}>
        <div class="tw-tournament-art">
          {t.bannerUrl ? <img src={t.bannerUrl} alt="" loading="lazy" /> : <span aria-hidden="true">{t.name.slice(0, 2)}</span>}
        </div>
        <div>
          <span class={`tw-status tw-status-${t.status}`}>{statuses[t.status] ?? t.status}</span>
          <h2>{t.name}</h2>
          <p>{formats[t.format as CompetitionFormat] ?? t.format}</p>
        </div>
        <div class="tw-tournament-count"><strong>{t.count}</strong><span>participantes</span></div>
      </a>)}
    </div>

    {!visible.length && <div class="tw-empty">
      <h2>{query || filter !== 'all' ? 'No hay torneos con ese filtro' : 'Todavía no hay torneos publicados'}</h2>
      <p>{query || filter !== 'all' ? 'Probá otra búsqueda o volvé a Todos.' : 'Cuando se publique una competencia va a aparecer acá.'}</p>
    </div>}

    <footer class="tw-format-guide">
      <div><h3>Eliminación directa</h3><p>Un cuadro hasta la final. Los ganadores avanzan y los pases libres se resuelven solos.</p></div>
      <div><h3>Todos contra todos</h3><p>Cada participante enfrenta al resto. Jornadas automáticas y posiciones por puntos.</p></div>
      <div><h3>Cruces manuales</h3><p>El organizador define cada enfrentamiento y su jornada.</p></div>
    </footer>
  </section>;
}
