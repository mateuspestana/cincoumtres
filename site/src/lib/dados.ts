// Leitura dos dados no build (páginas estáticas). No cliente, use lib/carregar.ts.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Dados, Legislatura, Meta, Pessoa, Serie, Vaga } from './tipos';

export const LEG_ATUAL = Number(process.env.NEXT_PUBLIC_LEG ?? 57);
const PASTA = join(process.cwd(), 'public', 'data');
const cache = new Map<number, Dados>();

const ler = <T,>(leg: number, nome: string): T => JSON.parse(readFileSync(join(PASTA, String(leg), nome), 'utf8'));

export function dados(leg = LEG_ATUAL): Dados {
  let d = cache.get(leg);
  if (!d) {
    d = {
      meta: ler<Meta>(leg, 'meta.json'),
      vagas: ler<Vaga[]>(leg, 'vagas.json'),
      pessoas: ler<Pessoa[]>(leg, 'pessoas.json'),
      serie: ler<Serie>(leg, 'serie.json'),
    };
    cache.set(leg, d);
  }
  return d;
}

export function legislaturas(): Legislatura[] {
  const f = join(PASTA, 'legislaturas.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
}

export const pessoaPorId = (leg = LEG_ATUAL) => new Map(dados(leg).pessoas.map((p) => [p.id, p]));
