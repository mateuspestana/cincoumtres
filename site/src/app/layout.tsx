import type { Metadata, Viewport } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { Simbolo } from '@/components/Marca';
import { Motion } from '@/components/Motion';
import { Rodape } from '@/components/Rodape';
import { legislaturas, LEG_ATUAL } from '@/lib/dados';
import { SITE } from '@/lib/site';
import { mono, sans } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.nome}: quem ocupa as 513 cadeiras da Câmara`, template: `%s | ${SITE.nome}` },
  description: SITE.descricao,
  alternates: { canonical: './' },
  openGraph: { type: 'website', siteName: SITE.nome, locale: 'pt_BR', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'A concha da Câmara com as 513 cadeiras, titulares em verde e suplentes em laranja' }] },
  twitter: { card: 'summary_large_image' },
  authors: [{ name: 'Matheus C. Pestana' }],
};

export const viewport: Viewport = { themeColor: '#F3EEE4' };

// Antes da primeira pintura: o "escondido até revelar" só vale com JS e com movimento liberado.
// O carregador (os 513 pontos) só roda na home e fora do celular: no telefone, o JS demora a hidratar
// e o carregador viraria espera; lá a concha assenta direto quando os dados chegam.
const flags = `document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion');if(location.pathname!=='/'||matchMedia('(max-width: 767px)').matches)document.documentElement.classList.add('sem-loader')`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: `Ocupação das cadeiras da Câmara dos Deputados, ${LEG_ATUAL}ª legislatura`,
  description: SITE.descricao,
  creator: { '@type': 'Person', name: 'Matheus C. Pestana' },
  publisher: { '@type': 'Organization', name: 'MACAPE Pesquisas e Consultoria em Tecnologia Ltda.', url: 'https://macape.dev' },
  isBasedOn: ['https://dadosabertos.camara.leg.br', 'https://dadosabertos.tse.jus.br'],
  inLanguage: 'pt-BR',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const legs = legislaturas();
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: flags }} />
        <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-NHFTBDF3" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());` }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Pular para o conteúdo</a>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <filter id="duotom" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.071 0.953" />
              <feFuncG type="table" tableValues="0.239 0.933" />
              <feFuncB type="table" tableValues="0.180 0.894" />
            </feComponentTransfer>
          </filter>
        </svg>
        <div id="curtain" aria-hidden="true"><div className="curtain__panel"><Simbolo className="curtain__simbolo" /></div></div>
        <div id="loader" role="status" aria-label="Carregando" suppressHydrationWarning>
          <canvas className="loader__pontos" aria-hidden="true" />
          <div className="loader__inner">
            <span className="loader__nome" data-loader-out>cincoumtrês<i>.</i></span>
            <span className="loader__count" data-loader-out data-loader-count>000</span>
          </div>
          <div className="loader__bar" data-loader-bar />
        </div>
        <script dangerouslySetInnerHTML={{ __html: `if(document.documentElement.classList.contains('sem-loader'))document.getElementById('loader').hidden=true` }} />
        <Cabecalho legs={legs} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Rodape />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <Motion />
      </body>
    </html>
  );
}
