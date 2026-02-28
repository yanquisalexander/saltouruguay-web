export function generarTabla(equipos: string[], partidos: any[]) {
  const tabla: Record<string, any> = {};

  // init
  equipos.forEach((eq) => {
    tabla[eq] = {
      equipo: eq,
      PG: 0,
      PP: 0,
      GF: 0,
      GC: 0,
      PUNTOS: 0,
    };
  });

  partidos.forEach((p) => {
    const l = tabla[p.local];
    const v = tabla[p.visitante];
    if (!l || !v) return;

    l.GF += p.golesLocal;
    l.GC += p.golesVisitante;

    v.GF += p.golesVisitante;
    v.GC += p.golesLocal;

    if (p.golesLocal > p.golesVisitante) {
      l.PG++;
      l.PUNTOS += 3;
      v.PP++;
    } else if (p.golesVisitante > p.golesLocal) {
      v.PG++;
      v.PUNTOS += 3;
      l.PP++;
    }
  });

  return Object.values(tabla);
}
