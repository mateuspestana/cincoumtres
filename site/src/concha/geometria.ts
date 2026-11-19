// Geometria da concha: 513 assentos numa meia-coroa em forma de ∪ (a cúpula côncava da Câmara),
// a borda reta em cima é a régua do tempo, e acima dela fica a faixa de destinos.

export type Slot = { x: number; y: number; t: number; anel: number };

export type Layout = {
  W: number;
  H: number;
  cx: number;
  borda: number;          // y da borda (régua)
  R: number;
  Ri: number;
  passo: number;          // distância entre assentos
  raio: number;           // raio do ponto
  slots: Slot[];          // ordenados da esquerda para a direita (ângulo)
  regua: { x0: number; x1: number; y: number };
  faixa: { base: number; topo: number; rotuloY: number; colunas: number[]; largura: number };
  compacto: boolean;
};

export function calcularLayout(W: number, H: number, n: number): Layout {
  const compacto = W < 640;
  const pad = compacto ? 12 : 24;
  const rotulos = compacto ? 16 : 22;
  // no celular a largura manda: a concha desce para o pé da caixa e a faixa fica com o resto
  const Rw = (W - 2 * pad) / 2;
  const borda = compacto ? Math.round(Math.max(H * 0.36, H - Rw - pad - rotulos)) : Math.round(Math.max(H * 0.34, Math.min(H * 0.4, 250)));
  const R = Math.max(80, Math.min(Rw, H - borda - pad - rotulos));
  const Ri = R * 0.36;
  const cx = W / 2;
  const folga = compacto ? 16 : 22; // espaço sob a régua para os anos

  const area = (Math.PI / 2) * (R * R - Ri * Ri);
  const s0 = Math.sqrt(area / n);
  const nAneis = Math.max(3, Math.round((R - Ri) / s0) + 1);
  const raios = Array.from({ length: nAneis }, (_, i) => Ri + ((R - Ri) * i) / (nAneis - 1));
  // cada anel começa abaixo da faixa dos anos
  const t0 = raios.map((r) => Math.asin(Math.min(0.9, folga / r)));
  const comp = raios.map((r, i) => r * (Math.PI - 2 * t0[i]));
  const total = comp.reduce((a, b) => a + b, 0);
  const bruto = comp.map((c) => (n * c) / total);
  const qtd = bruto.map(Math.floor);
  let falta = n - qtd.reduce((a, b) => a + b, 0);
  bruto.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (falta > 0) { qtd[i]++; falta--; }
  });

  const slots: Slot[] = [];
  raios.forEach((r, i) => {
    const span = Math.PI - 2 * t0[i];
    for (let j = 0; j < qtd[i]; j++) {
      const t = t0[i] + (span * (j + 0.5)) / qtd[i];
      slots.push({ x: cx - Math.cos(t) * r, y: borda + Math.sin(t) * r, t, anel: i });
    }
  });
  slots.sort((a, b) => a.t - b.t || a.anel - b.anel);

  const passo = Math.min(s0, (R - Ri) / (nAneis - 1 || 1));
  const raio = passo * 0.34;
  const x0 = cx - R;
  const x1 = cx + R;
  const base = borda - (compacto ? 58 : 94);
  const nCol = 5;
  const largura = (x1 - x0) / nCol;
  return {
    W, H, cx, borda, R, Ri, passo, raio, slots, compacto,
    regua: { x0, x1, y: borda },
    faixa: {
      base,
      topo: pad + (compacto ? 4 : 8),
      rotuloY: borda - (compacto ? 28 : 54),
      colunas: Array.from({ length: nCol }, (_, i) => x0 + largura * (i + 0.5)),
      largura,
    },
  };
}
