'use client';
// Home: a concha fica fixa e o scroll dos capítulos escreve o dia (o driver do conceito).
import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Concha, type ConchaApi } from '@/concha/Concha';
import type { Modo } from '@/concha/cena';
import { usePage } from '@/engine/next';
import { dataCurta, num } from '@/lib/tempo';
import type { Dados } from '@/lib/tipos';

gsap.registerPlugin(ScrollTrigger);

export type Passo = {
  id: string;
  dia: number;
  de?: number;             // começa neste dia e anda devagar até `dia`
  modo: Modo;
  data: string;
  titulo: string;
  corpo: string;
};

export function Contadores({ dados, dia }: { dados: Dados | null; dia: number }) {
  if (!dados) return <div className="contadores" aria-hidden="true"><p className="contadores__data">&nbsp;</p></div>;
  const s = dados.serie;
  return (
    <div className="contadores">
      <p className="contadores__data">{dataCurta(dados.meta.inicio, dia)}</p>
      <p className="contadores__linha">
        <b>{num(s.titulares[dia])}</b><span>{s.titulares[dia] === 1 ? 'titular' : 'titulares'}</span>
        <b className="c-s">{num(s.suplentes[dia])}</b><span>{s.suplentes[dia] === 1 ? 'suplente' : 'suplentes'}</span>
        <b>{num(s.vazias[dia])}</b><span>{s.vazias[dia] === 1 ? 'vazia' : 'vazias'}</span>
      </p>
    </div>
  );
}

export function Legenda() {
  return (
    <ul className="legenda" aria-label="Legenda">
      <li><i className="l-t" />titular</li>
      <li><i className="l-s" />suplente</li>
      <li><i className="l-e" />suplente efetivado</li>
      <li><i className="l-v" />cadeira vazia</li>
      <li><i className="l-fio" />ligação provável</li>
      <li><i className="l-fio2" />ligação incerta</li>
    </ul>
  );
}

export function Capitulos({ leg, hero, passos }: { leg: number; hero: React.ReactNode; passos: Passo[] }) {
  const api = useRef<ConchaApi>(null);
  const raiz = useRef<HTMLElement>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [dia, setDia] = useState(passos[0].dia);
  const [modo, setModo] = useState<Modo>('uf');
  const seq = useRef<gsap.core.Timeline | null>(null);

  const ativar = (i: number) => {
    const p = passos[i];
    seq.current?.kill();
    setModo(p.modo);
    if (p.de != null) {
      seq.current = gsap.timeline()
        .call(() => api.current?.irPara(p.de!, true))
        .call(() => api.current?.irPara(p.dia, true, 3.4), [], '+=1.1');
    } else {
      api.current?.irPara(p.dia, true);
    }
  };

  usePage(({ intro }) => {
    intro.add(() => api.current?.entrada(), 0);
    const els = raiz.current?.querySelectorAll<HTMLElement>('[data-passo]') ?? [];
    els.forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el.querySelector('.passo__texto') ?? el,
        start: 'top 80%',
        end: 'bottom 20%',
        onToggle: (self) => { if (self.isActive) ativar(i); },
      });
    });
    return () => seq.current?.kill();
  });

  return (
    <section className="capitulos" ref={raiz} aria-label="A legislatura em capítulos">
      <div className="capitulos__palco">
        <div className="capitulos__concha">
          <Concha
            ref={api}
            leg={leg}
            diaInicial={passos[0].dia}
            modo={modo}
            rotulo="A concha da Câmara: 513 pontos, um por cadeira, com a régua do tempo na borda."
            aoMudarDia={setDia}
            aoCarregar={setDados}
          />
        </div>
        <div className="capitulos__painel">
          <Contadores dados={dados} dia={dia} />
        </div>
        <div className="capitulos__legenda">
          <Legenda />
        </div>
      </div>
      <div className="capitulos__passos">
        {passos.map((p, i) => (
          <article key={p.id} className={i === 0 ? 'passo passo--hero' : 'passo'} data-passo={p.id}>
            <div className="passo__texto">
              {i === 0 ? hero : (
                <>
                  <p className="passo__data">{p.data}</p>
                  <h2 className="passo__titulo">{p.titulo}</h2>
                  <p className="passo__corpo">{p.corpo}</p>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
