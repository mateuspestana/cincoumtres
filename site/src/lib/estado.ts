// Estado de uma vaga num dia: quem ocupa, quem é o dono, se o dono está fora e para onde foi.
// Usado no servidor (páginas estáticas) e no cliente (concha).
import type { Ausencia, Pessoa, Seg, Vaga } from './tipos';

/** Busca binária no primeiro elemento [_, início, fim] que contém o dia. */
function achar<T extends [unknown, number, number, ...unknown[]]>(lista: T[], dia: number): T | null {
  let lo = 0;
  let hi = lista.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const it = lista[m];
    if (dia < it[1]) hi = m - 1;
    else if (dia >= it[2]) lo = m + 1;
    else return it;
  }
  return null;
}

export const ocupante = (v: Vaga, dia: number): Seg | null => achar(v.segs, dia);
export const dono = (v: Vaga, dia: number): number | null => achar(v.donos, dia)?.[0] ?? null;
export const ausencia = (v: Vaga, dia: number): Ausencia | null => achar(v.aus, dia);

export function partidoNoDia(p: Pessoa, dia: number): string {
  return achar(p.partidos, dia)?.[0] ?? p.partidos[p.partidos.length - 1]?.[0] ?? p.p22;
}

/** Motivo da saída -> grupo da faixa de destinos acima da concha. */
export const DESTINO: Record<string, string> = {
  min: 'esp', see: 'gov', sem: 'pre', lic: 'lic', sus: 'lic', out: 'lic',
  ren: 'def', fal: 'def', per: 'def', rec: 'def',
};
export const ORDEM_DESTINOS = ['esp', 'gov', 'pre', 'lic', 'def'] as const;

export const CONDICAO: Record<string, string> = { t: 'titular', s: 'suplente', e: 'suplente efetivado' };
export const CONFIANCA: Record<string, string> = { a: 'confiança alta', m: 'confiança média', b: 'confiança baixa' };

export function contar(vagas: Vaga[], dia: number) {
  let t = 0, s = 0, vaz = 0;
  for (const v of vagas) {
    const o = ocupante(v, dia);
    if (!o) vaz++;
    else if (o[3] === 't') t++;
    else s++;
  }
  return { titulares: t, suplentes: s, vazias: vaz };
}

/** Nome curto de cada regra de ligação (a explicação completa fica em /como-inferimos). */
export const REGRA_CURTA: Record<string, string> = {
  pf: 'saída do titular na janela', pfp: 'saída mais próxima na janela', vt: 'saiu na volta do titular',
  rl: 'remanejado na lista', ss: 'saída de outro suplente', rc: 'recontagem', ef: 'efetivação',
  sd: 'vaga sem eleito empossado', vm: 'vaga livre da mesma lista', vu: 'vaga livre da UF', vl: 'vaga livre', us: 'única saída na UF', vp: 'voltou à própria vaga', vo: 'registro da Câmara com sobreposição',
};
