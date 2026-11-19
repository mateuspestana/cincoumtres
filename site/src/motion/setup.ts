// Movimento global: roda uma vez no cliente, antes da primeira página.
// Carregador: o contador vai de 000 a 513 e cada ponto que acende é uma cadeira; os pontos formam
// o "513" do logo e, na saída, caem para dentro da página (a concha assenta logo depois).
// Transição: a cortina verde sobe como a régua subindo e desce na entrada da página nova.
import { gsap } from 'gsap';
import { ease, onScroll, setLoaderExit, setLoaderFormat, setTransition } from '@/engine';

const N = 513;
type P = { x: number; y: number; q: number };

function pontosDoNumero(W: number, H: number): { pts: P[]; r: number } {
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const c = off.getContext('2d')!;
  const tam = Math.min(W * 0.34, H * 0.62);
  c.font = `700 ${tam}px ${getComputedStyle(document.documentElement).getPropertyValue('--f-display') || 'sans-serif'}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('513', W / 2, H * 0.46);
  const dados = c.getImageData(0, 0, W, H).data;
  // grade fina sobre a área do texto, depois 513 amostras espaçadas
  let passo = Math.max(3, Math.round(tam / 34));
  let cand: P[] = [];
  for (let tent = 0; tent < 6; tent++) {
    cand = [];
    for (let y = 0; y < H; y += passo) for (let x = 0; x < W; x += passo) {
      if (dados[(y * W + x) * 4 + 3] > 128) cand.push({ x, y, q: 0 });
    }
    if (cand.length >= N * 1.05) break;
    passo = Math.max(2, Math.floor(passo * 0.75));
  }
  const pts: P[] = [];
  for (let i = 0; i < N; i++) {
    const p = cand[Math.floor((i * cand.length) / N)] ?? { x: W / 2, y: H / 2, q: 0 };
    pts.push({ ...p, q: Math.random() });
  }
  pts.sort((a, b) => a.x - b.x || a.y - b.y); // acendem da esquerda para a direita, como a concha
  return { pts, r: Math.max(1.6, Math.sqrt((cand.length * passo * passo) / N) * 0.36) };
}

export function setupMotion() {
  onScroll(({ y }) => document.documentElement.classList.toggle('rolou', y > 8));
  const root = document.getElementById('loader');
  const canvas = root?.querySelector<HTMLCanvasElement>('.loader__pontos');
  let desenho: { pts: P[]; r: number; W: number; H: number; dpr: number } | null = null;
  const ctx = canvas?.getContext('2d') ?? null;

  const preparar = () => {
    if (!canvas || !ctx) return;
    const W = canvas.clientWidth, H = canvas.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    desenho = { ...pontosDoNumero(W, H), W, H, dpr };
  };

  const pintar = (acesos: number, queda = 0) => {
    if (!ctx || !desenho) return;
    const { pts, r, W, H, dpr } = desenho;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < acesos; i++) {
      const p = pts[i];
      const t = Math.max(0, Math.min(1, queda * 1.6 - p.q * 0.6));
      const y = p.y + t * t * H * 0.7;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = i === N - 1 ? '#E36A12' : '#F3EEE4';
      ctx.beginPath();
      ctx.arc(p.x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  setLoaderFormat((p) => {
    if (!desenho) preparar();
    const n = Math.round((p / 100) * N);
    pintar(n);
    return String(n).padStart(3, '0');
  });

  setLoaderExit((el) => {
    const q = { v: 0 };
    return gsap.timeline()
      .to(q, { v: 1, duration: 0.7, ease: 'power2.in', onUpdate: () => pintar(N, q.v) })
      .to(el.querySelectorAll('[data-loader-out]'), { yPercent: -110, duration: 0.5, ease: ease.inOut, stagger: 0.05 }, 0.05)
      .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: ease.inOut }, 0.3);
  });

  setTransition({
    // a cortina sobe como a régua subindo; o desenho do Congresso assenta no meio dela
    leave: (c) => gsap.timeline()
      .set(c, { autoAlpha: 1 })
      .fromTo(c.querySelector('.curtain__panel'), { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: ease.inOut })
      .fromTo(c.querySelector('.curtain__simbolo'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: ease.out }, 0.4),
    enter: (c) => gsap.timeline()
      .to(c.querySelector('.curtain__panel'), { yPercent: -100, duration: 0.8, ease: ease.inOut })
      .set(c, { autoAlpha: 0 }),
  });
}
