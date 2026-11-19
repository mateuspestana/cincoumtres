import { Explorar } from '@/views/Explorar';
import { LEG_PADRAO } from '@/lib/legs';
import { DESC_EXPLORAR, metaPagina } from '@/lib/metadados';

export const metadata = metaPagina(LEG_PADRAO, '/explorar/', 'Explorar', DESC_EXPLORAR);

export default function Page() {
  return <Explorar leg={LEG_PADRAO} />;
}
