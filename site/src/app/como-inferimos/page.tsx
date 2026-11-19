import type { Metadata } from 'next';
import Link from 'next/link';
import { dados, pessoaPorId } from '@/lib/dados';
import { CONFIANCA } from '@/lib/estado';
import { dataCurta, dataLonga, num } from '@/lib/tempo';

export const metadata: Metadata = {
  title: 'Como inferimos',
  description: 'Como o site decide em que cadeira cada deputado senta e quem entrou no lugar de quem, com as regras, os números e os casos incertos.',
};

const ORDEM = ['vt', 'pf', 'pfp', 'ss', 'rl', 'rc', 'vp', 'ef', 'sd', 'vm', 'vu', 'vl', 'us'];

export default function ComoInferimos() {
  const { meta, vagas } = dados();
  const pessoas = pessoaPorId();
  const n = meta.numeros;
  const porRegra = new Map<string, { conf: string; n: number }>();
  const incertos: { vaga: string; pid: number; ini: number; conf: string; regra: string }[] = [];
  for (const v of vagas) {
    for (const s of v.segs) {
      if (!s[5]) continue;
      const r = porRegra.get(s[5]) ?? { conf: s[4] ?? '', n: 0 };
      r.n++;
      porRegra.set(s[5], r);
      if (s[4] === 'm' || s[4] === 'b') incertos.push({ vaga: v.id, pid: s[0], ini: s[1], conf: s[4], regra: s[5] });
    }
  }
  const pct = ((n.casadas_estudo / n.convocacoes) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return (
    <article className="pagina">
      <header className="pagina__topo">
        <p className="pagina__rotulo">Método</p>
        <h1 className="pagina__titulo entra">Como inferimos quem senta onde</h1>
        <p className="pagina__lede entra entra--2">
          A Câmara publica quando cada deputado entra e sai, mas não diz em que cadeira ele senta nem no lugar de quem.
          As ligações deste site são deduzidas das datas. Esta página explica como.
        </p>
      </header>

      <div className="metodo-grade">
      <div className="prosa">
        <h2>De onde vêm os dados</h2>
        <p>
          Da API de dados abertos da Câmara saem a lista dos {num(n.pessoas)} deputados que passaram pela {meta.leg}ª legislatura
          e o histórico de cada um: posse, licença, afastamento, reassunção, efetivação e troca de partido, com data e hora.
          Das candidaturas do TSE saem o partido ou a federação pela qual cada um concorreu e a ordem na lista de suplentes.
          Os dois se cruzam pelo CPF, que não sai do processamento nem aparece neste site. O corte atual é de {dataLonga(meta.inicio, meta.dias - 1)}.
        </p>

        <h2>O que é uma vaga aqui</h2>
        <p>
          Cada UF tem um número fixo de cadeiras ({meta.cadeiras} no total). Cada titular eleito abre uma vaga e é o dono dela.
          Uma vaga troca de dono quando o suplente é efetivado ou quando uma recontagem ou retotalização põe outra pessoa no lugar.
          Os intervalos são contados por dia: quem sai num dia libera a cadeira para quem entra no mesmo dia.
        </p>
        <p className="aviso">
          <strong>Os números das vagas são nossos.</strong> Códigos como SP-01, RJ-30 ou AL-08 foram criados por este site para
          dar nome a cada cadeira. A Câmara não numera as cadeiras, os lugares no plenário não são fixos e os registros oficiais
          só dizem quem está em exercício e desde quando. Cada vaga daqui é uma reconstrução feita a partir dessas datas.
        </p>

        <h2>Quem entrou no lugar de quem</h2>
        <p>Para cada posse de suplente, as regras são testadas nesta ordem, e a primeira que vale decide:</p>
        <ol>
          <li>se o suplente saiu da Câmara no mesmo dia em que um titular da UF reassumiu, ele estava na vaga desse titular;</li>
          <li>um titular da mesma UF e do mesmo partido ou federação de {meta.leg === 57 ? '2022' : 'eleição'} saiu até 10 dias antes da posse (havendo mais de um, fica a saída mais próxima);</li>
          <li>outro suplente do mesmo partido ou federação saiu até 10 dias antes;</li>
          <li>sem nenhuma saída na janela, o suplente vai para uma vaga livre da mesma lista (confiança média) ou, em último caso, para qualquer vaga livre da UF (confiança baixa).</li>
        </ol>
        <p>
          O partido usado é sempre o da eleição, nunca o atual. A suplência pertence à lista pela qual o titular foi eleito: quem
          saiu do PL para o União continua sendo substituído pelo suplente do PL.
        </p>
        <p>
          Dentro de uma mesma lista os suplentes se revezam pela ordem de votação. Quando um titular volta, quem sai é o suplente
          de pior colocação, que nem sempre é o que entrou no lugar dele. Nesses casos o suplente que fica passa para a vaga
          que acabou de vagar. Isso aconteceu {n.remanejos} vezes.
        </p>
        <p>
          O estudo que deu origem a este site, com a regra das datas sozinha, ligava {n.casadas_estudo} das {n.convocacoes} posses
          de suplente ({pct}%). Com as regras acima, toda posse cai numa vaga, e o grau de certeza fica registrado.
        </p>
      </div>
      <aside className="metodo-grade__lado" aria-label="Ligações por regra">
      <div className="tabela-wrap">
        <h2 className="tabela-titulo">Ligações por regra</h2>
        <table className="tabela">
          <thead><tr><th scope="col">Regra</th><th scope="col">Confiança</th><th scope="col">Casos</th></tr></thead>
          <tbody>
            {ORDEM.filter((k) => porRegra.has(k)).map((k) => (
              <tr key={k}>
                <td>{meta.regras[k]}</td>
                <td data-l="confiança"><span className={`tag tag--${porRegra.get(k)!.conf}`}>{CONFIANCA[porRegra.get(k)!.conf]?.replace('confiança ', '')}</span></td>
                <td className="mono" data-l="casos">{porRegra.get(k)!.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </aside>
      </div>

      {incertos.length > 0 && (
        <div className="tabela-wrap">
          <h2 className="tabela-titulo">Os casos incertos</h2>
          <table className="tabela">
            <thead><tr><th scope="col">Posse</th><th scope="col">Suplente</th><th scope="col">Vaga</th><th scope="col">Confiança</th></tr></thead>
            <tbody>
              {incertos.map((c) => (
                <tr key={`${c.vaga}${c.ini}`}>
                  <td className="mono">{dataCurta(meta.inicio, c.ini)}</td>
                  <td><Link href={`/deputado/${c.pid}/`}>{pessoas.get(c.pid)!.nome}</Link></td>
                  <td className="mono"><Link href={`/vaga/${c.vaga.toLowerCase()}/`}>{c.vaga}</Link></td>
                  <td><span className={`tag tag--${c.conf}`}>{CONFIANCA[c.conf].replace('confiança ', '')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="prosa" style={{ marginTop: 'calc(var(--u) * 6)' }}>
        <h2>Verificações</h2>
        <p>
          O processamento para se alguma destas condições falhar: toda pessoa em exercício está em exatamente uma vaga por dia;
          nenhuma vaga tem duas pessoas no mesmo dia; o número de vagas ocupadas é igual ao de pessoas em exercício em todos os
          {' '}{num(meta.dias)} dias; nenhuma UF passa do seu número de cadeiras. Casos conferidos à mão no histórico da Câmara
          também são testados a cada atualização.
        </p>
        <h2>Limites</h2>
        <p>
          Dentro de cada UF, a ordem das vagas segue a lista partidária do primeiro dono: as cadeiras de um mesmo partido ou
          federação ficam vizinhas na concha. A posição de um ponto não diz onde o deputado senta no plenário.
        </p>
        <p>
          <a href={`/data/${meta.leg}/vagas.csv`} download data-no-transition>Baixe a tabela completa das vagas (CSV)</a>, com
          cada trecho de ocupação, a regra e a confiança.
        </p>
      </div>
    </article>
  );
}
