'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { legDoCaminho, rota } from '@/lib/legs';
import { Wordmark } from './Marca';

const LINKS = [
  { caminho: '/explorar/', rotulo: 'Explorar' },
  { caminho: '/como-inferimos/', rotulo: 'Como inferimos' },
];

export function Cabecalho({ legs }: { legs: { leg: number; disponivel: boolean; inicio: string }[] }) {
  const path = usePathname();
  const leg = legDoCaminho(path);
  return (
    <header className="cabecalho">
      <Link href={rota(leg, '/')} className="cabecalho__marca" aria-label="cincoumtrês, página inicial" aria-current={path === rota(leg, '/') ? 'page' : undefined}>
        <Wordmark />
      </Link>
      <nav aria-label="Principal" className="cabecalho__nav">
        <ul>
          {LINKS.map((l) => (
            <li key={l.caminho}>
              <Link href={rota(leg, l.caminho)} className="link-nav" aria-current={path.startsWith(rota(leg, l.caminho)) ? 'page' : undefined}>
                <span className="link-nav__texto" data-texto={l.rotulo}>{l.rotulo}</span>
              </Link>
            </li>
          ))}
          <li className="cabecalho__legs" aria-label="Legislatura">
            {legs.map((l) => l.disponivel ? (
              <Link key={l.leg} href={rota(l.leg, '/')} className={l.leg === leg ? 'leg leg--ativa' : 'leg'} title={`${l.leg}ª legislatura`}
                aria-current={l.leg === leg ? 'true' : undefined} aria-label={`${l.leg}ª legislatura`}>
                {l.leg}ª
              </Link>
            ) : (
              <span key={l.leg} className="leg" title={`Começa em ${l.inicio.split('-').reverse().join('/')}`}>
                {l.leg}ª<span className="sr-only"> (começa em {l.inicio.split('-').reverse().join('/')})</span>
              </span>
            ))}
          </li>
        </ul>
      </nav>
    </header>
  );
}
