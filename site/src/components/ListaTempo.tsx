'use client';
// Lista índice com a foto duotônica seguindo o ponteiro (ou o foco do teclado).
import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { usePage } from '@/engine/next';
import { LinkPagina } from './LinkPagina';

export type ItemTempo = { id: number; nome: string; uf: string; partido: string; dias: number; foto: string | null };

export function ListaTempo({ leg, itens, max }: { leg: number; itens: ItemTempo[]; max: number }) {
  const foto = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState<ItemTempo | null>(null);
  const mover = useRef<((x: number, y: number) => void) | null>(null);

  usePage(() => {
    if (!foto.current || matchMedia('(hover: none)').matches) return;
    const x = gsap.quickTo(foto.current, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(foto.current, 'y', { duration: 0.5, ease: 'power3.out' });
    let primeiro = true;
    mover.current = (px, py) => {
      // na primeira vez a foto nasce no lugar, sem deslizar do canto
      if (primeiro) { gsap.set(foto.current, { x: px + 24, y: py - 230 }); primeiro = false; }
      x(px + 24); y(py - 230);
    };
    return () => { mover.current = null; };
  });

  const mostrar = (it: ItemTempo | null) => {
    if (it && !mover.current) return; // toque: sem foto flutuante
    setAtual(it);
    if (foto.current) gsap.to(foto.current, { autoAlpha: it?.foto ? 1 : 0, scale: it ? 1 : 0.92, duration: 0.35, ease: 'power3.out' });
  };

  return (
    <>
      <ol className="tempo__lista" onPointerMove={(e) => mover.current?.(e.clientX, e.clientY)} onPointerLeave={() => mostrar(null)}>
        {itens.map((it, i) => (
          <li key={it.id} className="tempo__item">
            <LinkPagina
              leg={leg}
              caminho={`/deputado/${it.id}/`}
              onPointerEnter={(e) => { mover.current?.(e.clientX, e.clientY); mostrar(it); }}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                mover.current?.(r.left + r.width * 0.55, r.top + r.height / 2);
                mostrar(it);
              }}
              onBlur={() => mostrar(null)}
            >
              <span className="tempo__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="tempo__nome">{it.nome}</span>
              <span className="tempo__uf">{it.partido}-{it.uf}</span>
              <span className="tempo__barra" aria-hidden="true"><i style={{ width: `${(it.dias / max) * 100}%` }} /></span>
              <span className="tempo__dias">{it.dias.toLocaleString('pt-BR')} dias</span>
            </LinkPagina>
          </li>
        ))}
      </ol>
      <div className="tempo__foto" ref={foto} aria-hidden="true">
        {atual?.foto && <img className="duo" src={atual.foto} alt="" width={152} height={203} />}
      </div>
    </>
  );
}
