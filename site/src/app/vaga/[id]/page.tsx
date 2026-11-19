import { VagaPagina } from '@/views/Vaga';
import { LEG_PADRAO } from '@/lib/legs';
import { idsVagas, metaVaga } from '@/lib/metadados';

export const dynamicParams = false;
export const generateStaticParams = () => idsVagas(LEG_PADRAO).map((id) => ({ id }));

export async function generateMetadata({ params }: PageProps<'/vaga/[id]'>) {
  return metaVaga(LEG_PADRAO, (await params).id);
}

export default async function Page({ params }: PageProps<'/vaga/[id]'>) {
  return <VagaPagina leg={LEG_PADRAO} id={(await params).id} />;
}
