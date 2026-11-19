import type { Metadata } from 'next';
import { Home } from '@/views/Home';
import { LEG_PADRAO } from '@/lib/legs';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Page() {
  return <Home leg={LEG_PADRAO} />;
}
