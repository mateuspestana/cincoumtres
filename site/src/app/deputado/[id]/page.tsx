import { Deputado } from '@/views/Deputado';
import { LEG_PADRAO } from '@/lib/legs';
import { idsDeputados, metaDeputado } from '@/lib/metadados';

export const dynamicParams = false;
export const generateStaticParams = () => idsDeputados(LEG_PADRAO).map((id) => ({ id }));

export async function generateMetadata({ params }: PageProps<'/deputado/[id]'>) {
  return metaDeputado(LEG_PADRAO, (await params).id);
}

export default async function Page({ params }: PageProps<'/deputado/[id]'>) {
  return <Deputado leg={LEG_PADRAO} id={(await params).id} />;
}
