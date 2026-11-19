import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LinhaTempo, type Trecho } from '@/components/LinhaTempo';
import { MiniConcha } from '@/components/MiniConcha';
import { dados, pessoaPorId } from '@/lib/dados';
import { CONDICAO, CONFIANCA, REGRA_CURTA } from '@/lib/estado';
import { rota } from '@/lib/legs';
import { dataCurta, nDias } from '@/lib/tempo';
import { NOME_UF, doEstado, extenso } from '@/lib/ufs';

export function VagaPagina({ leg, id }: { leg: number; id: string }) {
  const v = dados(leg).vagas.find((x) => x.id.toLowerCase() === id);
  if (!v) notFound();
  const { meta, vagas } = dados(leg);
  const pessoas = pessoaPorId(leg);
  const indice = vagas.indexOf(v);
  const nUf = meta.ufs.find((u) => u.uf === v.uf)!.cadeiras;

  const trechos: Trecho[] = [];
  let cursor = 0;
  let tom: 0 | 1 = 0;
  let anterior = -1;
  for (const s of v.segs) {
    if (s[1] > cursor) trechos.push({ ini: cursor, fim: s[1], tipo: 'vazia' });
    if (s[0] !== anterior && anterior !== -1) tom = tom ? 0 : 1; // ocupantes vizinhos em tons diferentes
    trechos.push({ ini: s[1], fim: s[2], tipo: s[3], rotulo: pessoas.get(s[0])!.nome, tom });
    anterior = s[0];
    cursor = s[2];
  }
  if (cursor < meta.dias) trechos.push({ ini: cursor, fim: meta.dias, tipo: 'vazia' });
  const nomes = new Set(v.segs.map((s) => s[0]));

  return (
    <article className="pagina">
      <header className="pagina__topo">
        <p className="pagina__rotulo">Vaga · {NOME_UF[v.uf]}</p>
        <h1 className="pagina__titulo entra">Vaga {v.id}</h1>
        <p className="pagina__lede entra entra--2">
          Uma das {nUf} cadeiras {doEstado(v.uf)}. {nomes.size === 1 ? 'Só uma pessoa sentou nela' : `${extenso(nomes.size, true).replace(/^./, (c) => c.toUpperCase())} pessoas sentaram nela`} desde a posse.
          O código da vaga é deste site: a Câmara não numera as cadeiras (<Link href={rota(leg, '/como-inferimos/')} className="link-sub">veja como inferimos</Link>).
        </p>
      </header>
      <section aria-labelledby="linha-titulo">
        <div className="vaga-topo">
          <h2 id="linha-titulo" className="secao-titulo">A linha da vaga</h2>
          <MiniConcha total={meta.cadeiras} destaque={[indice]} rotulo={`Posição da vaga ${v.id} na concha, entre as cadeiras ${doEstado(v.uf)}.`} />
        </div>
        <LinhaTempo trechos={trechos} inicio={meta.inicio} diasTotal={meta.dias_total} diasDados={meta.dias}
          titulo={`Linha da vaga ${v.id}: cada trecho é uma pessoa; verde titular, laranja suplente, tracejado vazia.`} />
      </section>
      <section aria-labelledby="ocupantes-titulo" style={{ marginTop: 'calc(var(--u) * 5)' }}>
        <h2 id="ocupantes-titulo" className="secao-titulo">Quem sentou aqui</h2>
        <ol className="ocupantes">
          {v.segs.map((s, i) => {
            const p = pessoas.get(s[0])!;
            return (
              <li key={i}>
                <span className="mono">{dataCurta(meta.inicio, s[1])} a {s[2] >= meta.dias ? 'hoje' : dataCurta(meta.inicio, s[2])}</span>
                <p>
                  <strong><Link href={rota(leg, `/deputado/${p.id}/`)}>{p.nome}</Link></strong>, {CONDICAO[s[3]]}, {nDias(Math.min(s[2], meta.dias) - s[1])}.
                  {s[6] && s[6] !== 'rem' && <> Saiu: {meta.motivos[s[6]]?.toLowerCase()}.</>}
                  {s[6] === 'rem' && <> Passou para outra vaga da mesma lista.</>}
                  {s[4] && <> <span className={`tag tag--${s[4]}`}>{CONFIANCA[s[4]].replace('confiança ', '')}: {REGRA_CURTA[s[5] ?? ''] ?? ''}</span></>}
                </p>
                <span className="mono">{s[3] === 't' ? 'titular' : 'suplente'}</span>
              </li>
            );
          })}
        </ol>
      </section>
      {v.donos.length > 0 && (
        <section aria-labelledby="donos-titulo" style={{ marginTop: 'calc(var(--u) * 5)' }}>
          <h2 id="donos-titulo" className="secao-titulo">De quem é a vaga</h2>
          <ol className="ocupantes">
            {v.donos.map((d, i) => (
              <li key={i}>
                <span className="mono">{dataCurta(meta.inicio, d[1])} a {d[2] >= meta.dias ? 'hoje' : dataCurta(meta.inicio, d[2])}</span>
                <p><Link href={rota(leg, `/deputado/${d[0]}/`)}>{pessoas.get(d[0])!.nome}</Link></p>
                <span className="mono">{i === 0 ? 'eleito' : 'passou a ser dono'}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
