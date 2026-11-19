import { Explorar } from '@/views/Explorar';
import { LEGS } from '@/lib/legs';
import { DESC_EXPLORAR, metaPagina } from '@/lib/metadados';

export const dynamicParams = false;
export const generateStaticParams = () => LEGS.map((leg) => ({ leg: String(leg) }));

export async function generateMetadata({ params }: PageProps<'/leg/[leg]/explorar'>) {
  return metaPagina(Number((await params).leg), '/explorar/', 'Explorar', DESC_EXPLORAR);
}

export default async function Page({ params }: PageProps<'/leg/[leg]/explorar'>) {
  return <Explorar leg={Number((await params).leg)} />;
}
