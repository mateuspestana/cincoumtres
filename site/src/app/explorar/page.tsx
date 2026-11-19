import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Explorador, type Salto } from '@/components/Explorador';
import { dados, LEG_ATUAL } from '@/lib/dados';
import { diaDaData } from '@/lib/tempo';

export const metadata: Metadata = {
  title: 'Explorar',
  description: 'Escolha qualquer dia da legislatura e veja quem ocupava cada uma das 513 cadeiras da Câmara, quais eram suplentes e no lugar de quem.',
};

export default function Explorar() {
  for (const f of ['meta', 'vagas', 'pessoas', 'serie']) preload(`/data/${LEG_ATUAL}/${f}.json`, { as: 'fetch', crossOrigin: 'anonymous' });
  const { meta } = dados();
  const n = meta.numeros;
  const saltos: Salto[] = [
    { rotulo: 'Posse', dia: 0 },
    { rotulo: 'Mais suplentes', dia: n.pico_dia },
    { rotulo: 'Prefeitos, jan 2025', dia: diaDaData(meta.inicio, '2025-01-01') },
    { rotulo: 'Recontagem', dia: n.vazias_max_dia },
    { rotulo: 'Volta de abril', dia: diaDaData(meta.inicio, '2026-04-06') },
    { rotulo: 'Hoje', dia: meta.dias - 1 },
  ];
  return <Explorador leg={LEG_ATUAL} diaPadrao={meta.dias - 1} saltos={saltos} ufs={meta.ufs.map((u) => u.uf).sort()} />;
}
