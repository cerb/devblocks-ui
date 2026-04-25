/*!
 * Devblocks UI — SelectMenu
 *
 * Wraps a <select> element with a styled trigger and floating panel,
 * replacing the native browser UI. Manages the underlying <select> value
 * for form submission. Supports type-to-filter, custom item rendering via
 * onRender, and virtualizes panels with more than virtThreshold options.
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import type { SelectMenuOptions } from './types';
import { CHEVRON_DOWN_SVG, SEARCH_SVG } from './icons';

type ResolvedOpts = Required<Omit<SelectMenuOptions, 'onSelect' | 'onRender'>>
  & Pick<SelectMenuOptions, 'onSelect' | 'onRender'>;

let _uid = 0;

const DEFAULTS: ResolvedOpts = {
  onSelect:      null,
  onRender:      null,
  itemHeight:    28,
  maxHeight:     300,
  virtThreshold: 60,
  virtBuffer:    6,
  placeholder:   '',
};

function makeSpacerLi(): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'dui-menu-spacer';
  li.setAttribute('aria-hidden', 'true');
  return li;
}

export class SelectMenu {
  private opts: ResolvedOpts;
  private select: HTMLSelectElement;
  private uid: number;

  private trigger: HTMLDivElement;
  private triggerText: HTMLSpanElement;

  private panel: HTMLDivElement | null = null;
  private filterRow: HTMLDivElement | null = null;
  private filterQuery: HTMLSpanElement | null = null;
  private list: HTMLUListElement | null = null;

  // Virtual list state — mirrors the two-spacer pattern from Menu
  private spacerT: HTMLLIElement | null = null;
  private spacerB: HTMLLIElement | null = null;
  private virt = false;
  private visH = 0;

  private filteredItems: HTMLOptionElement[] = [];
  private activeIdx = -1;
  private filterStr = '';

  private docDown: ((e: PointerEvent) => void) | null = null;
  private docKey: ((e: KeyboardEvent) => void) | null = null;
  private reposition: (() => void) | null = null;
  private readonly triggerClick: () => void;

  constructor(select: HTMLSelectElement, opts: SelectMenuOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    this.select = select;
    this.uid = _uid++;

    select.classList.add('dui-selectmenu-source');

    const trigger = document.createElement('div');
    trigger.className = 'dui-selectmenu';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `dui-sm-${this.uid}`);
    trigger.setAttribute('tabindex', '0');
    if (select.disabled) trigger.setAttribute('aria-disabled', 'true');

    const text = document.createElement('span');
    text.className = 'dui-selectmenu-text';
    trigger.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'dui-selectmenu-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = CHEVRON_DOWN_SVG; // only innerHTML write; constant SVG string

    trigger.appendChild(chevron);

    this.trigger = trigger;
    this.triggerText = text;

    select.insertAdjacentElement('afterend', trigger);

    this.triggerClick = () => {
      if (this.isOpen()) this.close();
      else if (!this.select.disabled) this.open();
    };
    trigger.addEventListener('click', this.triggerClick);

    // Open on keyboard when trigger is focused and panel is closed
    trigger.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.isOpen()) return; // docKey handles all keys while panel is open
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.select.disabled) this.open();
      }
    });

    this.syncTriggerText();
  }

  // ── Public API ──────────────────────────────────────────────────────

  open(): void {
    if (this.isOpen()) return;

    this.filterStr = '';
    this.trigger.setAttribute('aria-expanded', 'true');
    this.trigger.classList.add('dui-selectmenu--open');

    // buildPanel populates filteredItems via rebuildList and positions the panel
    this.buildPanel();

    // Scroll to and highlight the currently selected item
    const selIdx = this.filteredItems.findIndex(o => o.selected);
    if (selIdx >= 0) this.setActive(selIdx, true);

    this.docDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (this.trigger.contains(t)) return; // trigger's own click handles the toggle
      if (this.panel?.contains(t)) return;  // let delegated list handlers fire
      this.close();
    };
    this.docKey = (e: KeyboardEvent) => this.onKey(e);

    document.addEventListener('pointerdown', this.docDown, { capture: true });
    // Capture phase so SelectMenu owns the keyboard while open — prevents
    // other document keydown handlers (e.g. an always-open inline Menu) from
    // stealing arrow keys before we get them.
    document.addEventListener('keydown', this.docKey, { capture: true });

    // Reposition when the page scrolls or the window resizes so the panel
    // tracks the trigger even if it has scrolled off its original position.
    this.reposition = () => this.place();
    document.addEventListener('scroll', this.reposition, { passive: true, capture: true });
    window.addEventListener('resize', this.reposition);
  }

  close(): void {
    if (!this.panel) return;

    if (this.docDown) {
      document.removeEventListener('pointerdown', this.docDown, { capture: true } as EventListenerOptions);
      this.docDown = null;
    }
    if (this.docKey) {
      document.removeEventListener('keydown', this.docKey, { capture: true } as EventListenerOptions);
      this.docKey = null;
    }
    if (this.reposition) {
      document.removeEventListener('scroll', this.reposition, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', this.reposition);
      this.reposition = null;
    }

    this.panel.remove();
    this.panel = null;
    this.list = null;
    this.filterRow = null;
    this.filterQuery = null;
    this.spacerT = null;
    this.spacerB = null;
    this.virt = false;
    this.filterStr = '';
    this.activeIdx = -1;

    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.classList.remove('dui-selectmenu--open');
    this.trigger.removeAttribute('aria-activedescendant');
  }

  isOpen(): boolean {
    return this.panel !== null;
  }

  getValue(): string {
    return this.select.value;
  }

  setValue(value: string): void {
    this.select.value = value;
    this.syncTriggerText();
  }

  destroy(): void {
    this.close();
    this.trigger.removeEventListener('click', this.triggerClick);
    this.trigger.remove();
    this.select.classList.remove('dui-selectmenu-source');
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private syncTriggerText(): void {
    const idx = this.select.selectedIndex;
    if (idx >= 0) {
      const opt = this.select.options[idx];
      if (idx === 0 && opt.value === '' && this.opts.placeholder) {
        this.triggerText.textContent = this.opts.placeholder;
        this.triggerText.classList.add('dui-selectmenu-text-placeholder');
      } else {
        this.triggerText.textContent = opt.text; // textContent — never innerHTML for user data
        this.triggerText.classList.remove('dui-selectmenu-text-placeholder');
      }
    } else if (this.opts.placeholder) {
      this.triggerText.textContent = this.opts.placeholder;
      this.triggerText.classList.add('dui-selectmenu-text-placeholder');
    } else {
      this.triggerText.textContent = '';
      this.triggerText.classList.remove('dui-selectmenu-text-placeholder');
    }
  }

  private buildFilteredItems(): HTMLOptionElement[] {
    const q = this.filterStr.toLowerCase();
    const all = Array.from(this.select.options);
    return q ? all.filter(o => o.text.toLowerCase().includes(q)) : all;
  }

  private buildPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'dui-selectmenu-panel';

    // Filter display row — visible only when filterStr is non-empty
    const filterRow = document.createElement('div');
    filterRow.className = 'dui-selectmenu-filter';
    filterRow.setAttribute('aria-live', 'polite');
    filterRow.hidden = true;

    const filterIcon = document.createElement('span');
    filterIcon.className = 'dui-selectmenu-filter-icon';
    filterIcon.setAttribute('aria-hidden', 'true');
    filterIcon.innerHTML = SEARCH_SVG; // only innerHTML write; constant SVG string
    filterRow.appendChild(filterIcon);

    const filterQuery = document.createElement('span');
    filterQuery.className = 'dui-selectmenu-filter-query';
    filterRow.appendChild(filterQuery);

    panel.appendChild(filterRow);

    const list = document.createElement('ul');
    list.className = 'dui-selectmenu-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('id', `dui-sm-${this.uid}`);
    panel.appendChild(list);

    this.panel = panel;
    this.filterRow = filterRow;
    this.filterQuery = filterQuery;
    this.list = list;

    document.body.appendChild(panel);

    // Single scroll listener; renderVirt() is a no-op when not virtualizing
    list.addEventListener('scroll', () => this.renderVirt(), { passive: true });
    list.addEventListener('mouseover', (e: MouseEvent) => this.onListOver(e));
    list.addEventListener('click', (e: MouseEvent) => this.onListClick(e));

    this.rebuildList();
  }

  // Single code path for building/rebuilding list content. Called by
  // buildPanel (initial render) and applyFilter (on every filter change).
  private rebuildList(): void {
    if (!this.list) return;

    // Clear previous content and virtualization state
    while (this.list.firstChild) this.list.firstChild.remove();
    this.spacerT = null;
    this.spacerB = null;
    this.virt = false;

    this.filteredItems = this.buildFilteredItems();

    if (this.filteredItems.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'dui-selectmenu-empty';
      empty.textContent = 'No results';
      this.list.appendChild(empty);
      this.list.style.height = '';
      this.list.style.maxHeight = '';
      this.list.classList.remove('dui-selectmenu-list-virt');
      this.place();
      return;
    }

    const o = this.opts;
    this.virt = this.filteredItems.length > o.virtThreshold;
    this.visH = Math.min(this.filteredItems.length * o.itemHeight, o.maxHeight);

    if (this.virt) {
      // Explicit height required for the virtual scroll container. We cannot
      // rely on flex: 1 here because flex-basis: 0 overrides an explicit height
      // when the flex container has no fixed size of its own.
      this.list.style.height = this.visH + 'px';
      this.list.style.maxHeight = '';
      this.list.classList.add('dui-selectmenu-list-virt');
      this.spacerT = this.list.appendChild(makeSpacerLi());
      this.spacerB = this.list.appendChild(makeSpacerLi());
      this.renderVirt();
    } else {
      this.list.style.height = '';
      this.list.style.maxHeight = this.visH + 'px';
      this.list.classList.remove('dui-selectmenu-list-virt');
      const frag = document.createDocumentFragment();
      for (let i = 0; i < this.filteredItems.length; i++) {
        frag.appendChild(this.mkItem(this.filteredItems[i], i));
      }
      this.list.appendChild(frag);
    }

    this.place();
  }

  private mkItem(option: HTMLOptionElement, idx: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'dui-selectmenu-item';
    li.setAttribute('role', 'option');
    li.setAttribute('id', `dui-sm-${this.uid}-opt-${idx}`);
    li.dataset['i'] = String(idx);
    li.setAttribute('aria-selected', String(option.selected));

    if (option.selected) li.classList.add('dui-selectmenu-item-selected');
    if (option.disabled) {
      li.classList.add('dui-selectmenu-item-disabled');
      li.setAttribute('aria-disabled', 'true');
    }
    if (idx === this.activeIdx) li.classList.add('dui-selectmenu-item-active');

    const lbl = document.createElement('span');
    lbl.className = 'dui-selectmenu-label';
    lbl.textContent = option.text; // textContent — never innerHTML for user data
    li.appendChild(lbl);

    this.opts.onRender?.(li, option); // consumer may append icons, badges, etc.

    return li;
  }

  // ── Virtual list ────────────────────────────────────────────────────
  // Only ~(visible + 2×buffer) items live in the DOM at any time. Two
  // sentinel <li.dui-menu-spacer> elements carry the scroll height for
  // items above/below the render window so scrollTop stays stable.

  private renderVirt(): void {
    if (!this.spacerT || !this.spacerB || !this.list) return;

    const o = this.opts;
    const ih = o.itemHeight;
    const buf = o.virtBuffer;
    const el = this.list;
    const st = el.scrollTop;
    const len = this.filteredItems.length;

    const s = Math.max(0, Math.floor(st / ih) - buf);
    const e2 = Math.min(len - 1, Math.ceil((st + this.visH) / ih) + buf);

    this.spacerT.style.height = (s * ih) + 'px';
    this.spacerB.style.height = Math.max(0, (len - 1 - e2) * ih) + 'px';

    const frag = document.createDocumentFragment();
    for (let i = s; i <= e2; i++) {
      frag.appendChild(this.mkItem(this.filteredItems[i], i));
    }

    // Replace previous window items (between the two sentinel spacers)
    while (this.spacerT.nextSibling && this.spacerT.nextSibling !== this.spacerB) {
      this.spacerT.nextSibling.remove();
    }
    el.insertBefore(frag, this.spacerB);
  }

  // ── Positioning ─────────────────────────────────────────────────────

  private place(): void {
    if (!this.panel) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = this.trigger.getBoundingClientRect();

    this.panel.style.visibility = 'hidden';
    this.panel.style.width = '';
    this.panel.style.minWidth = r.width + 'px'; // at least as wide as the trigger
    const pw = this.panel.offsetWidth;           // natural content width (may be wider)
    const ph = this.panel.offsetHeight || 100;
    this.panel.style.visibility = '';

    let x = r.left;
    let y = r.bottom + 2;
    if (y + ph > vh) y = r.top - ph - 2;
    if (x + pw > vw) x = Math.max(0, vw - pw - 4);

    this.panel.style.left = x + 'px';
    this.panel.style.top = y + 'px';
  }

  // ── State management ─────────────────────────────────────────────────

  private setActive(idx: number, scrollIntoView = false): void {
    this.activeIdx = idx;
    if (!this.list) return;

    if (this.virt) {
      if (scrollIntoView) {
        const ih = this.opts.itemHeight;
        this.list.scrollTop = Math.max(0, idx * ih - this.visH / 2 + ih / 2);
        this.renderVirt();
      } else {
        // Item may or may not be in the render window; toggle class if present
        this.list.querySelector('.dui-selectmenu-item-active')?.classList.remove('dui-selectmenu-item-active');
        this.list.querySelector(`[data-i="${idx}"]`)?.classList.add('dui-selectmenu-item-active');
      }
    } else {
      this.list.querySelector('.dui-selectmenu-item-active')?.classList.remove('dui-selectmenu-item-active');
      const items = this.list.querySelectorAll('.dui-selectmenu-item');
      const target = items[idx] as HTMLLIElement | undefined;
      if (target) {
        target.classList.add('dui-selectmenu-item-active');
        if (scrollIntoView) target.scrollIntoView({ block: 'nearest' });
      }
    }

    if (idx >= 0) {
      this.trigger.setAttribute('aria-activedescendant', `dui-sm-${this.uid}-opt-${idx}`);
    } else {
      this.trigger.removeAttribute('aria-activedescendant');
    }
  }

  private navigate(dir: number): void {
    const len = this.filteredItems.length;
    if (len === 0) return;

    let next = this.activeIdx < 0 ? (dir > 0 ? -1 : 0) : this.activeIdx;

    // Walk in direction, skipping disabled options (bound by len to prevent infinite loop)
    for (let attempt = 0; attempt < len; attempt++) {
      next = ((next + dir) % len + len) % len;
      if (!this.filteredItems[next].disabled) break;
    }

    this.setActive(next, true);
  }

  private selectItem(option: HTMLOptionElement): void {
    this.select.value = option.value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.syncTriggerText();
    this.opts.onSelect?.(option.value, option.text, option);
    this.close();
    this.trigger.focus();
  }

  private applyFilter(): void {
    if (!this.filterRow || !this.filterQuery) return;
    this.filterQuery.textContent = this.filterStr; // textContent — user-typed text, never innerHTML
    this.filterRow.hidden = this.filterStr === '';
    this.activeIdx = -1;
    this.rebuildList();
  }

  // ── Keyboard ─────────────────────────────────────────────────────────
  // Active only while the panel is open (docKey attached in open()).
  // Printable characters accumulate in filterStr for type-to-filter.

  private onKey(e: KeyboardEvent): void {
    if (!this.panel) return;
    // Stop propagation so sibling document listeners (e.g. an always-open
    // inline Menu) don't also process this event. stopPropagation without
    // preventDefault leaves default browser behavior (like Tab focus movement).
    e.stopPropagation();

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        this.trigger.focus();
        return;

      case 'Tab':
        this.close(); // let Tab move focus naturally — no preventDefault
        return;

      case 'ArrowDown':
        e.preventDefault();
        this.navigate(+1);
        return;

      case 'ArrowUp':
        e.preventDefault();
        this.navigate(-1);
        return;

      case 'Home':
        e.preventDefault();
        if (this.filteredItems.length > 0) this.setActive(0, true);
        return;

      case 'End':
        e.preventDefault();
        if (this.filteredItems.length > 0) this.setActive(this.filteredItems.length - 1, true);
        return;

      case 'Enter': {
        e.preventDefault();
        const opt = this.filteredItems[this.activeIdx];
        if (opt && !opt.disabled) this.selectItem(opt);
        return;
      }

      case 'Backspace':
        e.preventDefault();
        if (this.filterStr.length > 0) {
          this.filterStr = this.filterStr.slice(0, -1);
          this.applyFilter();
        }
        return;

      default:
        // Accumulate printable characters for type-to-filter
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          this.filterStr += e.key;
          this.applyFilter();
        }
    }
  }

  // ── Mouse ─────────────────────────────────────────────────────────────

  private onListOver(e: MouseEvent): void {
    const li = (e.target as Element).closest('.dui-selectmenu-item') as HTMLLIElement | null;
    if (!li || li.classList.contains('dui-selectmenu-item-disabled')) return;

    const idx = +(li.dataset['i'] ?? -1);
    if (idx < 0) return;

    this.list?.querySelector('.dui-selectmenu-item-active')?.classList.remove('dui-selectmenu-item-active');
    li.classList.add('dui-selectmenu-item-active');
    this.activeIdx = idx;
    this.trigger.setAttribute('aria-activedescendant', `dui-sm-${this.uid}-opt-${idx}`);
  }

  private onListClick(e: MouseEvent): void {
    const li = (e.target as Element).closest('.dui-selectmenu-item') as HTMLLIElement | null;
    if (!li || li.classList.contains('dui-selectmenu-item-disabled')) return;

    const idx = +(li.dataset['i'] ?? -1);
    const opt = this.filteredItems[idx];
    if (opt) this.selectItem(opt);
  }
}
