import type { MetadataRoute } from 'next';
import { dados } from '@/lib/dados';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const { pessoas, vagas } = dados();
  const caminhos = ['/', '/explorar/', '/como-inferimos/', ...pessoas.map((p) => `/deputado/${p.id}/`), ...vagas.map((v) => `/vaga/${v.id.toLowerCase()}/`)];
  return caminhos.map((c) => ({ url: `${SITE.url}${c}` }));
}
