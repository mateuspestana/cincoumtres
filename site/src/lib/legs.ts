// Legislaturas publicadas e rotas. Sem imports de Node: vale para o servidor e para o cliente.
// A padrão mora na raiz do site; as outras, em /leg/<número>/. Quando a 58ª começar, ela vira a padrão.
export const LEGS = [56, 57];
export const LEG_PADRAO = 57;

export const ANO_ELEICAO: Record<number, number> = { 56: 2018, 57: 2022, 58: 2026 };

// Legislaturas só de consulta (home, explorador e método): sem página própria por deputado e por vaga.
// Para dar páginas a uma legislatura que não seja a padrão, criar app/leg/[leg]/deputado/[id] e app/leg/[leg]/vaga/[id].
const SEM_PAGINAS = [56];
export const temPaginas = (leg: number) => !SEM_PAGINAS.includes(leg);

export const rota = (leg: number, caminho: string) => (leg === LEG_PADRAO ? caminho : `/leg/${leg}${caminho}`);

export const legDoCaminho = (caminho: string) => {
  const m = /^\/leg\/(\d+)(\/|$)/.exec(caminho);
  return m ? Number(m[1]) : LEG_PADRAO;
};

export const legInvalida = (leg: number) => !LEGS.includes(leg);
