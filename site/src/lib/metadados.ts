// Metadados das páginas por legislatura. A padrão vive na raiz; as outras, em /leg/<número>/.
import type { Metadata } from 'next';
import { dados, pessoaPorId } from './dados';
import { LEG_PADRAO, rota } from './legs';
import { NOME_UF, doEstado } from './ufs';

const sufixo = (leg: number) => (leg === LEG_PADRAO ? '' : `, ${leg}ª legislatura`);

export const metaPagina = (leg: number, caminho: string, titulo: string | null, descricao: string | null): Metadata => ({
  ...(titulo ? { title: `${titulo}${sufixo(leg)}` } : leg === LEG_PADRAO ? {} : { title: `${leg}ª legislatura` }),
  ...(descricao ? { description: descricao } : {}),
  alternates: { canonical: rota(leg, caminho) },
});

export const DESC_EXPLORAR = 'Escolha qualquer dia da legislatura e veja quem ocupava cada uma das 513 cadeiras da Câmara, quais eram suplentes e no lugar de quem.';
export const DESC_COMO = 'Como o site decide em que cadeira cada deputado senta e quem entrou no lugar de quem, com as regras, os números e os casos incertos.';

export function metaDeputado(leg: number, id: string): Metadata {
  const p = pessoaPorId(leg).get(Number(id));
  if (!p) return {};
  return {
    title: `${p.nome} (${p.p22}-${p.uf})${sufixo(leg)}`,
    description: `${p.nome}, deputado federal ${p.tipo === 'T' ? 'eleito' : 'suplente'} por ${NOME_UF[p.uf]}: períodos em exercício na Câmara, vagas ocupadas e quem entrou ou saiu no lugar.`,
    alternates: { canonical: rota(leg, `/deputado/${id}/`) },
  };
}

export function metaVaga(leg: number, id: string): Metadata {
  const v = dados(leg).vagas.find((x) => x.id.toLowerCase() === id);
  if (!v) return {};
  return {
    title: `Vaga ${v.id}${sufixo(leg)}`,
    description: `Quem ocupou a vaga ${v.id}, uma das cadeiras ${doEstado(v.uf)} na Câmara dos Deputados, e por quanto tempo.`,
    alternates: { canonical: rota(leg, `/vaga/${id}/`) },
  };
}

export const idsDeputados = (leg: number) => dados(leg).pessoas.map((p) => String(p.id));
export const idsVagas = (leg: number) => dados(leg).vagas.map((v) => v.id.toLowerCase());
