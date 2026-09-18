// Üç katmanlı çizim yüzeyi:
//   paper     — propisi defter zemini, nadiren çizilir
//   committed — biten hamleler
//   live      — aktif hamle + tahmini uç, her frame temizlenir
//
// brief 3: Canvas 2D + desynchronized:true. SVG DOM güncellemesi Pencil hızına yetişmez.
// desynchronized'ın gerçekten verilip verilmediği okunup kaydediliyor (Bölüm 13, Test 2).

export type SurfaceLayers = {
  paper: CanvasRenderingContext2D;
  committed: CanvasRenderingContext2D;
  live: CanvasRenderingContext2D;
};

export class InkSurface {
  readonly host: HTMLElement;
  readonly canvases: HTMLCanvasElement[] = [];
  readonly ctx: SurfaceLayers;
  /** Context desynchronized'ı gerçekten verdi mi. null = okunamadı. */
  readonly desynchronized: boolean | null;

  private observer: ResizeObserver;
  private onResize: (() => void) | null = null;

  private readonly background: string;

  constructor(host: HTMLElement, opts: { desynchronized: boolean; background?: string }) {
    this.background = opts.background ?? '#fbf9f4';
    this.host = host;
    host.classList.add('ink-surface');

    const make = (z: number) => {
      const c = document.createElement('canvas');
      c.style.zIndex = String(z);
      host.appendChild(c);
      this.canvases.push(c);
      const ctx = c.getContext('2d', {
        desynchronized: opts.desynchronized,
        alpha: z > 0,
      });
      if (!ctx) throw new Error('Canvas 2D bağlamı alınamadı');
      return ctx;
    };

    const paper = make(0);
    const committed = make(1);
    const live = make(2);
    this.ctx = { paper, committed, live };

    let granted: boolean | null = null;
    try {
      granted = live.getContextAttributes().desynchronized ?? null;
    } catch {
      granted = null;
    }
    this.desynchronized = granted;

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  get width(): number {
    return this.host.clientWidth;
  }

  get height(): number {
    return this.host.clientHeight;
  }

  /** Yeniden boyutlanınca çağrılır — zemin ve biten hamleler yeniden çizilmeli. */
  setResizeHandler(fn: () => void): void {
    this.onResize = fn;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;

    for (const c of this.canvases) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    for (const ctx of [this.ctx.paper, this.ctx.committed, this.ctx.live]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Zemin katmanı alpha:false ile açıldığı için boyanmazsa SİYAH kalır.
    // drawPaper kullanmayan ekranlar (ör. gecikme testi) da doğru görünsün.
    this.ctx.paper.fillStyle = this.background;
    this.ctx.paper.fillRect(0, 0, w, h);
    this.onResize?.();
  }

  clearLive(): void {
    const { live } = this.ctx;
    live.save();
    live.setTransform(1, 0, 0, 1, 0, 0);
    live.clearRect(0, 0, live.canvas.width, live.canvas.height);
    live.restore();
  }

  clearCommitted(): void {
    const { committed } = this.ctx;
    committed.save();
    committed.setTransform(1, 0, 0, 1, 0, 0);
    committed.clearRect(0, 0, committed.canvas.width, committed.canvas.height);
    committed.restore();
  }

  clearInk(): void {
    this.clearLive();
    this.clearCommitted();
  }

  destroy(): void {
    this.observer.disconnect();
    for (const c of this.canvases) c.remove();
  }
}
