// A concha em Canvas 2D. Um driver só (o dia) decide onde cada pessoa está: sentada numa vaga
// (verde titular, laranja suplente) ou fora, na faixa de destinos acima da borda. Um fio liga o dono
// ausente ao suplente que ocupa a vaga dele: contínuo para confiança alta, tracejado para média e baixa.
// O desenho roda no ticker do GSAP (um relógio só) e para quando a concha sai da tela.
import { gsap } from 'gsap';
import { DESTINO, ORDEM_DESTINOS, ausencia, dono, ocupante, partidoNoDia } from '@/lib/estado';
import type { Dados, Pessoa, Seg } from '@/lib/tipos';
import { calcularLayout, type Layout } from './geometria';

export const COR = {
  verde: '#123D2E',
  laranja: '#E36A12',
  tinta: '#0C1F18',
  musgo: '#5B6A61',
  fio: 'rgba(12,31,24,0.16)',
  creme: '#F3EEE4',
};

export type Modo = 'uf' | 'partido';
export type Alvo = { vaga: number | null; pid: number | null; fora: string | null; x: number; y: number };

type Token = {
  pid: number; x: number; y: number; tx: number; ty: number;
  a: number; ta: number; s: number; cor: string; nucleo: boolean;
  vaga: number; fora: string | null; atraso: number;
};
type Fio = { de: number; para: number; conf: string | null; vaga: number; fase: number };

const ROTULO_DESTINO: Record<string, string> = {
  esp: 'Ministérios', gov: 'Governos estaduais', pre: 'Prefeituras de capital', lic: 'Licença', def: 'Saída definitiva',
};
const ROTULO_CURTO: Record<string, string> = {
  esp: 'Ministérios', gov: 'Governos', pre: 'Prefeituras', lic: 'Licença', def: 'Saída def.',
};

export class Cena {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private L!: Layout;
  private dia = 0;
  private modo: Modo = 'uf';
  private pos: number[] = [];               // vaga -> índice do slot
  private tokens = new Map<number, Token>();
  private fios: Fio[] = [];
  private occ: (Seg | null)[] = [];
  private fora: Record<string, number[]> = {};
  private rotulos: { x: number; y: number; texto: string }[] = [];
  private fronteiras: number[] = [];   // ângulos entre grupos (UF ou partido)
  private pessoas: Map<number, Pessoa>;
  private filtro: ((vaga: number, pid: number | null) => boolean) | null = null;
  private destaque: number | null = null;
  private visivel = true;
  private sujo = true;
  private relogio = 0;
  private reduzido: boolean;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private ultimoAlvo: Alvo | null = null;
  private mono = 'monospace';
  private fixa: HTMLCanvasElement | null = null;   // cadeiras e borda, redesenhadas só no resize

  constructor(
    private canvas: HTMLCanvasElement,
    private dados: Dados,
    private eventos: { aoLayout?: (L: Layout) => void; aoMudar?: (dia: number) => void } = {},
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.pessoas = new Map(dados.pessoas.map((p) => [p.id, p]));
    this.reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pos = dados.vagas.map((_, i) => i);
    this.ro = new ResizeObserver(() => this.medir());
    this.ro.observe(canvas.parentElement!);
    this.io = new IntersectionObserver(([e]) => { this.visivel = e.isIntersecting; });
    this.io.observe(canvas);
    this.medir();
    gsap.ticker.add(this.tick);
  }

  destruir() {
    gsap.ticker.remove(this.tick);
    this.ro.disconnect();
    this.io.disconnect();
  }

  get layout() { return this.L; }
  get diaAtual() { return this.dia; }

  private medir() {
    const box = this.canvas.parentElement!.getBoundingClientRect();
    const W = Math.max(280, box.width);
    const H = Math.max(260, box.height);
    this.mono = getComputedStyle(document.documentElement).getPropertyValue('--f-mono').trim() || 'monospace';
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.L = calcularLayout(W, H, this.dados.vagas.length);
    this.fixa = null;
    this.aplicar(true);
    this.eventos.aoLayout?.(this.L);
  }

  setDia(d: number) {
    const dia = Math.max(0, Math.min(this.dados.meta.dias - 1, Math.round(d)));
    if (dia === this.dia) return;
    this.dia = dia;
    this.aplicar();
    this.eventos.aoMudar?.(dia);
  }

  setModo(m: Modo) {
    if (m === this.modo) return;
    this.modo = m;
    this.aplicar();
  }

  setFiltro(f: ((vaga: number, pid: number | null) => boolean) | null) { this.filtro = f; this.sujo = true; }
  setDestaque(v: number | null) { this.destaque = v; this.sujo = true; }

  /** Entrada da página: os pontos assentam em onda, da esquerda para a direita. */
  entrada() {
    if (this.reduzido) return;
    const n = this.L.slots.length;
    for (const t of this.tokens.values()) {
      const ordem = t.fora ? n : this.pos[t.vaga];
      t.atraso = 0.15 + (ordem / n) * 1.1;
      t.a = 0;
      t.s = 0.6;
      t.y = t.ty - 12;
    }
    this.sujo = true;
  }

  private ordenar() {
    const { vagas } = this.dados;
    if (this.modo === 'uf') {
      this.pos = vagas.map((_, i) => i);
      return;
    }
    const chave = vagas.map((v, i) => {
      const o = this.occ[i];
      const pid = o ? o[0] : dono(v, this.dia);
      const p = pid != null ? this.pessoas.get(pid) : undefined;
      return p ? partidoNoDia(p, this.dia) : '~';
    });
    const tam = new Map<string, number>();
    chave.forEach((k) => tam.set(k, (tam.get(k) ?? 0) + 1));
    const ordem = vagas.map((_, i) => i).sort((a, b) =>
      (tam.get(chave[b])! - tam.get(chave[a])!) || chave[a].localeCompare(chave[b]) || a - b);
    ordem.forEach((v, rank) => { this.pos[v] = rank; });
  }

  private aplicar(semAnimar = false) {
    const { vagas } = this.dados;
    const L = this.L;
    const d = this.dia;
    this.occ = vagas.map((v) => ocupante(v, d));
    this.ordenar();

    const vivos = new Set<number>();
    const fora: Record<string, { pid: number; vaga: number }[]> = {};
    ORDEM_DESTINOS.forEach((k) => { fora[k] = []; });
    this.fios = [];

    vagas.forEach((v, i) => {
      const slot = L.slots[this.pos[i]];
      const o = this.occ[i];
      if (o) {
        const t = this.token(o[0], slot.x, slot.y);
        t.tx = slot.x; t.ty = slot.y; t.ta = 1;
        t.cor = o[3] === 't' ? COR.verde : COR.laranja;
        t.nucleo = o[3] === 'e';
        t.vaga = i; t.fora = null;
        vivos.add(o[0]);
      }
      const au = ausencia(v, d);
      if (au) {
        fora[DESTINO[au[3]] ?? 'lic'].push({ pid: au[0], vaga: i });
        if (o && o[3] !== 't') this.fios.push({ de: au[0], para: o[0], conf: o[4], vaga: i, fase: (au[0] % 97) / 97 });
      }
    });

    // faixa de destinos: colunas de pontos que sobem a partir da base
    const passo = L.passo * (L.compacto ? 1.05 : 1.1);
    const larg = L.faixa.largura * 0.78;
    const altura = L.faixa.base - L.faixa.topo;
    this.fora = {};
    ORDEM_DESTINOS.forEach((k, c) => {
      const lista = fora[k].sort((a, b) => this.pos[a.vaga] - this.pos[b.vaga]);
      this.fora[k] = lista.map((f) => f.pid);
      let porLinha = Math.max(3, Math.floor(larg / passo));
      while (Math.ceil(lista.length / porLinha) * passo > altura && porLinha < 40) porLinha++;
      const p = Math.min(passo, larg / porLinha);
      lista.forEach((f, k2) => {
        const col = k2 % porLinha;
        const lin = Math.floor(k2 / porLinha);
        const x = L.faixa.colunas[c] - ((porLinha - 1) / 2) * p + col * p;
        const y = L.faixa.base - lin * p;
        const t = this.token(f.pid, x, y);
        t.tx = x; t.ty = y; t.ta = 1; t.cor = COR.verde; t.nucleo = false;
        t.vaga = f.vaga; t.fora = k;
        vivos.add(f.pid);
      });
    });

    for (const [pid, t] of this.tokens) if (!vivos.has(pid)) t.ta = 0;
    if (semAnimar || this.reduzido) for (const t of this.tokens.values()) { t.x = t.tx; t.y = t.ty; t.a = t.ta; t.s = 1; }

    // rótulos: UFs (ou regiões no celular) e, no modo partido, os blocos maiores
    this.rotulos = [];
    const grupos = new Map<string, number[]>();
    const chaveDoSlot: string[] = new Array(L.slots.length);
    vagas.forEach((v, i) => {
      let k: string;
      if (this.modo === 'uf') k = L.compacto ? this.dados.meta.ufs.find((u) => u.uf === v.uf)!.regiao : v.uf;
      else {
        const o = this.occ[i];
        const pid = o ? o[0] : dono(v, d);
        const p = pid != null ? this.pessoas.get(pid) : undefined;
        k = p ? partidoNoDia(p, d) : '';
      }
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(L.slots[this.pos[i]].t);
      chaveDoSlot[this.pos[i]] = k;
    });
    // fronteiras: onde a chave do grupo muda na ordem dos slots
    this.fronteiras = [];
    for (let j = 1; j < L.slots.length; j++) {
      if (chaveDoSlot[j] !== chaveDoSlot[j - 1]) this.fronteiras.push((L.slots[j].t + L.slots[j - 1].t) / 2);
    }
    const min = this.modo === 'uf' ? 1 : L.compacto ? 18 : 9;
    for (const [k, ts] of grupos) {
      if (!k || ts.length < min) continue;
      const t = ts.reduce((a, b) => a + b, 0) / ts.length;
      const r = L.R + (L.compacto ? 12 : 13);
      const texto = L.compacto && this.modo === 'uf' ? k.replace('Centro-Oeste', 'C.-Oeste') : k;
      this.rotulos.push({ x: L.cx - Math.cos(t) * r, y: L.borda + Math.sin(t) * r + 3, texto });
    }
    this.sujo = true;
  }

  private token(pid: number, x: number, y: number) {
    let t = this.tokens.get(pid);
    if (!t) {
      t = { pid, x, y: y - 10, tx: x, ty: y, a: 0, ta: 1, s: 0.6, cor: COR.verde, nucleo: false, vaga: -1, fora: null, atraso: 0 };
      this.tokens.set(pid, t);
    }
    return t;
  }

  private tick = (time: number, deltaTime: number) => {
    this.relogio = time;
    if (!this.visivel || document.hidden) return;
    const dt = Math.min(0.05, deltaTime / 1000);
    let mexeu = this.sujo || (this.fios.length > 0 && !this.L.compacto && !this.reduzido);
    const k = this.reduzido ? 1 : 1 - Math.exp(-dt * 9);
    const kLonge = this.reduzido ? 1 : 1 - Math.exp(-dt * 4);
    for (const [pid, t] of this.tokens) {
      if (t.atraso > 0) { t.atraso -= dt; mexeu = true; continue; }
      const dx = t.tx - t.x, dy = t.ty - t.y;
      const kk = dx * dx + dy * dy > 1600 ? kLonge : k;
      if (Math.abs(dx) + Math.abs(dy) > 0.05 || Math.abs(t.ta - t.a) > 0.01 || t.s < 0.999) mexeu = true;
      t.x += dx * kk; t.y += dy * kk;
      t.a += (t.ta - t.a) * k;
      t.s += (1 - t.s) * k;
      if (t.ta === 0 && t.a < 0.02) this.tokens.delete(pid);
    }
    if (mexeu) this.desenhar();
    this.sujo = false;
  };

  private desenhar() {
    const { ctx, L } = this;
    const r = L.raio;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);
    const foco = this.destaque;
    const passa = (vaga: number, pid: number | null) =>
      (foco == null || vaga === foco) && (!this.filtro || this.filtro(vaga, pid));

    // cadeiras (anéis) e borda: camada fixa
    if (!this.fixa) this.fixa = this.camadaFixa();
    ctx.drawImage(this.fixa, 0, 0, L.W, L.H);
    // vagas vazias de verdade ganham anel mais forte
    ctx.strokeStyle = COR.laranja;
    ctx.beginPath();
    this.occ.forEach((o, i) => {
      if (o) return;
      const s = L.slots[this.pos[i]];
      ctx.moveTo(s.x + r * 1.15, s.y); ctx.arc(s.x, s.y, r * 1.15, 0, Math.PI * 2);
    });
    ctx.stroke();

    // marcas das fronteiras entre grupos, por fora da concha
    ctx.strokeStyle = COR.musgo;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const t of this.fronteiras) {
      const c = Math.cos(t), sn = Math.sin(t);
      ctx.moveTo(L.cx - c * (L.R + r + 2), L.borda + sn * (L.R + r + 2));
      ctx.lineTo(L.cx - c * (L.R + r + 7), L.borda + sn * (L.R + r + 7));
    }
    ctx.stroke();

    // rótulos da faixa de destinos
    ctx.textAlign = 'center';
    ctx.font = `500 ${L.compacto ? 9 : 11}px ${this.mono}`;
    ORDEM_DESTINOS.forEach((k, c) => {
      const n = this.fora[k]?.length ?? 0;
      ctx.fillStyle = n ? COR.tinta : COR.musgo;
      const nome = ctx.measureText(ROTULO_DESTINO[k]).width <= L.faixa.largura - 10 ? ROTULO_DESTINO[k] : ROTULO_CURTO[k];
      ctx.fillText(nome, L.faixa.colunas[c], L.faixa.rotuloY);
      ctx.fillText(String(n), L.faixa.colunas[c], L.faixa.rotuloY - (L.compacto ? 12 : 14));
    });

    // fios
    const tempo = this.relogio;
    for (const f of this.fios) {
      const a = this.tokens.get(f.de), b = this.tokens.get(f.para);
      if (!a || !b) continue;
      const alfa = Math.min(a.a, b.a) * (passa(f.vaga, f.para) ? 1 : 0.12);
      if (alfa < 0.02) continue;
      const c1y = a.y + (L.borda - a.y) * 0.9 + 30;
      const c2y = b.y - (b.y - L.borda) * 0.6 - 10;
      ctx.strokeStyle = `rgba(227,106,18,${0.42 * alfa})`;
      ctx.lineWidth = foco === f.vaga ? 1.6 : 1;
      ctx.setLineDash(f.conf === 'a' ? [] : [3, 3]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x, c1y, b.x, c2y, b.x, b.y);
      ctx.stroke();
      if (f.conf === 'a' && !this.reduzido && !L.compacto) {
        // pulso lento: um ponto de luz percorre o fio a cada 6 s
        const u = (tempo / 6 + f.fase) % 1;
        const v = 1 - u;
        const px = v * v * v * a.x + 3 * v * v * u * a.x + 3 * v * u * u * b.x + u * u * u * b.x;
        const py = v * v * v * a.y + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * b.y;
        ctx.fillStyle = `rgba(227,106,18,${0.9 * alfa * Math.sin(Math.PI * u)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);

    // pessoas: as assentadas e plenas vão em lote (um fill por cor); o resto, uma a uma
    const lote: Record<string, Token[]> = {};
    const soltos: Token[] = [];
    const nucleos: Token[] = [];
    for (const t of this.tokens.values()) {
      if (t.a < 0.01) continue;
      const ok = passa(t.vaga, t.pid);
      if (ok && t.a > 0.98 && t.s > 0.98 && !(foco != null && t.vaga === foco)) (lote[t.cor] ??= []).push(t);
      else soltos.push(t);
      if (t.nucleo) nucleos.push(t);
    }
    for (const [cor, ts] of Object.entries(lote)) {
      ctx.fillStyle = cor;
      ctx.beginPath();
      for (const t of ts) { ctx.moveTo(t.x + r, t.y); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); }
      ctx.fill();
    }
    for (const t of soltos) {
      ctx.globalAlpha = t.a * (passa(t.vaga, t.pid) ? 1 : 0.16);
      const rr = r * t.s * (foco != null && t.vaga === foco ? 1.35 : 1);
      ctx.fillStyle = t.cor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = COR.verde;
    ctx.beginPath();
    for (const t of nucleos) {
      if (!passa(t.vaga, t.pid)) continue;
      ctx.moveTo(t.x + r * 0.42 * t.s, t.y);
      ctx.arc(t.x, t.y, r * 0.42 * t.s, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    // rótulos da concha (por cima dos pontos, para não sumirem atrás deles)
    ctx.fillStyle = COR.musgo;
    ctx.font = `500 ${L.compacto ? 9 : 10}px ${this.mono}`;
    ctx.textAlign = 'center';
    for (const t of this.rotulos) {
      const m = ctx.measureText(t.texto).width / 2 + 2;
      ctx.fillText(t.texto, Math.min(L.W - m, Math.max(m, t.x)), t.y);
    }

    if (this.ultimoAlvo?.vaga != null) {
      const s = L.slots[this.pos[this.ultimoAlvo.vaga]];
      const t = this.ultimoAlvo.fora && this.ultimoAlvo.pid != null ? this.tokens.get(this.ultimoAlvo.pid) : null;
      const x = t ? t.x : s.x, y = t ? t.y : s.y;
      ctx.strokeStyle = COR.tinta;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private camadaFixa() {
    const L = this.L;
    const c = document.createElement('canvas');
    c.width = Math.round(L.W * this.dpr);
    c.height = Math.round(L.H * this.dpr);
    const g = c.getContext('2d')!;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.lineWidth = 1;
    g.strokeStyle = COR.fio;
    g.beginPath();
    for (const s of L.slots) { g.moveTo(s.x + L.raio, s.y); g.arc(s.x, s.y, L.raio, 0, Math.PI * 2); }
    g.stroke();
    g.strokeStyle = COR.tinta;
    g.beginPath();
    g.moveTo(L.regua.x0, L.borda + 0.5);
    g.lineTo(L.regua.x1, L.borda + 0.5);
    g.stroke();
    return c;
  }

  /** O que está sob o ponteiro: uma pessoa (sentada ou fora) ou uma cadeira vazia. */
  alvo(x: number, y: number): Alvo | null {
    const lim = this.L.passo * 0.75;
    let melhor: Alvo | null = null;
    let dist = lim * lim;
    for (const t of this.tokens.values()) {
      if (t.ta === 0) continue;
      const d2 = (t.x - x) ** 2 + (t.y - y) ** 2;
      if (d2 < dist) { dist = d2; melhor = { vaga: t.vaga, pid: t.pid, fora: t.fora, x: t.x, y: t.y }; }
    }
    if (!melhor) {
      this.occ.forEach((o, i) => {
        if (o) return;
        const s = this.L.slots[this.pos[i]];
        const d2 = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d2 < dist) { dist = d2; melhor = { vaga: i, pid: null, fora: null, x: s.x, y: s.y }; }
      });
    }
    return melhor;
  }

  marcar(a: Alvo | null) { this.ultimoAlvo = a; this.sujo = true; }

  /** Posição na tela de uma vaga (para posicionar a ficha ao navegar pelo teclado). */
  posicaoDaVaga(v: number) { const s = this.L.slots[this.pos[v]]; return { x: s.x, y: s.y }; }
}
