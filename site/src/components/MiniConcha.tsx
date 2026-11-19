// A concha pequena, estática (renderizada no build), com as cadeiras de uma página em destaque.
// Mesma geometria da concha grande, arrumada por UF.
import { calcularLayout } from '@/concha/geometria';

export function MiniConcha({ total, destaque, rotulo }: { total: number; destaque: number[]; rotulo: string }) {
  const W = 640;
  const H = 380;
  const L = calcularLayout(W, H, total);
  const marcados = new Set(destaque);
  const r = L.raio * 0.92;
  const topo = L.borda - 8;
  return (
    <svg className="mini-concha" viewBox={`0 ${topo} ${W} ${H - topo}`} role="img" aria-label={rotulo}>
      <line x1={L.regua.x0} x2={L.regua.x1} y1={L.borda} y2={L.borda} stroke="var(--c-fg)" strokeWidth={1} />
      {L.slots.map((s, i) => (
        <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={r} fill={marcados.has(i) ? 'var(--c-accent)' : 'var(--c-field)'} fillOpacity={marcados.has(i) ? 1 : 0.28} />
      ))}
      {destaque.map((i) => L.slots[i] && (
        <circle key={`m${i}`} cx={L.slots[i].x.toFixed(1)} cy={L.slots[i].y.toFixed(1)} r={r * 2.6} fill="none" stroke="var(--c-fg)" strokeWidth={1.2} />
      ))}
    </svg>
  );
}
