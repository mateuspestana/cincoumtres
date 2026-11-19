// Texto da ficha de uma vaga ou pessoa num dia (concha, explorador e tabela).
import { ausencia, dono, ocupante, partidoNoDia } from '@/lib/estado';
import type { Dados, Pessoa } from '@/lib/tipos';

export type Ficha = {
  vagaId: string;
  uf: string;
  tipo: 'sentado' | 'fora' | 'vazia';
  pessoa: Pessoa | null;
  partido: string | null;
  cond: 't' | 's' | 'e' | null;
  desde: number | null;
  conf: string | null;
  regra: string | null;
  motivo: string | null;          // por que o dono está fora
  outro: Pessoa | null;           // fora: quem ocupa a vaga; sentado: no lugar de quem
  dono: Pessoa | null;
};

export function montarFicha(d: Dados, pessoas: Map<number, Pessoa>, vaga: number, dia: number, pid: number | null, fora: string | null): Ficha {
  const v = d.vagas[vaga];
  const o = ocupante(v, dia);
  const au = ausencia(v, dia);
  const dn = dono(v, dia);
  const base = { vagaId: v.id, uf: v.uf, dono: dn != null ? pessoas.get(dn) ?? null : null };
  if (fora && pid != null && au) {
    const p = pessoas.get(pid) ?? null;
    return { ...base, tipo: 'fora', pessoa: p, partido: p ? partidoNoDia(p, dia) : null, cond: 't', desde: au[1],
      conf: o?.[4] ?? null, regra: o?.[5] ?? null, motivo: au[3], outro: o ? pessoas.get(o[0]) ?? null : null };
  }
  if (o) {
    const p = pessoas.get(o[0]) ?? null;
    const lugar = o[3] !== 't' && au ? pessoas.get(au[0]) ?? null : null;
    return { ...base, tipo: 'sentado', pessoa: p, partido: p ? partidoNoDia(p, dia) : null, cond: o[3], desde: o[1],
      conf: o[4], regra: o[5], motivo: au?.[3] ?? null, outro: lugar };
  }
  const antes = [...v.segs].reverse().find((s) => s[2] <= dia);
  return { ...base, tipo: 'vazia', pessoa: null, partido: null, cond: null, desde: antes ? antes[2] : null,
    conf: null, regra: null, motivo: au?.[3] ?? null, outro: au ? pessoas.get(au[0]) ?? null : null };
}
