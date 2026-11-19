import { Home } from '@/views/Home';
import { LEGS } from '@/lib/legs';
import { metaPagina } from '@/lib/metadados';

export const dynamicParams = false;
export const generateStaticParams = () => LEGS.map((leg) => ({ leg: String(leg) }));

export async function generateMetadata({ params }: PageProps<'/leg/[leg]'>) {
  return metaPagina(Number((await params).leg), '/', null, null);
}

export default async function Page({ params }: PageProps<'/leg/[leg]'>) {
  return <Home leg={Number((await params).leg)} />;
}
