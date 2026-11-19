'use client';
// O instrumento completo: régua, busca, UF, arrumação por UF ou por partido na data, atalhos para os
// dias marcantes e a tabela dos suplentes em exercício (a versão em texto da concha).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Concha, type ConchaApi } from '@/concha/Concha';
import type { Modo } from '@/concha/cena';
import { montarFicha } from '@/concha/ficha';
import { CONFIANCA, REGRA_CURTA } from '@/lib/estado';
import { dataCurta, diaDaData, isoDoDia } from '@/lib/tempo';
import type { Dados } from '@/lib/tipos';
import { Contadores, Legenda } from './Capitulos';
import { LinkPagina } from './LinkPagina';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type Salto = { rotulo: string; dia: number };

export function Explorador({ leg, diaPadrao, saltos, ufs }: { leg: number; diaPadrao: number; saltos: Salto[]; ufs: string[] }) {
  const api = useRef<ConchaApi>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [dia, setDia] = useState(diaPadrao);
  const [modo, setModo] = useState<Modo>('uf');
  const [uf, setUf] = useState('');
  const [busca, setBusca] = useState('');
  const pronto = useRef(false);

  // estado inicial pela URL (?dia=AAAA-MM-DD&uf=SP&modo=partido), aplicado quando os dados chegam
  const aoCarregar = (d: Dados) => {
    setDados(d);
    if (pronto.current) return;
    pronto.current = true;
    const q = new URLSearchParams(location.search);
    const iso = q.get('dia');
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      api.current?.irPara(Math.max(0, Math.min(d.meta.dias - 1, diaDaData(d.meta.inicio, iso))), false);
    }
    const u = q.get('uf');
    if (u && ufs.includes(u.toUpperCase())) setUf(u.toUpperCase());
    if (q.get('modo') === 'partido') setModo('partido');
  };

  // URL acompanha o estado, sem empilhar histórico
  useEffect(() => {
    if (!dados || !pronto.current) return;
    const id = setTimeout(() => {
      const q = new URLSearchParams();
      q.set('dia', isoDoDia(dados.meta.inicio, dia));
      if (uf) q.set('uf', uf);
      if (modo === 'partido') q.set('modo', 'partido');
      history.replaceState(history.state, '', `${location.pathname}?${q}`);
    }, 300);
    return () => clearTimeout(id);
  }, [dia, uf, modo, dados]);

  const pessoas = useMemo(() => new Map((dados?.pessoas ?? []).map((p) => [p.id, p])), [dados]);

  useEffect(() => {
    if (!dados) return;
    const b = semAcento(busca.trim());
    if (!uf && !b) { api.current?.setFiltro(null); return; }
    api.current?.setFiltro((vaga, pid) => {
      if (uf && dados.vagas[vaga].uf !== uf) return false;
      if (b) {
        const p = pid != null ? pessoas.get(pid) : undefined;
        return !!p && (semAcento(p.nome).includes(b) || semAcento(p.civil ?? '').includes(b));
      }
      return true;
    });
  }, [uf, busca, dados, pessoas]);

  const linhas = useMemo(() => {
    if (!dados) return [];
    return dados.vagas
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !uf || v.uf === uf)
      .map(({ i }) => montarFicha(dados, pessoas, i, dia, null, null))
      .filter((f) => f.tipo === 'vazia' || (f.cond !== 't'))
      .filter((f) => {
        const b = semAcento(busca.trim());
        return !b || [f.pessoa?.nome, f.outro?.nome].some((x) => x && semAcento(x).includes(b));
      });
  }, [dados, pessoas, dia, uf, busca]);

  const meta = dados?.meta;

  return (
    <div className="explorar">
      <div className="explorar__topo">
        <h1 className="explorar__titulo">Explorar a concha</h1>
        <div className="explorar__contadores"><Contadores dados={dados} dia={dia} /></div>
      </div>
      <div className="explorar__filtros" role="group" aria-label="Filtros">
        <label className="campo" htmlFor="busca-deputado">
          Buscar deputado
          <input id="busca-deputado" aria-label="Buscar deputado" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome" autoComplete="off" />
        </label>
        <label className="campo" htmlFor="filtro-uf">
          UF
          <select id="filtro-uf" aria-label="Filtrar por UF" value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">Todas</option>
            {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <div className="campo">
          Arrumação
          <div className="alternar">
            <button type="button" aria-pressed={modo === 'uf'} onClick={() => setModo('uf')}>Por UF</button>
            <button type="button" aria-pressed={modo === 'partido'} onClick={() => setModo('partido')}>Por partido na data</button>
          </div>
        </div>
      </div>
      <div className="explorar__palco">
        <div className="explorar__concha">
          <Concha
            ref={api}
            leg={leg}
            diaInicial={diaPadrao}
            modo={modo}
            rotulo="Concha da Câmara no dia escolhido. A tabela abaixo lista as mesmas cadeiras em texto."
            aoMudarDia={setDia}
            aoCarregar={aoCarregar}
          />
        </div>
        <aside className="explorar__lado" aria-label="Legenda e atalhos">
          <p className="explorar__lado-titulo">Legenda</p>
          <Legenda />
          <p className="explorar__lado-titulo">Ir para</p>
          <ul className="saltos" aria-label="Ir para um dia marcante">
            {saltos.map((s) => (
              <li key={s.rotulo}><button type="button" onClick={() => api.current?.irPara(s.dia, true)}>{s.rotulo}</button></li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="tabela-wrap">
        <h2 className="tabela-titulo">
          {meta ? `Suplentes e cadeiras vazias em ${dataCurta(meta.inicio, dia)}` : 'Suplentes e cadeiras vazias'}
          {uf && ` (${uf})`}: {linhas.length}
        </h2>
        <table className="tabela">
          <thead>
            <tr><th scope="col">Vaga</th><th scope="col">Quem está</th><th scope="col">Partido</th><th scope="col">Desde</th><th scope="col">No lugar de</th><th scope="col">Motivo</th><th scope="col">Ligação</th></tr>
          </thead>
          <tbody>
            {meta && linhas.map((f) => (
              <tr key={f.vagaId}>
                <td className="mono"><LinkPagina leg={leg} caminho={`/vaga/${f.vagaId.toLowerCase()}/`}>{f.vagaId}</LinkPagina></td>
                <td>{f.pessoa ? <LinkPagina leg={leg} caminho={`/deputado/${f.pessoa.id}/`}>{f.pessoa.nome}</LinkPagina> : <span className="tag tag--m">vazia</span>}
                  {f.cond === 'e' && <span className="tag" style={{ marginLeft: 6 }}>efetivado</span>}</td>
                <td className="mono" data-l="partido">{f.partido ?? ''}</td>
                <td className="mono" data-l="desde">{f.desde != null ? dataCurta(meta.inicio, f.desde) : ''}</td>
                <td data-l="no lugar de">{f.outro ? <LinkPagina leg={leg} caminho={`/deputado/${f.outro.id}/`}>{f.outro.nome}</LinkPagina> : ''}</td>
                <td data-l="motivo">{f.motivo ? meta.motivos[f.motivo] : f.regra ? REGRA_CURTA[f.regra] : ''}</td>
                <td data-l="ligação">{f.conf ? <span className={`tag tag--${f.conf}`}>{CONFIANCA[f.conf].replace('confiança ', '')}</span> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
