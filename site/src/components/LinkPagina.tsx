import Link from 'next/link';
import { rota, temPaginas } from '@/lib/legs';

type Props = Omit<React.ComponentProps<typeof Link>, 'href'> & { leg: number; caminho: string };

// Link para a página de um deputado ou de uma vaga. Nas legislaturas só de consulta, sobra o texto.
export function LinkPagina({ leg, caminho, children, ...props }: Props) {
  if (temPaginas(leg)) return <Link href={rota(leg, caminho)} {...props}>{children}</Link>;
  return <a {...(props as React.ComponentProps<'a'>)}>{children}</a>;
}
