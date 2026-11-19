import { preload } from 'react-dom';
import { Explorador, type Salto } from '@/components/Explorador';
import { dados } from '@/lib/dados';
import { diaDaData } from '@/lib/tempo';

export function Explorar({ leg }: { leg: number }) {
  for (const f of ['meta', 'vagas', 'pessoas', 'serie']) preload(`/data/${leg}/${f}.json`, { as: 'fetch', crossOrigin: 'anonymous' });
  const { meta } = dados(leg);
  const n = meta.numeros;
  const eh57 = meta.leg === 57;
  const saltos: Salto[] = [
    { rotulo: 'Posse', dia: 0 },
    { rotulo: 'Mais suplentes', dia: n.pico_dia },
    ...(eh57 ? [{ rotulo: 'Prefeitos, jan 2025', dia: diaDaData(meta.inicio, '2025-01-01') }] : []),
    { rotulo: 'Recontagem', dia: n.vazias_max_dia },
    ...(eh57 ? [{ rotulo: 'Volta de abril', dia: diaDaData(meta.inicio, '2026-04-06') }] : [{ rotulo: 'Maior queda', dia: n.quedas[0].dia }]),
    { rotulo: meta.dias >= meta.dias_total ? 'Último dia' : 'Hoje', dia: meta.dias - 1 },
  ];
  return <Explorador leg={leg} diaPadrao={meta.dias - 1} saltos={saltos} ufs={meta.ufs.map((u) => u.uf).sort()} />;
}
