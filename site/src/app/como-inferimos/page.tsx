import { ComoInferimos } from '@/views/ComoInferimos';
import { LEG_PADRAO } from '@/lib/legs';
import { DESC_COMO, metaPagina } from '@/lib/metadados';

export const metadata = metaPagina(LEG_PADRAO, '/como-inferimos/', 'Como inferimos', DESC_COMO);

export default function Page() {
  return <ComoInferimos leg={LEG_PADRAO} />;
}
