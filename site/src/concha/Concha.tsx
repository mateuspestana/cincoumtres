'use client';
// A concha com a régua na borda. A régua é um <input type="range"> nativo: teclado (setas = 1 dia,
// PageUp/PageDown = 30 dias) e leitor de tela funcionam sem código extra. O ponto laranja do
// wordmark é o cursor do tempo.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { addLoaderTask } from '@/engine';
import { carregarDados } from '@/lib/carregar';
import { CONDICAO, CONFIANCA } from '@/lib/estado';
import { rota, temPaginas } from '@/lib/legs';
import { dataCurta, dataLonga, num } from '@/lib/tempo';
import type { Dados } from '@/lib/tipos';
import { Cena, type Alvo, type Modo } from './cena';
import { montarFicha } from './ficha';
import type { Layout } from './geometria';

export type ConchaApi = {
  irPara: (dia: number, suave?: boolean, duracao?: number) => void;
  setModo: (m: Modo) => void;
  setFiltro: (f: ((vaga: number, pid: number | null) => boolean) | null) => void;
  setDestaque: (v: number | null) => void;
  entrada: () => void;
  dia: () => number;
};

type Props = {
  leg: number;
  diaInicial: number;
  modo?: Modo;
  interativa?: boolean;
  rotulo: string;
  aoMudarDia?: (dia: number) => void;
  aoSelecionar?: (vaga: number | null) => void;
  aoCarregar?: (d: Dados) => void;
  className?: string;
};

export const Concha = forwardRef<ConchaApi, Props>(function Concha(
  { leg, diaInicial, modo = 'uf', interativa = true, rotulo, aoMudarDia, aoSelecionar, aoCarregar, className }, ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cena = useRef<Cena | null>(null);
  const proxy = useRef({ d: diaInicial });
  const tween = useRef<gsap.core.Tween | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [dia, setDia] = useState(diaInicial);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [fixo, setFixo] = useState(false);
  const [falado, setFalado] = useState('');
  const fixoRef = useRef(false);
  fixoRef.current = fixo;
  const callbacks = useRef({ aoMudarDia, aoSelecionar });
  callbacks.current = { aoMudarDia, aoSelecionar };

  useEffect(() => {
    let vivo = true;
    const p = carregarDados(leg);
    addLoaderTask(p);
    p.then((d) => { if (vivo) { setDados(d); aoCarregar?.(d); } });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg]);

  useEffect(() => {
    if (!dados || !canvas.current) return;
    const c = new Cena(canvas.current, dados, {
      aoLayout: (L) => setLayout({ ...L }),
      aoMudar: (d) => {
        setDia(d);
        callbacks.current.aoMudarDia?.(d);
        if (!fixoRef.current) { setAlvo(null); cena.current?.marcar(null); }
      },
    });
    c.setDia(proxy.current.d);
    // a cena começa no dia 0 e não avisa quando o pedido também é o dia 0: sincroniza à mão
    setDia(c.diaAtual);
    callbacks.current.aoMudarDia?.(c.diaAtual);
    c.setModo(modo);
    cena.current = c;
    return () => { c.destruir(); cena.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  useEffect(() => { cena.current?.setModo(modo); }, [modo]);

  const irPara = useCallback((d: number, suave = true, duracao?: number) => {
    tween.current?.kill();
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!suave || reduz || !cena.current) {
      proxy.current.d = d;
      cena.current?.setDia(d);
      if (!cena.current) {
        setDia(d);
        callbacks.current.aoMudarDia?.(d);
      }
      return;
    }
    const delta = Math.abs(d - proxy.current.d);
    tween.current = gsap.to(proxy.current, {
      d, duration: duracao ?? Math.min(2.4, Math.max(0.7, delta / 380)), ease: duracao ? 'power1.inOut' : 'expo.inOut',
      onUpdate: () => cena.current?.setDia(proxy.current.d),
    });
  }, []);

  useImperativeHandle(ref, () => ({
    irPara,
    setModo: (m) => cena.current?.setModo(m),
    setFiltro: (f) => cena.current?.setFiltro(f),
    setDestaque: (v) => cena.current?.setDestaque(v),
    entrada: () => cena.current?.entrada(),
    dia: () => proxy.current.d,
  }), [irPara]);

  // leitor de tela: resumo do dia, sem disparar a cada quadro do arraste
  useEffect(() => {
    if (!dados) return;
    const id = setTimeout(() => {
      const s = dados.serie;
      const pl = (n: number, um: string, varios: string) => `${num(n)} ${n === 1 ? um : varios}`;
      setFalado(`${dataLonga(dados.meta.inicio, dia)}: ${pl(s.titulares[dia], 'titular', 'titulares')}, ${pl(s.suplentes[dia], 'suplente', 'suplentes')} e ${pl(s.vazias[dia], 'cadeira vazia', 'cadeiras vazias')}.`);
    }, 450);
    return () => clearTimeout(id);
  }, [dia, dados]);

  const pessoas = useMemo(() => new Map((dados?.pessoas ?? []).map((p) => [p.id, p])), [dados]);
  const ficha = useMemo(() => (dados && alvo?.vaga != null ? montarFicha(dados, pessoas, alvo.vaga, dia, alvo.pid, alvo.fora) : null),
    [dados, pessoas, alvo, dia]);

  const local = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const mover = (e: React.PointerEvent) => {
    if (!interativa || !cena.current || fixo || e.pointerType === 'touch') return;
    const { x, y } = local(e);
    const a = cena.current.alvo(x, y);
    setAlvo(a);
    cena.current.marcar(a);
    canvas.current!.style.cursor = a ? 'pointer' : '';
  };
  const sair = () => {
    if (fixo || !cena.current) return;
    setAlvo(null);
    cena.current.marcar(null);
  };
  const clicar = (e: React.PointerEvent) => {
    if (!interativa || !cena.current) return;
    const { x, y } = local(e);
    const a = cena.current.alvo(x, y);
    setAlvo(a);
    setFixo(!!a);
    cena.current.marcar(a);
    callbacks.current.aoSelecionar?.(a?.vaga ?? null);
  };
  const fechar = () => {
    setFixo(false);
    setAlvo(null);
    cena.current?.marcar(null);
    callbacks.current.aoSelecionar?.(null);
  };

  const meta = dados?.meta;
  const s = dados?.serie;
  const R = layout?.regua;
  const fracDados = meta ? (meta.dias - 1) / (meta.dias_total - 1) : 1;
  const anos = useMemo(() => {
    if (!meta) return [];
    const ini = Date.parse(`${meta.inicio}T00:00:00Z`);
    const out: { ano: number; frac: number }[] = [];
    for (let a = Number(meta.inicio.slice(0, 4)); a <= Number(meta.fim.slice(0, 4)); a++) {
      const d = Math.round((Date.UTC(a, 0, 1) - ini) / 86_400_000);
      out.push({ ano: a, frac: Math.max(0, d) / (meta.dias_total - 1) });
    }
    return out;
  }, [meta]);
  const area = useMemo(() => {
    if (!s || !meta) return '';
    const max = Math.max(...s.suplentes);
    const pts = s.suplentes.map((v, i) => `${((i / (meta.dias_total - 1)) * 1000).toFixed(1)},${(100 - (v / max) * 100).toFixed(1)}`);
    return `M0,100 L${pts.join(' L')} L${(((s.suplentes.length - 1) / (meta.dias_total - 1)) * 1000).toFixed(1)},100 Z`;
  }, [s, meta]);

  const fichaPos = alvo && layout ? {
    left: Math.min(layout.W - 300, Math.max(8, alvo.x + 18)),
    top: alvo.y > layout.H * 0.6 ? Math.max(8, alvo.y - 190) : alvo.y + 18,
  } : null;

  return (
    <div className={`concha ${className ?? ''}`} data-pronta={dados ? '' : undefined}>
      <div className="concha__palco">
        <canvas
          ref={canvas}
          role="img"
          aria-label={rotulo}
          onPointerMove={mover}
          onPointerLeave={sair}
          onPointerDown={clicar}
        />
        {!dados && <div className="concha__espera" aria-hidden="true" />}
        {R && meta && s && (
          <div className="regua" style={{ left: R.x0, width: R.x1 - R.x0, top: R.y }}>
            <svg className="regua__area" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
              <path d={area} />
            </svg>
            <div className="regua__futuro" style={{ left: `${fracDados * 100}%` }} aria-hidden="true" />
            <ol className="regua__anos" aria-hidden="true">
              {anos.map((a) => (
                <li key={a.ano} style={{ left: `${a.frac * 100}%` }}>{a.ano}</li>
              ))}
            </ol>
            <input
              className="regua__input"
              type="range"
              min={0}
              max={meta.dias - 1}
              step={1}
              value={dia}
              style={{ width: `${fracDados * 100}%` }}
              aria-label="Dia da legislatura"
              aria-valuetext={dataLonga(meta.inicio, dia)}
              onChange={(e) => irPara(Number(e.target.value), false)}
            />
            <output className="regua__data" style={{ left: `${(dia / (meta.dias_total - 1)) * 100}%`, translate: `${-Math.min(100, Math.max(0, (dia / (meta.dias - 1)) * 100))}% 0` }} aria-hidden="true">
              {dataCurta(meta.inicio, dia)}
            </output>
          </div>
        )}
        {ficha && fichaPos && (
          <div className="ficha" style={fichaPos} role={fixo ? 'dialog' : undefined} aria-label={fixo ? `Vaga ${ficha.vagaId}` : undefined}>
            <p className="ficha__vaga">vaga {ficha.vagaId}</p>
            {ficha.pessoa ? (
              <>
                <p className="ficha__nome">{ficha.pessoa.nome}</p>
                <p className="ficha__meta">
                  {ficha.partido}-{ficha.uf} · {ficha.tipo === 'fora' ? 'fora da Câmara' : CONDICAO[ficha.cond ?? 't']}
                </p>
                {ficha.tipo === 'fora' && meta && (
                  <p>Desde {dataCurta(meta.inicio, ficha.desde ?? 0)}: {meta.motivos[ficha.motivo ?? 'out']?.toLowerCase()}.
                    {ficha.outro && <> Na vaga: {ficha.outro.nome}.</>}</p>
                )}
                {ficha.tipo === 'sentado' && meta && ficha.desde != null && (
                  <p>Na vaga desde {dataCurta(meta.inicio, ficha.desde)}.
                    {ficha.outro && <> No lugar de {ficha.outro.nome} ({meta.motivos[ficha.motivo ?? 'out']?.toLowerCase()}).</>}</p>
                )}
                {ficha.conf && ficha.tipo === 'sentado' && ficha.cond !== 't' && (
                  <p className={`ficha__conf ficha__conf--${ficha.conf}`}>Ligação inferida, {CONFIANCA[ficha.conf]}.</p>
                )}
              </>
            ) : (
              <>
                <p className="ficha__nome">Cadeira vazia</p>
                {meta && ficha.desde != null && <p>Desde {dataCurta(meta.inicio, ficha.desde)}.</p>}
              </>
            )}
            {fixo && (
              <div className="ficha__acoes">
                {temPaginas(leg) && ficha.pessoa && <Link href={rota(leg, `/deputado/${ficha.pessoa.id}/`)} aria-label={`Página de ${ficha.pessoa.nome}`}>Página do deputado</Link>}
                {temPaginas(leg) && <Link href={rota(leg, `/vaga/${ficha.vagaId.toLowerCase()}/`)}>Linha da vaga</Link>}
                <button type="button" onClick={fechar}>Fechar</button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{falado}</p>
    </div>
  );
});
