// Dados no cliente: um fetch por legislatura, guardado em memória para as navegações seguintes.
import type { Dados, Meta, Pessoa, Serie, Vaga } from './tipos';

const promessas = new Map<number, Promise<Dados>>();

export function carregarDados(leg: number): Promise<Dados> {
  let p = promessas.get(leg);
  if (!p) {
    const get = <T,>(nome: string) => fetch(`/data/${leg}/${nome}`).then((r) => {
      if (!r.ok) throw new Error(`${nome}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    p = Promise.all([get<Meta>('meta.json'), get<Vaga[]>('vagas.json'), get<Pessoa[]>('pessoas.json'), get<Serie>('serie.json')])
      .then(([meta, vagas, pessoas, serie]) => ({ meta, vagas, pessoas, serie }));
    promessas.set(leg, p);
  }
  return p;
}
