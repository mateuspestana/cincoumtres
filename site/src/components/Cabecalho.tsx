'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Marca';

const LINKS = [
  { href: '/explorar/', rotulo: 'Explorar' },
  { href: '/como-inferimos/', rotulo: 'Como inferimos' },
];

export function Cabecalho({ legs }: { legs: { leg: number; disponivel: boolean; inicio: string }[] }) {
  const path = usePathname();
  return (
    <header className="cabecalho">
      <Link href="/" className="cabecalho__marca" aria-label="cincoumtrês, página inicial" aria-current={path === '/' ? 'page' : undefined}>
        <Wordmark />
      </Link>
      <nav aria-label="Principal" className="cabecalho__nav">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="link-nav" aria-current={path.startsWith(l.href) ? 'page' : undefined}>
                <span className="link-nav__texto" data-texto={l.rotulo}>{l.rotulo}</span>
              </Link>
            </li>
          ))}
          <li className="cabecalho__legs" aria-label="Legislatura">
            {legs.map((l) => (
              <span key={l.leg} className={l.disponivel ? 'leg leg--ativa' : 'leg'} title={l.disponivel ? undefined : `Começa em ${l.inicio.split('-').reverse().join('/')}`}>
                {l.leg}ª{!l.disponivel && <span className="sr-only"> (começa em {l.inicio.split('-').reverse().join('/')})</span>}
              </span>
            ))}
          </li>
        </ul>
      </nav>
    </header>
  );
}
