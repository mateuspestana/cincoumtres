import Link from 'next/link';
import { preload } from 'react-dom';
import { Capitulos, type Passo } from '@/components/Capitulos';
import { ListaTempo, type ItemTempo } from '@/components/ListaTempo';
import { dados, pessoaPorId } from '@/lib/dados';
import { ausencia, partidoNoDia } from '@/lib/estado';
import { rota } from '@/lib/legs';
import { dataLonga, diaDaData, num } from '@/lib/tempo';
import { doEstado, extenso, juntar, NOME_UF } from '@/lib/ufs';

// Os textos dos capítulos são montados a partir dos dados do corte: se a coleta mudar, os números mudam.
function capitulos(leg: number): Passo[] {
  const { meta, vagas, serie } = dados(leg);
  const pessoas = pessoaPorId(leg);
  const ini = meta.inicio;
  const ult = meta.dias - 1;
  const n = meta.numeros;

  const foraNoDia = (d: number) => {
    const g: Record<string, number[]> = {};
    for (const v of vagas) {
      const a = ausencia(v, d);
      if (a) (g[a[3]] ??= []).push(a[0]);
    }
    return g;
  };

  // 1. posse: a vaga que já começou com suplente
  const primeiraSup = vagas.find((v) => v.segs[0] && v.segs[0][1] === 0 && v.segs[0][3] !== 't');
  const sup0 = primeiraSup ? pessoas.get(primeiraSup.segs[0][0])! : null;
  const sup0Fica = primeiraSup && primeiraSup.segs[0][2] >= meta.dias;
  const titulares0 = serie.titulares[0];

  // 2. o dia seguinte
  const f1 = foraNoDia(1);
  const min1 = (f1.min ?? []).map((id) => pessoas.get(id)!.nome);
  const see1 = (f1.see ?? []).map((id) => pessoas.get(id)!);
  const saidas1 = min1.length + see1.length;
  const partes1 = [
    min1.length ? `${extenso(min1.length)} para ministérios (${juntar(min1)})` : '',
    ...see1.map((p) => `${p.nome}, para o governo ${doEstado(p.uf)}`),
  ].filter(Boolean);

  // 3. pico de suplentes
  const fp = foraNoDia(n.pico_dia);
  const conta = (ks: string[]) => ks.reduce((s, k) => s + (fp[k]?.length ?? 0), 0);
  const fracPico = n.pico_suplentes / meta.cadeiras;

  // 4. virada de 2025: renúncias no dia da posse dos prefeitos
  const d2025 = diaDaData(ini, '2025-01-01');
  const ren2025 = vagas.flatMap((v) => v.segs.filter((s) => s[6] === 'ren' && s[2] === d2025)).length;

  // 5. recontagem de 2025
  const limiteRec = meta.leg === 57 ? diaDaData(ini, '2026-01-01') : meta.dias;
  const rec = vagas.flatMap((v) => v.segs.filter((s) => s[5] === 'rc' && s[1] < limiteRec).map(() => v.uf));
  const ufsRec = [...new Set(rec)].sort((a, b) => NOME_UF[a].localeCompare(NOME_UF[b])).map(doEstado);

  // 6. abril de 2026 e 7. janela partidária
  const abril = n.quedas.find((q) => q.dia >= diaDaData(ini, '2026-03-15') && q.dia <= diaDaData(ini, '2026-05-15')) ?? n.quedas[0];
  const jIni = diaDaData(ini, '2026-03-01');
  const jFim = diaDaData(ini, '2026-05-01');
  const chegadas = new Map<string, number>();
  for (const p of pessoas.values()) {
    p.partidos.slice(1).forEach((x) => { if (x[1] >= jIni && x[1] < jFim) chegadas.set(x[0], (chegadas.get(x[0]) ?? 0) + 1); });
  }
  const trocasJanela = [...chegadas.values()].reduce((a, b) => a + b, 0);
  const top = [...chegadas.entries()].sort((a, b) => b[1] - a[1]);
  const empatados = top.filter((t) => t[1] === top[0][1]).map((t) => t[0]);
  const frasePartidos = !top.length ? '' : empatados.length > 1
    ? `${juntar(empatados.map((s) => s.replace('UNIÃO', 'União')))} receberam ${top[0][1]} deputados cada`
    : `o ${empatados[0]} recebeu ${top[0][1]} deputados`;

  // 8. hoje
  const efetivados = vagas.filter((v) => { const s = v.segs.find((x) => x[1] <= ult && x[2] > ult); return s?.[3] === 'e'; }).length;

  const encerrada = meta.dias >= meta.dias_total;
  const passos: Passo[] = [
    { id: 'pico', dia: n.pico_dia, modo: 'uf', data: '', titulo: '', corpo: '' },
    {
      id: 'posse', dia: 0, modo: 'uf', data: dataLonga(ini, 0), titulo: 'A posse',
      corpo: sup0 && primeiraSup
        ? `${num(titulares0)} eleitos tomaram posse nas próprias cadeiras. A 513ª, ${doEstado(primeiraSup.uf)}, começou com um suplente já efetivado: ${sup0.nome}${sup0Fica ? ', que está nela até hoje' : ''}.`
        : `${num(titulares0)} eleitos tomaram posse nas próprias cadeiras.`,
    },
    {
      id: 'auge', dia: n.pico_dia, modo: 'uf', data: dataLonga(ini, n.pico_dia), titulo: 'O dia com mais suplentes',
      corpo: `${n.pico_suplentes} cadeiras estavam com suplentes, ${fracPico > 0.1 ? 'mais de uma em cada dez' : `${Math.round(fracPico * 100)}% do total`}. Fora da Câmara havia ${conta(['lic', 'sus'])} deputados de licença, ${conta(['see'])} secretários de estado, ${conta(['min'])} ministros e ${conta(['sem'])} secretários de capitais.`,
    },
  ];

  // sem saída no dia seguinte à posse (acontece fora da 57ª), o capítulo não tem o que contar
  if (saidas1 > 0) {
    passos.splice(2, 0,
      {
        id: 'dia-seguinte', dia: 1, modo: 'uf', data: dataLonga(ini, 1), titulo: 'No dia seguinte',
        corpo: `${extenso(saidas1).replace(/^./, (c) => c.toUpperCase())} deputados já tinham saído: ${juntar(partes1)}. ${extenso(serie.vazias[1], true).replace(/^./, (c) => c.toUpperCase())} cadeiras ficaram vazias até os suplentes tomarem posse. Quem sai sobe para a faixa de cima, e um fio laranja liga cada um a quem entrou no lugar.`,
      },
    );
  }

  const recontagem: Passo = {
    id: 'recontagem', dia: n.vazias_max_dia, modo: 'uf', data: dataLonga(ini, n.vazias_max_dia), titulo: 'A recontagem',
    corpo: `Uma recontagem de votos determinada pela Justiça Eleitoral trocou ${extenso(rec.length)} deputados ${juntar(ufsRec)}. Entre a saída de uns e a posse de outros, ${extenso(n.vazias_max, true)} cadeiras ficaram vazias, o máximo da legislatura.`,
  };

  // Os capítulos de 2025 e 2026 contam fatos da 57ª. As outras legislaturas ganham capítulos só com os marcos dos dados.
  if (meta.leg === 57) {
    passos.push(
      {
        id: 'prefeitos', dia: d2025, modo: 'uf', data: dataLonga(ini, d2025), titulo: 'A posse dos prefeitos',
        corpo: `No dia em que os prefeitos eleitos em 2024 assumiram, ${extenso(ren2025)} deputados renunciaram ao mandato. Na faixa de cima, eles passam para a coluna da saída definitiva.`,
      },
      recontagem,
      {
        id: 'abril', dia: abril.dia, modo: 'uf', data: dataLonga(ini, abril.dia), titulo: 'A volta de abril',
        corpo: `Quem fosse disputar a eleição de outubro de 2026 precisava deixar ministérios e secretarias até 4 de abril. Os deputados voltaram quase juntos, e ${abril.menos} suplentes saíram da Câmara em um mês.`,
      },
      {
        id: 'janela', de: jIni, dia: jFim - 1, modo: 'partido', data: 'março e abril de 2026', titulo: 'A janela partidária',
        corpo: `Na mesma época, a janela partidária permitiu trocar de legenda sem perder o mandato. Foram ${trocasJanela} trocas em dois meses; ${frasePartidos}. Aqui a concha está arrumada pelo partido de cada um naquele dia.`,
      },
    );
  } else {
    passos.push({
      id: 'vazias', dia: n.vazias_max_dia, modo: 'uf', data: dataLonga(ini, n.vazias_max_dia), titulo: 'O dia com mais cadeiras vazias',
      corpo: `${extenso(n.vazias_max, true).replace(/^./, (c) => c.toUpperCase())} cadeiras ficaram vazias ao mesmo tempo, o máximo da legislatura, até os suplentes tomarem posse.`,
    });
    const queda = n.quedas[0];
    passos.push({
      id: 'queda', dia: queda.dia, modo: 'uf', data: dataLonga(ini, queda.dia), titulo: 'A maior queda',
      corpo: `Em um mês, ${queda.menos} suplentes deixaram a Câmara, a maior queda da legislatura.`,
    });
  }

  passos.push({
    id: 'hoje', dia: ult, modo: 'uf', data: dataLonga(ini, ult), titulo: encerrada ? 'O último dia' : 'Hoje',
    corpo: `${serie.suplentes[ult]} cadeiras ${encerrada ? 'estavam' : 'estão'} com suplentes, ${efetivados} deles já efetivados. Arraste o ponto laranja na borda da concha para ver qualquer dia desde a posse.`,
  });
  return passos;
}

const MOTIVO_GRUPO: Record<string, { k: string; rot: string }> = {
  'Secretário de Estado': { k: 'see', rot: 'secretarias de estado' },
  'Licença (afastamento conjunto)': { k: 'lic', rot: 'licença' },
  'Licença para tratamento de saúde': { k: 'lic', rot: 'licença' },
  'Secretário municipal (capital)': { k: 'sem', rot: 'secretarias de capitais' },
  'Ministro de Estado': { k: 'min', rot: 'ministérios' },
};

export function Home({ leg }: { leg: number }) {
  // os dados da concha descem junto com o HTML, em paralelo ao JS
  for (const f of ['meta', 'vagas', 'pessoas', 'serie']) preload(`/data/${leg}/${f}.json`, { as: 'fetch', crossOrigin: 'anonymous' });
  const { meta, pessoas } = dados(leg);
  const n = meta.numeros;
  const passos = capitulos(leg);
  const ult = meta.dias - 1;

  // faixa de motivos: um ponto por substituição casada
  const grupos = new Map<string, { k: string; rot: string; n: number }>();
  for (const [mot, q] of Object.entries(n.motivos_casados).sort((a, b) => b[1] - a[1])) {
    const g = MOTIVO_GRUPO[mot] ?? { k: 'def', rot: 'renúncia, cassação e outros' };
    const atual = grupos.get(g.rot) ?? { ...g, n: 0 };
    atual.n += q;
    grupos.set(g.rot, atual);
  }
  const ordemGrupos = [...grupos.values()].sort((a, b) => (a.k === 'def' ? 1 : b.k === 'def' ? -1 : b.n - a.n));

  const lista: ItemTempo[] = pessoas
    .filter((p) => p.ds > 0)
    .sort((a, b) => b.ds - a.ds || a.nome.localeCompare(b.nome))
    .slice(0, 10)
    .map((p) => ({ id: p.id, nome: p.nome, uf: p.uf, partido: partidoNoDia(p, ult), dias: p.ds, foto: p.foto }));
  const todos = lista.filter((x) => x.dias >= meta.dias).map((x) => x.nome);

  const hero = (
    <>
      <h1 className="hero__titulo">Quem senta nas <em>513 cadeiras</em> da Câmara, dia a dia.</h1>
      <p className="hero__lede">
        Cada ponto é uma cadeira. Verde é o titular eleito; laranja, o suplente que entrou no lugar dele.
      </p>
      <p className="hero__dica"><i aria-hidden="true" />Na tela, {dataLonga(meta.inicio, n.pico_dia)}. Role para andar no tempo.</p>
    </>
  );

  return (
    <>
      <Capitulos leg={leg} hero={hero} passos={passos} />

      <section className="motivos" aria-labelledby="motivos-titulo">
        <h2 id="motivos-titulo" className="motivos__titulo" data-split="lines">
          <b>{n.executivo}</b> das {n.casadas_estudo} trocas foram para o Executivo
        </h2>
        <p className="motivos__lede" data-reveal="up">
          Cada vez que um titular sai e um suplente entra no lugar dele conta como uma troca. Quem vira secretário, volta e sai
          de novo aparece duas vezes. As {n.casadas_estudo} trocas que conseguimos ligar envolvem {n.pessoas_trocas.titulares} titulares
          e {n.pessoas_trocas.suplentes} suplentes diferentes. O motivo costuma ser um cargo no governo: secretaria de estado,
          secretaria de capital ou ministério, para onde foram {n.pessoas_trocas.titulares_executivo} deputados. Cada ponto
          abaixo é uma troca.
        </p>
        <div className="motivos__faixa" data-reveal="fade">
          <div className="motivos__pontos" aria-hidden="true">
            {ordemGrupos.flatMap((g) => Array.from({ length: g.n }, (_, i) => <span key={`${g.k}${g.rot}${i}`} className={`m-${g.k}`} />))}
          </div>
          <ul className="motivos__grupos">
            {ordemGrupos.map((g) => (
              <li key={g.rot}><b>{g.n}</b><span><i className={`m-${g.k}`} style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 6 }} aria-hidden="true" />{g.rot}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="tempo" aria-labelledby="tempo-titulo">
        <div className="tempo__topo">
          <h2 id="tempo-titulo" className="tempo__titulo" data-split="lines">Os suplentes que mais ficaram</h2>
          <p className="tempo__lede" data-reveal="up">
            Dias em exercício como suplente nesta legislatura, até {dataLonga(meta.inicio, ult)}.
            {todos.length > 0 && ` ${juntar(todos)} ${todos.length > 1 ? 'estiveram' : 'esteve'} na Câmara em todos os dias.`}
          </p>
        </div>
        <ListaTempo leg={leg} itens={lista} max={meta.dias} />
      </section>

      <section className="metodo" aria-labelledby="metodo-titulo">
        <div className="metodo__grade">
          <h2 id="metodo-titulo" className="metodo__titulo" data-split="lines">Como sabemos quem entrou no lugar de quem</h2>
          <div className="metodo__texto" data-reveal="up">
            <p>
              A Câmara registra posses e saídas, mas não diz em que cadeira cada deputado senta nem quem substitui quem.
              A ligação sai das datas: o suplente da mesma UF e do mesmo partido ou federação que toma posse até dez dias
              depois da saída de um titular. Quando um suplente deixa a Câmara no mesmo dia em que um titular volta, isso
              também liga os dois.
            </p>
            <p><Link href={rota(leg, '/como-inferimos/')} className="link-sub">Ver as regras e os casos sem ligação</Link></p>
          </div>
          <ul className="metodo__numeros">
            <li><b>{n.confianca.a ?? 0}</b><span>ligações de confiança alta</span></li>
            <li><b>{(n.confianca.m ?? 0) + (n.confianca.b ?? 0)}</b><span>ligações incertas (fio tracejado)</span></li>
            <li><b>{n.remanejos}</b><span>suplentes remanejados dentro da lista</span></li>
            <li><b>{num(n.pessoas)}</b><span>pessoas passaram pela Câmara</span></li>
          </ul>
        </div>
      </section>

      <section className="chamada" aria-labelledby="chamada-titulo">
        <h2 id="chamada-titulo" className="chamada__titulo" data-split="lines">Escolha um dia<span>.</span></h2>
        <Link href={`${rota(leg, '/explorar/')}?dia=${meta.corte}`} className="cta-link">
          Abrir o explorador<span className="cta-link__ponto" aria-hidden="true" /><span className="cta-link__seta" aria-hidden="true">→</span>
        </Link>
      </section>
    </>
  );
}

