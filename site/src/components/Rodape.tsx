import Link from 'next/link';
import { dados, legislaturas } from '@/lib/dados';
import { dataLonga } from '@/lib/tempo';
import { Simbolo } from './Marca';

export function Rodape() {
  const { meta } = dados();
  const legs = legislaturas();
  return (
    <footer className="rodape">
      <div className="rodape__grade">
        <p className="rodape__titulo">
          Dados de {dataLonga(meta.inicio, meta.dias - 1)}. Atualizado a partir da API de dados abertos da Câmara dos Deputados
          e das candidaturas do TSE.
        </p>
        <ul className="rodape__links">
          <li><Link href="/explorar/" className="link-sub">Explorar a concha</Link></li>
          <li><Link href="/como-inferimos/" className="link-sub">Como inferimos as ligações</Link></li>
          <li><a href={`/data/${meta.leg}/vagas.csv`} className="link-sub" download data-no-transition>Baixar as vagas (CSV)</a></li>
        </ul>
        <p className="rodape__credito">
          Desenvolvido por Matheus C. Pestana · <a href="https://macape.dev" className="link-sub" target="_blank" rel="noopener">MACAPE Pesquisas e Consultoria em Tecnologia Ltda.</a>
          <br />Fotos: Câmara dos Deputados.
        </p>
        <p className="rodape__legs">
          {legs.map((l) => `${l.leg}ª legislatura, ${l.inicio.slice(0, 4)} a ${l.fim.slice(0, 4)}${l.disponivel ? '' : ` (começa em ${l.inicio.split('-').reverse().join('/')})`}`).join(' · ')}
        </p>
      </div>
      <Simbolo className="rodape__simbolo" />
    </footer>
  );
}
