export const NOME_UF: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};
// "o governo de São Paulo", "o governo do Rio de Janeiro", "o governo da Bahia"
const DA = new Set(['BA', 'PB']);
const DO = new Set(['AC', 'AM', 'AP', 'CE', 'DF', 'ES', 'MA', 'PA', 'PI', 'PR', 'RJ', 'RN', 'RS', 'TO']);
export const doEstado = (uf: string) => `${DA.has(uf) ? 'da' : DO.has(uf) ? 'do' : 'de'} ${NOME_UF[uf]}`;

/** "A, B e C" */
export const juntar = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

const EXTENSO = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
export const extenso = (n: number, fem = false) => {
  if (n > 10) return n.toLocaleString('pt-BR');
  if (fem && n === 1) return 'uma';
  if (fem && n === 2) return 'duas';
  return EXTENSO[n];
};
