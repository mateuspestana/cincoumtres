import { ComoInferimos } from '@/views/ComoInferimos';
import { LEGS } from '@/lib/legs';
import { DESC_COMO, metaPagina } from '@/lib/metadados';

export const dynamicParams = false;
export const generateStaticParams = () => LEGS.map((leg) => ({ leg: String(leg) }));

export async function generateMetadata({ params }: PageProps<'/leg/[leg]/como-inferimos'>) {
  return metaPagina(Number((await params).leg), '/como-inferimos/', 'Como inferimos', DESC_COMO);
}

export default async function Page({ params }: PageProps<'/leg/[leg]/como-inferimos'>) {
  return <ComoInferimos leg={Number((await params).leg)} />;
}
