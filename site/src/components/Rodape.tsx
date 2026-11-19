'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { legDoCaminho, rota } from '@/lib/legs';
import { Simbolo } from './Marca';

export type LegRodape = { leg: number; inicio: string; fim: string; disponivel: boolean; ate: string | null };

export function Rodape({ legs }: { legs: LegRodape[] }) {
  const leg = legDoCaminho(usePathname());
  const atual = legs.find((l) => l.leg === leg);
  return (
    <footer className="rodape">
      <div className="rodape__grade">
        <p className="rodape__titulo">
          {atual?.ate ? `Dados de ${atual.ate}. ` : ''}Atualizado a partir da API de dados abertos da Câmara dos Deputados
          e das candidaturas do TSE.
        </p>
        <ul className="rodape__links">
          <li><Link href={rota(leg, '/explorar/')} className="link-sub">Explorar a concha</Link></li>
          <li><Link href={rota(leg, '/como-inferimos/')} className="link-sub">Como inferimos as ligações</Link></li>
          <li><a href={`/data/${leg}/vagas.csv`} className="link-sub" download data-no-transition>Baixar as vagas (CSV)</a></li>
        </ul>
        <p className="rodape__credito">
          Desenvolvido por Matheus C. Pestana · <a href="https://macape.dev" className="link-sub" target="_blank" rel="noopener">MACAPE Pesquisas e Consultoria em Tecnologia Ltda.</a>
          <br />Fotos: Câmara dos Deputados.
        </p>
        <p className="rodape__legs">
          {legs.map((l, i) => {
            const texto = `${l.leg}ª legislatura, ${l.inicio.slice(0, 4)} a ${l.fim.slice(0, 4)}${l.disponivel ? '' : ` (começa em ${l.inicio.split('-').reverse().join('/')})`}`;
            return (
              <span key={l.leg}>
                {i > 0 && ' · '}
                {l.disponivel && l.leg !== leg ? <Link href={rota(l.leg, '/')} className="link-sub">{texto}</Link> : texto}
              </span>
            );
          })}
        </p>
      </div>
      <Simbolo className="rodape__simbolo" />
    </footer>
  );
}
