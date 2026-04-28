/*!
 * Devblocks UI — Menu
 *
 * Lightweight cascading menu. Replaces jQuery UI menu for large/deep trees.
 * Parses a nested UL/LI once into a plain data structure, then:
 *   - Renders panels lazily (only the open path is in the DOM)
 *   - Virtualizes any single panel with more than `virtThreshold` items
 *   - Uses one delegated mouseover/click listener per panel
 *   - Positions with fixed coords + viewport-flip; no layout thrash
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import type { MenuItem, MenuOptions } from './types';
import { CHEVRON_RIGHT_SVG } from './icons';
import { parseUl } from './parse';

interface Panel {
  el: HTMLUListElement;
  items: MenuItem[];
  depth: number;
  activeIdx: number;
  virt: boolean;
  visH: number;
  spacerT: HTMLLIElement | null;
  spacerB: HTMLLIElement | null;
}

type ResolvedOpts = Required<Omit<MenuOptions, 'onSelect' | 'onClose' | 'onRenderItem'>> & Pick<MenuOptions, 'onSelect' | 'onClose' | 'onRenderItem'>;

const DEFAULTS: ResolvedOpts = {
  onSelect: null,
  onClose: null,
  onRenderItem: null,
  itemHeight: 28,
  maxHeight: 380,
  virtThreshold: 60,
  openDelay: 80,
  virtBuffer: 6,
  inline: false,
  hoverTrigger: null,
  hoverGroup: null,
  hoverCloseDelay: 150,
};

function makeSpacerLi(): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'dui-menu-spacer';
  li.setAttribute('aria-hidden', 'true');
  return li;
}

export class Menu {
  private static _instances = new WeakMap<HTMLUListElement, Menu>();
  private static _hoverGroups = new Map<string, Set<Menu>>();
  private opts: ResolvedOpts;
  private root: MenuItem[];
  private sourceUl: HTMLUListElement;
  private pnls: Panel[] = [];
  private hoverTimer: number | null = null;
  private hoverCloseTimer: number | null = null;
  private hoverMouseInside = false;
  private triggerEnter: (() => void) | null = null;
  private triggerLeave: (() => void) | null = null;
  private anchor: HTMLElement | null = null;
  private docDown: ((e: PointerEvent) => void) | null = null;
  private docKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(ul: HTMLUListElement, opts: MenuOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    this.root = parseUl(ul);
    this.sourceUl = ul;
    Menu._instances.set(ul, this);
    if (this.opts.hoverTrigger) this._bindHoverTrigger(this.opts.hoverTrigger);
    if (this.opts.hoverGroup) {
      let g = Menu._hoverGroups.get(this.opts.hoverGroup);
      if (!g) { g = new Set(); Menu._hoverGroups.set(this.opts.hoverGroup, g); }
      g.add(this);
    }
    if (this.opts.inline) this.open();
  }

  static from(el: HTMLUListElement): Menu | undefined {
    return Menu._instances.get(el);
  }

  // ── Public API ──────────────────────────────────────────────────────

  open(anchor?: HTMLElement): void {
    this.close();
    this.docKey = (e: KeyboardEvent) => this.onKey(e);
    document.addEventListener('keydown', this.docKey);

    if (this.opts.inline) {
      // For inline menus, clicks outside the panels collapse floating
      // submenus but leave the root panel in place.
      this.docDown = (e: PointerEvent) => {
        if (!this.hitTest(e.target as Node)) {
          while (this.pnls.length > 1) {
            const popped = this.pnls.pop();
            popped?.el.remove();
          }
        }
      };
    } else {
      this.anchor = anchor ?? null;
      this.docDown = (e: PointerEvent) => {
        // Let the trigger's click handler own the toggle; only close on
        // genuine outside clicks (anything that isn't a panel or the anchor).
        if (this.anchor && this.anchor.contains(e.target as Node)) return;
        if (!this.hitTest(e.target as Node)) this.close();
      };
    }

    document.addEventListener('pointerdown', this.docDown, { capture: true });
    this.push(this.root, 0);
  }

  close(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    if (this.hoverCloseTimer !== null) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
    const wasOpen = this.pnls.length > 0;
    for (const p of this.pnls) p.el.remove();
    this.pnls = [];
    if (this.docDown) {
      document.removeEventListener('pointerdown', this.docDown, { capture: true } as EventListenerOptions);
    }
    if (this.docKey) {
      document.removeEventListener('keydown', this.docKey);
    }
    this.docDown = null;
    this.docKey = null;
    if (wasOpen && typeof this.opts.onClose === 'function') this.opts.onClose();
  }

  isOpen(): boolean {
    return this.pnls.length > 0;
  }

  destroy(): void {
    Menu._instances.delete(this.sourceUl);
    if (this.opts.hoverGroup) Menu._hoverGroups.get(this.opts.hoverGroup)?.delete(this);
    if (this.opts.hoverTrigger && this.triggerEnter && this.triggerLeave) {
      this.opts.hoverTrigger.removeEventListener('mouseenter', this.triggerEnter);
      this.opts.hoverTrigger.removeEventListener('mouseleave', this.triggerLeave);
    }
    this.close();
  }

  // ── Panel stack ─────────────────────────────────────────────────────

  private push(items: MenuItem[], depth: number): void {
    while (this.pnls.length > depth) {
      const popped = this.pnls.pop();
      popped?.el.remove();
    }
    const pnl = this.buildPanel(items, depth);
    this.pnls.push(pnl);
    if (this.opts.inline && depth === 0) {
      // Insert the root panel into the document flow right after the source UL.
      this.sourceUl.insertAdjacentElement('afterend', pnl.el);
    } else {
      document.body.appendChild(pnl.el);
      this.place(pnl, depth);
    }
  }

  private buildPanel(items: MenuItem[], depth: number): Panel {
    const o = this.opts;
    const virt = items.length > o.virtThreshold;
    const el = document.createElement('ul');
    el.className = 'dui-menu-panel'
      + (virt ? ' dui-menu-panel-virt' : '')
      + (this.opts.inline && depth === 0 ? ' dui-menu-panel-inline' : '');
    el.setAttribute('role', 'menu');

    const pnl: Panel = {
      el,
      items,
      depth,
      activeIdx: -1,
      virt,
      visH: 0,
      spacerT: null,
      spacerB: null,
    };

    if (virt) {
      const visH = Math.min(items.length * o.itemHeight, o.maxHeight);
      el.style.height = visH + 'px';
      pnl.visH = visH;
      pnl.spacerT = el.appendChild(makeSpacerLi());
      pnl.spacerB = el.appendChild(makeSpacerLi());
      this.renderVirt(pnl);
      el.addEventListener('scroll', () => this.renderVirt(pnl), { passive: true });
    } else {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < items.length; i++) frag.appendChild(this.mkItem(items[i], i));
      el.appendChild(frag);
    }

    el.addEventListener('mouseover', (e) => this.onOver(e as MouseEvent, pnl));
    el.addEventListener('click', (e) => this.onClickItem(e as MouseEvent, pnl));
    if (this.opts.hoverTrigger) {
      el.addEventListener('mouseenter', () => this._hoverIn());
      el.addEventListener('mouseleave', () => this._hoverOut());
    }
    return pnl;
  }

  private mkItem(item: MenuItem, idx: number, virt = false): HTMLLIElement {
    if (item.separator) {
      const li = document.createElement('li');
      li.className = 'dui-menu-separator';
      li.setAttribute('role', 'separator');
      li.dataset['i'] = String(idx);
      if (virt) li.style.height = this.opts.itemHeight + 'px';
      li.appendChild(document.createElement('hr'));
      return li;
    }

    const li = document.createElement('li');
    li.className = 'dui-menu-item' + (item.children ? ' dui-menu-item-has-sub' : '');
    li.setAttribute('role', 'menuitem');
    li.setAttribute('tabindex', '-1');
    li.dataset['i'] = String(idx);

    // Mirror data-* attributes from the source LI. The data-* allowlist is
    // the security boundary — non-data attrs (including any `on*` event
    // handlers from a hostile source) never reach the rendered tree.
    const attrs = item.el.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (a.name.startsWith('data-') && a.name !== 'data-i') {
        li.setAttribute(a.name, a.value);
      }
    }

    const lbl = document.createElement('span');
    lbl.className = 'dui-menu-label';
    lbl.textContent = item.label; // textContent — never innerHTML for user data
    li.appendChild(lbl);

    if (typeof this.opts.onRenderItem === 'function') this.opts.onRenderItem(li, item.el);

    if (item.children) {
      const arrow = document.createElement('span');
      arrow.className = 'dui-menu-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = CHEVRON_RIGHT_SVG; // only innerHTML write; constant string
      li.appendChild(arrow);
    }

    return li;
  }

  // ── Virtual list ────────────────────────────────────────────────────
  // Only ~(visible + 2*buffer) items exist in the DOM at any time.
  // Two sentinel <li.dui-menu-spacer> elements carry the height above/below
  // the render window so scrollTop stays stable.

  private renderVirt(pnl: Panel): void {
    if (!pnl.spacerT || !pnl.spacerB) return;
    const o = this.opts;
    const ih = o.itemHeight;
    const buf = o.virtBuffer;
    const el = pnl.el;
    const st = el.scrollTop;
    const len = pnl.items.length;

    const s = Math.max(0, Math.floor(st / ih) - buf);
    const e2 = Math.min(len - 1, Math.ceil((st + pnl.visH) / ih) + buf);

    // Spacer heights keep total scrollable height = len * ih (constant)
    pnl.spacerT.style.height = (s * ih) + 'px';
    pnl.spacerB.style.height = Math.max(0, (len - 1 - e2) * ih) + 'px';

    const frag = document.createDocumentFragment();
    for (let i = s; i <= e2; i++) {
      const li = this.mkItem(pnl.items[i], i, true);
      if (i === pnl.activeIdx) li.classList.add('dui-menu-item-active');
      frag.appendChild(li);
    }

    // Remove previous window items (between the two sentinels)
    while (pnl.spacerT.nextSibling && pnl.spacerT.nextSibling !== pnl.spacerB) {
      pnl.spacerT.nextSibling.remove();
    }
    el.insertBefore(frag, pnl.spacerB);
  }

  // ── Hover trigger ────────────────────────────────────────────────────

  private _bindHoverTrigger(el: HTMLElement): void {
    this.triggerEnter = () => {
      this._hoverIn();
      if (!this.isOpen()) {
        if (this.opts.hoverGroup) {
          Menu._hoverGroups.get(this.opts.hoverGroup)?.forEach(m => { if (m !== this) m.close(); });
        }
        this.open(el);
      }
    };
    this.triggerLeave = () => this._hoverOut();
    el.addEventListener('mouseenter', this.triggerEnter);
    el.addEventListener('mouseleave', this.triggerLeave);
  }

  private _hoverIn(): void {
    this.hoverMouseInside = true;
    if (this.hoverCloseTimer !== null) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
  }

  private _hoverOut(): void {
    this.hoverMouseInside = false;
    if (this.hoverCloseTimer !== null) clearTimeout(this.hoverCloseTimer);
    this.hoverCloseTimer = window.setTimeout(() => {
      this.hoverCloseTimer = null;
      if (!this.hoverMouseInside) this.close();
    }, this.opts.hoverCloseDelay);
  }

  // ── Event handlers ──────────────────────────────────────────────────

  private onOver(e: MouseEvent, pnl: Panel): void {
    const target = e.target as Element | null;
    const li = target?.closest('.dui-menu-item') as HTMLLIElement | null;
    if (!li || !pnl.el.contains(li)) return;

    const prev = pnl.el.querySelectorAll('.dui-menu-item-active');
    for (let i = 0; i < prev.length; i++) prev[i].classList.remove('dui-menu-item-active');
    li.classList.add('dui-menu-item-active');
    pnl.activeIdx = +(li.dataset['i'] ?? -1);

    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    const item = pnl.items[pnl.activeIdx];

    if (item && item.children) {
      this.hoverTimer = window.setTimeout(() => {
        if (item.children) this.push(item.children, pnl.depth + 1);
      }, this.opts.openDelay);
    } else {
      // Trim deeper panels immediately
      while (this.pnls.length > pnl.depth + 1) {
        const popped = this.pnls.pop();
        popped?.el.remove();
      }
    }
  }

  private _select(renderedLi: HTMLLIElement, sourceLi: HTMLLIElement, e: MouseEvent | KeyboardEvent): void {
    if (typeof this.opts.onSelect === 'function') {
      this.opts.onSelect(renderedLi, sourceLi, e);
    } else {
      const a = sourceLi.querySelector('a');
      if (a) a.click();
    }
  }

  private onClickItem(e: MouseEvent, pnl: Panel): void {
    const target = e.target as Element | null;
    const li = target?.closest('.dui-menu-item') as HTMLLIElement | null;
    if (!li) return;
    const item = pnl.items[+(li.dataset['i'] ?? -1)];
    if (item && !item.children) {
      this._select(li, item.el, e);
      if (this.opts.inline) {
        // Collapse floating submenus but leave the root panel open.
        while (this.pnls.length > 1) {
          const popped = this.pnls.pop();
          popped?.el.remove();
        }
      } else {
        this.close();
      }
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────
  // Esc        — close current panel (or whole menu at depth 0)
  // ArrowLeft  — close current panel (go up one level)
  // ArrowRight — open submenu for active item (if any)
  // Enter      — select leaf item or open submenu
  // ArrowUp/Down, Home, End — navigate within current panel

  private onKey(e: KeyboardEvent): void {
    const depth = this.pnls.length - 1;
    if (depth < 0) return;
    const pnl = this.pnls[depth];

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        if (depth > 0) {
          const popped = this.pnls.pop();
          popped?.el.remove();
        } else if (!this.opts.inline) {
          this.close();
        }
        return;

      case 'ArrowLeft':
        if (depth > 0) {
          e.preventDefault();
          const popped = this.pnls.pop();
          popped?.el.remove();
        }
        return;

      case 'ArrowRight':
      case 'Enter': {
        e.preventDefault();
        const active = pnl.el.querySelector('.dui-menu-item-active') as HTMLLIElement | null;
        if (!active) return;
        const item = pnl.items[+(active.dataset['i'] ?? -1)];
        if (!item) return;
        if (item.children) {
          this.push(item.children, pnl.depth + 1);
        } else {
          this._select(active, item.el, e);
          if (this.opts.inline) {
            while (this.pnls.length > 1) {
              const popped = this.pnls.pop();
              popped?.el.remove();
            }
          } else {
            this.close();
          }
        }
        return;
      }

      case 'ArrowDown': e.preventDefault(); this.navigate(pnl, +1); return;
      case 'ArrowUp':   e.preventDefault(); this.navigate(pnl, -1); return;
      case 'Home':      e.preventDefault(); this.navigate(pnl, 0, true); return;
      case 'End':       e.preventDefault(); this.navigate(pnl, 0, false, true); return;
    }
  }

  private navigate(pnl: Panel, dir: number, home = false, end = false): void {
    const items = pnl.items;
    const len = items.length;
    if (len === 0) return;

    let next: number;
    if (home) {
      next = 0;
      while (next < len - 1 && items[next].separator) next++;
    } else if (end) {
      next = len - 1;
      while (next > 0 && items[next].separator) next--;
    } else {
      const step = dir > 0 ? 1 : -1;
      const cur = pnl.activeIdx < 0 ? (dir > 0 ? -1 : len) : pnl.activeIdx;
      next = cur;
      for (let t = 0; t < len; t++) {
        next = ((next + step) % len + len) % len;
        if (!items[next].separator) break;
      }
    }

    if (items[next]?.separator) return;
    pnl.activeIdx = next;

    if (pnl.virt) {
      const ih = this.opts.itemHeight;
      pnl.el.scrollTop = Math.max(0, next * ih - (pnl.visH / 2) + ih / 2);
      this.renderVirt(pnl);
    } else {
      const prev = pnl.el.querySelectorAll('.dui-menu-item-active');
      for (let i = 0; i < prev.length; i++) prev[i].classList.remove('dui-menu-item-active');
      const target = pnl.el.querySelector(`.dui-menu-item[data-i="${next}"]`) as HTMLLIElement | null;
      if (target) {
        target.classList.add('dui-menu-item-active');
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ── Positioning ─────────────────────────────────────────────────────
  // Panels use position:fixed and append to <body>. Submenus open to the
  // right of the hovered row; flip left/up if needed.

  private place(pnl: Panel, depth: number): void {
    const el = pnl.el;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    el.style.visibility = 'hidden';
    const pw = el.offsetWidth || 200;
    const ph = el.offsetHeight || 100;
    el.style.visibility = '';

    let x: number;
    let y: number;

    if (depth === 0) {
      if (!this.anchor) return;
      const r0 = this.anchor.getBoundingClientRect();
      x = r0.left;
      y = r0.bottom + 2;
      if (y + ph > vh) y = r0.top - ph - 2;
      if (x + pw > vw) x = Math.max(0, vw - pw - 4);
    } else {
      const par = this.pnls[depth - 1];
      const refEl = par.el.querySelector('.dui-menu-item-active') ?? par.el;
      const r1 = refEl.getBoundingClientRect();
      x = r1.right + 2;
      y = r1.top;
      if (x + pw > vw) x = r1.left - pw - 2;
      if (y + ph > vh) y = Math.max(4, vh - ph - 4);
      if (y < 0) y = 4;
    }

    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  private hitTest(target: Node): boolean {
    for (const p of this.pnls) {
      if (p.el.contains(target)) return true;
    }
    return false;
  }
}
