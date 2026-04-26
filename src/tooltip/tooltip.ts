import type { TargetInput, TooltipOptions } from './types';

const GAP = 8;

interface ResolvedOpts {
  target?: string | HTMLElement;
  maxWidth: number;
  onOpen?: () => void;
  onClose?: () => void;
}

function normalizeTarget(t: TargetInput): string | HTMLElement {
  if (typeof t === 'string' || t instanceof HTMLElement) return t;
  return t.get(0);
}

export class Tooltip {
  private static _instances = new WeakMap<HTMLElement, Tooltip>();
  private src: HTMLElement;
  private opts: ResolvedOpts;
  private panel: HTMLDivElement | null = null;
  private docDown: ((e: PointerEvent) => void) | null = null;

  constructor(src: HTMLElement, opts: TooltipOptions = {}) {
    this.src = src;
    const { target, ...rest } = opts;
    this.opts = { maxWidth: 280, ...rest, ...(target != null ? { target: normalizeTarget(target) } : {}) };
    Tooltip._instances.set(src, this);
  }

  static from(el: HTMLElement): Tooltip | undefined {
    return Tooltip._instances.get(el);
  }

  setTarget(target: TargetInput): void {
    this.opts.target = normalizeTarget(target);
  }

  isOpen(): boolean {
    return this.panel !== null;
  }

  open(): void {
    if (this.panel) return;

    const targetEl = typeof this.opts.target === 'string'
      ? document.querySelector<HTMLElement>(this.opts.target)
      : this.opts.target;
    if (!targetEl) return;

    const panel = document.createElement('div');
    panel.className = 'dui-tooltip';
    panel.style.maxWidth = `${this.opts.maxWidth}px`;

    const content = document.createElement('div');
    content.className = 'dui-tooltip-content';
    content.textContent = this.src.textContent;

    const arrow = document.createElement('div');
    arrow.className = 'dui-tooltip-arrow';

    panel.append(content, arrow);
    document.body.appendChild(panel);
    this.panel = panel;

    this.place(panel, arrow, targetEl);

    const p = panel;
    this.docDown = (e: PointerEvent) => {
      if (!p.contains(e.target as Node) && !targetEl.contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('pointerdown', this.docDown, { capture: true });

    this.opts.onOpen?.();
  }

  close(): void {
    if (!this.panel) return;
    this.panel.remove();
    this.panel = null;
    if (this.docDown) {
      document.removeEventListener('pointerdown', this.docDown, { capture: true });
      this.docDown = null;
    }
    this.opts.onClose?.();
  }

  destroy(): void {
    Tooltip._instances.delete(this.src);
    this.close();
  }

  private place(panel: HTMLDivElement, arrow: HTMLDivElement, target: HTMLElement): void {
    const tr = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const sx = window.scrollX;
    const sy = window.scrollY;

    panel.style.visibility = 'hidden';
    panel.style.top = '0';
    panel.style.left = '0';
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    panel.style.visibility = '';

    // Compute in viewport coords, then convert to document coords via scroll offsets
    let placement: 'above' | 'below';
    let vy: number;
    if (tr.top >= ph + GAP) {
      placement = 'above';
      vy = tr.top - ph - GAP;
    } else {
      placement = 'below';
      vy = tr.bottom + GAP;
    }

    const targetCenterX = tr.left + tr.width / 2;
    let vx = targetCenterX - pw / 2;
    vx = Math.max(4, Math.min(vw - pw - 4, vx));

    // Arrow: center on target, clamped 8px from panel edges so it stays inside rounded corners
    const arrowHalf = 5;
    const arrowCenter = targetCenterX - vx;
    const arrowLeft = Math.max(arrowHalf + 8, Math.min(pw - arrowHalf - 8, arrowCenter)) - arrowHalf;

    panel.classList.add(`dui-tooltip--${placement}`);
    panel.style.left = `${vx + sx}px`;
    panel.style.top = `${vy + sy}px`;
    arrow.style.left = `${arrowLeft}px`;
  }
}
