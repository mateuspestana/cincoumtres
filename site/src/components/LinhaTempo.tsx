// Linha do tempo (renderizada no build): a legislatura inteira da esquerda para a direita, com
// trechos coloridos. É a herança do conceito "livro de linhas": cada vaga é uma linha.
// Barras em SVG; anos e nomes em HTML, para ficarem legíveis em qualquer largura.
import { mesAno } from '@/lib/tempo';

export type Trecho = { ini: number; fim: number; tipo: 't' | 's' | 'e' | 'fora' | 'vazia'; rotulo?: string; tom?: 0 | 1 };

const COR: Record<string, string> = {
  t0: 'var(--c-field)', t1: '#2F6B52', s0: 'var(--c-accent)', s1: '#B85410', e0: 'var(--c-accent)', e1: '#B85410',
};

export function LinhaTempo({ trechos, inicio, diasTotal, diasDados, titulo }: {
  trechos: Trecho[]; inicio: string; diasTotal: number; diasDados: number; titulo: string;
}) {
  const W = 1000;
  const x = (d: number) => (d / (diasTotal - 1)) * W;
  const pct = (d: number) => `${(d / (diasTotal - 1)) * 100}%`;
  const anos: { d: number; ano: string }[] = [];
  const a0 = Number(inicio.slice(0, 4));
  for (let a = a0; a <= a0 + 4; a++) {
    const d = Math.round((Date.UTC(a, 0, 1) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000);
    if (d > 0 && x(d) > 60 && x(d) < W - 90) anos.push({ d, ano: String(a) });
  }
  // só ganha nome o trecho largo o bastante (cerca de 9% da legislatura); os outros estão na lista abaixo
  const comRotulo = trechos.filter((t) => t.rotulo && (t.fim - t.ini) / diasTotal > 0.09);
  return (
    <figure className="linha">
      {comRotulo.length > 0 && (
        <ol className="linha__nomes" aria-hidden="true">
          {comRotulo.map((t, i) => (
            <li key={i} style={{ left: pct(t.ini), width: pct(t.fim - t.ini) }} title={t.rotulo}>{t.rotulo}</li>
          ))}
        </ol>
      )}
      <svg viewBox={`0 0 ${W} 20`} preserveAspectRatio="none" role="img" aria-label={titulo}>
        <line x1={0} x2={x(diasDados - 1)} y1={10} y2={10} stroke="var(--c-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={x(diasDados - 1)} x2={W} y1={10} y2={10} stroke="var(--c-muted)" strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {trechos.map((t, i) => (
          t.tipo === 'fora' || t.tipo === 'vazia' ? (
            <rect key={i} x={x(t.ini)} y={6} width={Math.max(1.5, x(t.fim) - x(t.ini))} height={8} fill="none"
              stroke={t.tipo === 'vazia' ? 'var(--c-accent)' : 'var(--c-field)'} strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          ) : (
            <rect key={i} x={x(t.ini)} y={3} width={Math.max(1.5, x(t.fim) - x(t.ini))} height={14} fill={COR[`${t.tipo}${t.tom ?? 0}`]} />
          )
        ))}
        {trechos.filter((t) => t.tipo === 'e').map((t, i) => (
          <rect key={`e${i}`} x={x(t.ini)} y={8.5} width={Math.max(1, x(t.fim) - x(t.ini))} height={3} fill="var(--c-field)" />
        ))}
      </svg>
      <ol className="linha__anos" aria-hidden="true">
        <li style={{ left: 0 }}>{mesAno(inicio, 0)}</li>
        {anos.map((a) => <li key={a.ano} style={{ left: pct(a.d) }}>{a.ano}</li>)}
        <li style={{ left: '100%' }}>{mesAno(inicio, diasTotal - 1)}</li>
      </ol>
    </figure>
  );
}
