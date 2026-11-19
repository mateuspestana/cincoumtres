import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LinhaTempo, type Trecho } from '@/components/LinhaTempo';
import { MiniConcha } from '@/components/MiniConcha';
import { dados, pessoaPorId } from '@/lib/dados';
import { CONDICAO, CONFIANCA, REGRA_CURTA, ausencia, partidoNoDia } from '@/lib/estado';
import { ANO_ELEICAO, rota } from '@/lib/legs';
import { dataCurta, dataLonga, nDias } from '@/lib/tempo';

const TIPO = (ano: number): Record<string, string> => ({
  T: `eleito titular em ${ano}`, S: `suplente na eleição de ${ano}`, J: 'entrou por recontagem ou retotalização',
});

export function Deputado({ leg, id }: { leg: number; id: string }) {
  const pid = Number(id);
  const { meta, vagas } = dados(leg);
  const pessoas = pessoaPorId(leg);
  const p = pessoas.get(pid);
  if (!p) notFound();
  const ult = meta.dias - 1;

  type Linha = { ini: number; fim: number; vaga: string; texto: React.ReactNode; tipo: Trecho['tipo'] };
  const linhas: Linha[] = [];
  const trechos: Trecho[] = [];
  for (const v of vagas) {
    for (const s of v.segs) {
      if (s[0] !== pid) continue;
      trechos.push({ ini: s[1], fim: s[2], tipo: s[3] });
      const au = s[3] !== 't' ? ausencia(v, s[1]) : null;
      const quem = au ? pessoas.get(au[0]) : null;
      linhas.push({
        ini: s[1], fim: s[2], vaga: v.id, tipo: s[3],
        texto: (
          <>
            <strong>{CONDICAO[s[3]].replace(/^./, (c) => c.toUpperCase())}</strong>
            {quem && <> no lugar de <Link href={rota(leg, `/deputado/${quem.id}/`)}>{quem.nome}</Link> ({meta.motivos[au![3]]?.toLowerCase()})</>}
            {s[4] && s[3] !== 't' && <> <span className={`tag tag--${s[4]}`}>{CONFIANCA[s[4]].replace('confiança ', '')}: {REGRA_CURTA[s[5] ?? ''] ?? ''}</span></>}
            {s[6] === 'rem' && <>. Mudou de vaga dentro da lista do partido.</>}
          </>
        ),
      });
    }
    for (const a of v.aus) {
      if (a[0] !== pid) continue;
      trechos.push({ ini: a[1], fim: a[2], tipo: 'fora' });
      const subs = v.segs.filter((s) => s[0] !== pid && s[1] < a[2] && s[2] > a[1]).map((s) => pessoas.get(s[0])!);
      const unicos = [...new Map(subs.map((x) => [x.id, x])).values()];
      linhas.push({
        ini: a[1], fim: a[2], vaga: v.id, tipo: 'fora',
        texto: (
          <>
            <strong>Fora da Câmara</strong>: {meta.motivos[a[3]]?.toLowerCase()}
            {unicos.length > 0 && <>. Na vaga: {unicos.map((u, i) => <span key={u.id}>{i > 0 && ', '}<Link href={rota(leg, `/deputado/${u.id}/`)}>{u.nome}</Link></span>)}</>}
          </>
        ),
      });
    }
  }
  linhas.sort((a, b) => a.ini - b.ini);
  const cadeiras = vagas.map((v, i) => (v.segs.some((s) => s[0] === pid) || v.aus.some((a) => a[0] === pid) ? i : -1)).filter((i) => i >= 0);
  trechos.sort((a, b) => a.ini - b.ini);
  const total = p.dt + p.ds;
  const partidoHoje = partidoNoDia(p, ult);

  return (
    <article className="pagina">
      <div className="dep">
        <div className="dep__foto">
          {p.foto && <img className="duo" src={p.foto} alt={`Foto oficial de ${p.nome}`} width={300} height={400} loading="eager" />}
        </div>
        <header className="dep__cabeca">
          <p className="pagina__rotulo">Deputado federal · {meta.leg}ª legislatura</p>
          <h1 className="dep__nome entra">{p.nome}</h1>
          <p className="dep__meta">
            {partidoHoje}-{p.uf} · {TIPO(ANO_ELEICAO[leg])[p.tipo]}{p.tipo === 'S' && p.ordem ? `, ${p.ordem}º na lista` : ''} · lista {p.fed ? `da ${p.fed}` : `do ${p.p22}`}
          </p>
          <p className="dep__resumo">
            {total > 0
              ? `Esteve em exercício por ${nDias(total)}${p.dt && p.ds ? `: ${nDias(p.dt)} como titular e ${nDias(p.ds)} como suplente` : p.ds ? ', todos como suplente' : ''}, até ${dataLonga(meta.inicio, ult)}.`
              : 'Não esteve em exercício nesta legislatura.'}
          </p>
        </header>
        <section className="dep__linha" aria-labelledby="linha-titulo">
          <div className="vaga-topo">
            <h2 id="linha-titulo" className="secao-titulo">Na Câmara, dia a dia</h2>
            {cadeiras.length > 0 && <MiniConcha total={meta.cadeiras} destaque={cadeiras} rotulo={`Vagas de ${p.nome} na concha: ${linhas.map((l) => l.vaga).filter((x, i, a) => a.indexOf(x) === i).join(', ')}.`} />}
          </div>
          <LinhaTempo trechos={trechos} inicio={meta.inicio} diasTotal={meta.dias_total} diasDados={meta.dias}
            titulo={`Linha do tempo de ${p.nome}: verde como titular, laranja como suplente, tracejado fora da Câmara.`} />
        </section>
        <section className="dep__lista" aria-labelledby="periodos-titulo">
          <h2 id="periodos-titulo" className="secao-titulo">Períodos</h2>
          <ol className="ocupantes">
            {linhas.map((l, i) => (
              <li key={i}>
                <span className="mono">{dataCurta(meta.inicio, l.ini)} a {l.fim >= meta.dias ? 'hoje' : dataCurta(meta.inicio, l.fim)}</span>
                <p>{l.texto}</p>
                <Link href={rota(leg, `/vaga/${l.vaga.toLowerCase()}/`)} className="mono link-sub">vaga {l.vaga}</Link>
              </li>
            ))}
          </ol>
        </section>
        {p.partidos.length > 0 && (
          <section className="dep__partidos" aria-labelledby="partidos-titulo">
            <h2 id="partidos-titulo" className="secao-titulo">Partidos na legislatura</h2>
            <ol className="partidos">
              {p.partidos.map((x, i) => (
                <li key={i}>{x[0]}<span>{dataCurta(meta.inicio, x[1])}</span></li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}
