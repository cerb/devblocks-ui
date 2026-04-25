/*!
 * Devblocks UI — Accordion
 *
 * Enhances a <div> whose direct children alternate between <h3> (headers) and
 * <div> (panels). Each <h3> becomes a clickable trigger; its following <div>
 * expands/collapses with a CSS grid-row animation.
 *
 * Options:
 *   active      — 0-based index of the initially-open section (default 0).
 *                 Pass -1 to start with all sections collapsed.
 *   collapsible — when true, clicking the open section collapses it (all
 *                 sections can be closed). Default false.
 *   scrollable  — when true, panels are height-capped and scroll. The cap is
 *                 controlled by --dui-accordion-max-height (default 300px).
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import { CHEVRON_SVG } from './icons';
import type { AccordionItemInfo, AccordionOptions } from './types';

interface SectionState {
  header: HTMLHeadingElement;
  panel: HTMLDivElement;
  body: HTMLDivElement;
  wrapper: HTMLDivElement;
  trigger: HTMLButtonElement;
  originalNodes: ChildNode[];
  expanded: boolean;
}

type ResolvedOpts = Required<Omit<AccordionOptions, 'onExpand' | 'onCollapse'>> &
  Pick<AccordionOptions, 'onExpand' | 'onCollapse'>;

const DEFAULTS: ResolvedOpts = {
  active: 0,
  collapsible: false,
  scrollable: false,
  onExpand: null,
  onCollapse: null,
};

export class Accordion {
  private readonly container: HTMLElement;
  private opts: ResolvedOpts;
  private sections: SectionState[] = [];
  private expandedIndex = -1;
  private static _uid = 0;
  private readonly uid: number;

  constructor(container: HTMLElement, opts: AccordionOptions = {}) {
    this.container = container;
    this.opts = { ...DEFAULTS, ...opts };
    this.uid = ++Accordion._uid;

    this.init();
    this.container.addEventListener('click', this.onClick);
    this.container.addEventListener('keydown', this.onKeydown);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** 0-based index of the currently expanded section, or -1 if none. */
  get expanded(): number {
    return this.expandedIndex;
  }

  /** Expand a section by 0-based index. */
  expand(index: number): void {
    this.expandSection(index);
  }

  /** Collapse a section by 0-based index. */
  collapse(index: number): void {
    this.collapseSection(index);
  }

  destroy(): void {
    this.container.removeEventListener('click', this.onClick);
    this.container.removeEventListener('keydown', this.onKeydown);
    this.container.classList.remove('dui-accordion', 'dui-accordion--scrollable');

    for (const s of this.sections) {
      // Restore panel: move it out of wrapper, remove wrapper.
      // (ARIA attrs role/aria-labelledby live on the wrapper and disappear with it.)
      s.wrapper.parentNode?.insertBefore(s.panel, s.wrapper);
      s.wrapper.remove();
      s.panel.classList.remove('dui-accordion-panel-inner');
      while (s.body.firstChild) s.panel.insertBefore(s.body.firstChild, s.body);
      s.body.remove();

      // Restore header: remove button, put original nodes back.
      s.trigger.remove();
      for (const node of s.originalNodes) s.header.appendChild(node);
      s.header.classList.remove('dui-accordion-header');
    }

    this.sections = [];
    this.expandedIndex = -1;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  private init(): void {
    this.container.classList.add('dui-accordion');
    if (this.opts.scrollable) this.container.classList.add('dui-accordion--scrollable');

    const children = Array.from(this.container.children);
    for (let i = 0; i < children.length - 1; i++) {
      const hdr = children[i];
      const pnl = children[i + 1];
      if (hdr.tagName !== 'H3' || pnl.tagName !== 'DIV') continue;

      const index = this.sections.length;
      const header = hdr as HTMLHeadingElement;
      const panel = pnl as HTMLDivElement;

      // Save original header children for destroy().
      const originalNodes = Array.from(header.childNodes);

      // Build trigger button: move h3 children into it, append chevron SVG.
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'dui-accordion-trigger';
      while (header.firstChild) trigger.appendChild(header.firstChild);

      // One innerHTML write — only for the icon constant.
      const iconWrap = document.createElement('span');
      iconWrap.innerHTML = CHEVRON_SVG;
      trigger.appendChild(iconWrap.firstElementChild as SVGElement);

      const triggerId = `dui-accordion-${this.uid}-${index}-btn`;
      const wrapperId = `dui-accordion-${this.uid}-${index}-panel`;

      trigger.id = triggerId;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', wrapperId);

      header.appendChild(trigger);
      header.classList.add('dui-accordion-header');

      // Wrap panel in grid-animation wrapper; panel keeps its own id.
      const wrapper = document.createElement('div');
      wrapper.className = 'dui-accordion-panel-wrap';
      wrapper.id = wrapperId;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-labelledby', triggerId);
      panel.parentNode?.insertBefore(wrapper, panel);
      wrapper.appendChild(panel);
      panel.classList.add('dui-accordion-panel-inner');

      // Move panel children into a body div so padding doesn't leak through the
      // overflow:hidden clip when the grid row is 0fr.
      const body = document.createElement('div');
      body.className = 'dui-accordion-panel-body';
      while (panel.firstChild) body.appendChild(panel.firstChild);
      panel.appendChild(body);

      this.sections.push({ header, panel, body, wrapper, trigger, originalNodes, expanded: false });
      i++; // skip the panel we just consumed
    }

    const initial = this.opts.active ?? 0;
    if (initial >= 0 && initial < this.sections.length) {
      this.expandSection(initial, false);
    }
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────

  private expandSection(index: number, fireCallbacks = true): void {
    if (index < 0 || index >= this.sections.length) return;

    // Collapse the previously open section (if different).
    if (this.expandedIndex >= 0 && this.expandedIndex !== index) {
      this.collapseSection(this.expandedIndex, fireCallbacks);
    }

    const s = this.sections[index];
    if (s.expanded) return;

    s.expanded = true;
    s.wrapper.classList.add('dui-accordion-expanded');
    s.trigger.setAttribute('aria-expanded', 'true');
    this.expandedIndex = index;

    if (fireCallbacks) this.opts.onExpand?.(index, this.makeInfo(index));
  }

  private collapseSection(index: number, fireCallbacks = true): void {
    if (index < 0 || index >= this.sections.length) return;
    const s = this.sections[index];
    if (!s.expanded) return;

    s.expanded = false;
    s.wrapper.classList.remove('dui-accordion-expanded');
    s.trigger.setAttribute('aria-expanded', 'false');
    if (this.expandedIndex === index) this.expandedIndex = -1;

    if (fireCallbacks) this.opts.onCollapse?.(index, this.makeInfo(index));
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private onClick = (e: MouseEvent): void => {
    const trigger = (e.target as Element).closest<HTMLButtonElement>('button.dui-accordion-trigger');
    if (!trigger) return;
    const index = this.sections.findIndex(s => s.trigger === trigger);
    if (index < 0) return;

    if (this.sections[index].expanded) {
      if (this.opts.collapsible) this.collapseSection(index);
    } else {
      this.expandSection(index);
    }
  };

  private onKeydown = (e: KeyboardEvent): void => {
    const trigger = (document.activeElement as Element | null)
      ?.closest<HTMLButtonElement>('button.dui-accordion-trigger');
    if (!trigger) return;
    const index = this.sections.findIndex(s => s.trigger === trigger);
    if (index < 0) return;

    const last = this.sections.length - 1;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = (index + 1) % this.sections.length;
        this.sections[next].trigger.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = (index - 1 + this.sections.length) % this.sections.length;
        this.sections[prev].trigger.focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        this.sections[0].trigger.focus();
        break;
      case 'End':
        e.preventDefault();
        this.sections[last].trigger.focus();
        break;
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  private makeInfo(index: number): AccordionItemInfo {
    const s = this.sections[index];
    return { index, header: s.header, panel: s.panel };
  }
}
