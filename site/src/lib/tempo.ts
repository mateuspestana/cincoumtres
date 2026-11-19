// Datas: o dia 0 é a posse. Tudo em UTC para não depender do fuso de quem abre a página.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIA_MS = 86_400_000;

const base = (inicio: string) => Date.parse(`${inicio}T00:00:00Z`);

export const dataDoDia = (inicio: string, dia: number) => new Date(base(inicio) + dia * DIA_MS);

export function diaDaData(inicio: string, iso: string) {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - base(inicio)) / DIA_MS);
}

export function isoDoDia(inicio: string, dia: number) {
  return dataDoDia(inicio, dia).toISOString().slice(0, 10);
}

/** "24 de julho de 2024" */
export function dataLonga(inicio: string, dia: number) {
  const d = dataDoDia(inicio, dia);
  const n = d.getUTCDate();
  return `${n === 1 ? '1º' : n} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** "24 jul 2024" */
export function dataCurta(inicio: string, dia: number) {
  const d = dataDoDia(inicio, dia);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES_CURTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "jul 2024" */
export function mesAno(inicio: string, dia: number) {
  const d = dataDoDia(inicio, dia);
  return `${MESES_CURTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Dias corridos em texto: "1 dia", "185 dias", "3 anos e 4 meses" fica para quem chama. */
export const nDias = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'dia' : 'dias'}`;

export const num = (n: number) => n.toLocaleString('pt-BR');
