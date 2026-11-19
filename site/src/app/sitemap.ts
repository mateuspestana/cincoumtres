import type { MetadataRoute } from 'next';
import { dados } from '@/lib/dados';
import { LEGS, rota, temPaginas } from '@/lib/legs';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const caminhos = LEGS.flatMap((leg) => {
    const paginas = [rota(leg, '/'), rota(leg, '/explorar/'), rota(leg, '/como-inferimos/')];
    if (!temPaginas(leg)) return paginas;
    const { pessoas, vagas } = dados(leg);
    return [
      ...paginas,
      ...pessoas.map((p) => rota(leg, `/deputado/${p.id}/`)),
      ...vagas.map((v) => rota(leg, `/vaga/${v.id.toLowerCase()}/`)),
    ];
  });
  return caminhos.map((c) => ({ url: `${SITE.url}${c}` }));
}
