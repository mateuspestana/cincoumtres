// Formato dos arquivos em public/data/<leg>/ (gerados por pipeline/exportar.py).
// Dias são inteiros a partir da posse (dia 0) e todo intervalo é meio-aberto [início, fim).

export type Cond = 't' | 's' | 'e';
export type Conf = 'a' | 'm' | 'b';
/** [pessoa, início, fim, condição, confiança, regra, motivo da saída] */
export type Seg = [number, number, number, Cond, Conf | null, string | null, string | null];
/** [pessoa, início, fim] */
export type Dono = [number, number, number];
/** [pessoa, início, fim, motivo] : o dono está fora da cadeira */
export type Ausencia = [number, number, number, string];

export type Vaga = { id: string; uf: string; n: number; donos: Dono[]; segs: Seg[]; aus: Ausencia[] };

export type Pessoa = {
  id: number;
  nome: string;
  civil: string | null;
  uf: string;
  foto: string | null;
  sexo: string;
  tipo: 'T' | 'S' | 'J';
  p22: string;
  ch: string;
  fed: string | null;
  ordem: number | null;
  sit: string;
  raca: string;
  genero: string;
  partidos: [string, number, number][];
  dt: number;
  ds: number;
};

export type Serie = {
  titulares: number[];
  suplentes: number[];
  vazias: number[];
  fora: Record<string, number[]>;
};

export type Meta = {
  leg: number;
  inicio: string;
  fim: string;
  corte: string;
  dias: number;
  dias_total: number;
  cadeiras: number;
  ufs: { uf: string; regiao: string; cadeiras: number }[];
  regioes: string[];
  regras: Record<string, string>;
  motivos: Record<string, string>;
  destinos: Record<string, string>;
  fusoes: Record<string, string>;
  federacoes: Record<string, string>;
  numeros: {
    pessoas: number;
    titulares_originais: number;
    suplentes_que_exerceram: number;
    convocacoes: number;
    casadas_estudo: number;
    motivos_casados: Record<string, number>;
    executivo: number;
    pessoas_trocas: { titulares: number; suplentes: number; titulares_executivo: number };
    pico_suplentes: number;
    pico_dia: number;
    suplentes_no_corte: number;
    vazias_max: number;
    vazias_max_dia: number;
    quedas: { dia: number; menos: number }[];
    efetivados: number;
    judiciais: number;
    trocaram_partido: number;
    trocas_partido: number;
    trocas_janela: number;
    segmentos: number;
    confianca: Record<Conf, number>;
    remanejos: number;
  };
  gerado_em: string;
  fontes: string[];
};

export type Legislatura = { leg: number; inicio: string; fim: string; disponivel: boolean };

export type Dados = { meta: Meta; vagas: Vaga[]; pessoas: Pessoa[]; serie: Serie };
