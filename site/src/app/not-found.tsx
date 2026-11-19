import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cadeira vaga: página não encontrada' };

export default function NaoEncontrada() {
  return (
    <section className="vazia" aria-labelledby="vazia-titulo">
      <div>
        <div className="vazia__cadeira" aria-hidden="true" />
        <h1 id="vazia-titulo" className="vazia__titulo">Esta cadeira está vaga.</h1>
        <p>A página que você procurou não existe ou mudou de endereço.</p>
        <Link href="/" className="cta-link">
          Voltar para a concha<span className="cta-link__ponto" aria-hidden="true" /><span className="cta-link__seta" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
