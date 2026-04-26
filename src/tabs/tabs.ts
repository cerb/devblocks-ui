/*!
 * Devblocks UI — Tabs
 *
 * Lightweight tab component. Parses a <ul> of <li><a> items into a tab strip:
 *
 *   Anchor tabs  — <a href="#panel-id">  — toggles a user-defined content div.
 *   Dynamic tabs — <a href="/some/url">  — fetches HTML on demand; manages its
 *                                          own panel div automatically.
 *
 * Dynamic panels show a spinner while loading and cache their content; call
 * refresh(index) to force a reload.
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import { Spinner } from '../spinner/spinner';
import type { TabInfo, TabsOptions } from './types';

interface TabState {
  li: HTMLLIElement;
  a: HTMLAnchorElement;
  isDynamic: boolean;
  href: string;
  panel: HTMLDivElement;
  loaded: boolean;
}

type ResolvedOpts = Required<Omit<TabsOptions, 'onTabSelected' | 'onBeforeTabLoad'>> &
  Pick<TabsOptions, 'onTabSelected' | 'onBeforeTabLoad'>;

const DEFAULTS: ResolvedOpts = {
  active: 0,
  onTabSelected: null,
  onBeforeTabLoad: null,
};

export class Tabs {
  private readonly ul: HTMLUListElement;
  private opts: ResolvedOpts;
  private tabs: TabState[] = [];
  private activeIndex = -1;
  private abortCtrl: AbortController | null = null;
  private static _uid = 0;
  private static _instances = new WeakMap<HTMLUListElement, Tabs>();
  private readonly uid: number;

  constructor(ul: HTMLUListElement, opts: TabsOptions = {}) {
    this.ul = ul;
    this.opts = { ...DEFAULTS, ...opts };
    this.uid = ++Tabs._uid;

    this.init();
    this.ul.addEventListener('click', this.onUlClick);
    this.ul.addEventListener('keydown', this.onUlKeydown);
    Tabs._instances.set(ul, this);
  }

  static from(el: HTMLUListElement): Tabs | undefined {
    return Tabs._instances.get(el);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** 0-based index of the currently active tab. */
  get active(): number {
    return this.activeIndex;
  }

  /** Activate a tab by 0-based index. Fires onBeforeTabLoad / onTabSelected. */
  select(index: number): void {
    this.activateTab(index);
  }

  /** Re-fetch a dynamic tab's content from its URL (ignores cached state).
   *  If the tab is currently active the reload starts immediately; otherwise
   *  it loads on next selection. Does not fire onTabSelected. */
  refresh(index: number): void {
    const tab = this.tabs[index];
    if (!tab?.isDynamic) return;
    tab.loaded = false;
    if (this.activeIndex === index) void this.loadPanel(tab);
  }

  /** Re-parse the <ul> to pick up <li> items that were added or removed. */
  sync(): void {
    const activeLi = this.activeIndex >= 0 ? this.tabs[this.activeIndex]?.li : null;
    const lis = Array.from(this.ul.querySelectorAll<HTMLLIElement>(':scope > li'));
    const newTabs: TabState[] = [];

    for (let i = 0; i < lis.length; i++) {
      const li = lis[i];
      const existing = this.tabs.find(t => t.li === li);
      if (existing) {
        newTabs.push(existing);
      } else {
        const tab = this.buildTabState(li, i);
        if (tab) newTabs.push(tab);
      }
    }

    // Remove auto-created panels for tabs that no longer exist.
    for (const tab of this.tabs) {
      if (tab.isDynamic && !newTabs.includes(tab)) tab.panel.remove();
    }

    this.tabs = newTabs;
    this.applyAttrs();

    // Try to keep the previously active tab; fall back to tab 0.
    const next = activeLi
      ? Math.max(0, this.tabs.findIndex(t => t.li === activeLi))
      : 0;

    this.activeIndex = -1; // force re-activation after applyAttrs reset everything
    if (this.tabs.length > 0) this.activateTab(next, false);
  }

  destroy(): void {
    Tabs._instances.delete(this.ul);
    this.abortCtrl?.abort();
    this.ul.removeEventListener('click', this.onUlClick);
    this.ul.removeEventListener('keydown', this.onUlKeydown);
    this.ul.removeAttribute('role');
    this.ul.classList.remove('dui-tabs');

    for (const tab of this.tabs) {
      tab.li.classList.remove('dui-tab', 'dui-tab-active');
      tab.li.removeAttribute('role');
      tab.a.removeAttribute('role');
      tab.a.removeAttribute('id');
      tab.a.removeAttribute('aria-selected');
      tab.a.removeAttribute('aria-controls');
      tab.a.removeAttribute('tabindex');
      tab.panel.removeAttribute('role');
      tab.panel.removeAttribute('aria-labelledby');
      tab.panel.removeAttribute('tabindex');
      tab.panel.classList.remove('dui-tab-panel', 'dui-tab-panel-active');
      if (tab.isDynamic) tab.panel.remove();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  private init(): void {
    this.ul.setAttribute('role', 'tablist');
    this.ul.classList.add('dui-tabs');

    const lis = Array.from(this.ul.querySelectorAll<HTMLLIElement>(':scope > li'));
    for (let i = 0; i < lis.length; i++) {
      const tab = this.buildTabState(lis[i], i);
      if (tab) this.tabs.push(tab);
    }

    this.applyAttrs();

    if (this.tabs.length > 0) {
      const initial = Math.max(0, Math.min(this.opts.active ?? 0, this.tabs.length - 1));
      this.activateTab(initial, false);
    }
  }

  /** Build a TabState from a <li>. Returns null if the <li> has no <a> or if
   *  an anchor href points to a non-existent panel div. */
  private buildTabState(li: HTMLLIElement, index: number): TabState | null {
    const a = li.querySelector<HTMLAnchorElement>(':scope > a');
    if (!a) return null;

    const href = a.getAttribute('href') ?? '';
    const isDynamic = href !== '' && !href.startsWith('#');
    let panel: HTMLDivElement;

    if (isDynamic) {
      panel = document.createElement('div');
      panel.id = `dui-panel-${this.uid}-${index}`;
      // Insert directly after the last known panel (or after the <ul>).
      this.lastPanelRef().insertAdjacentElement('afterend', panel);
    } else {
      const id = href.slice(1);
      const found = id ? document.getElementById(id) : null;
      if (!found) return null;
      panel = found as HTMLDivElement;
    }

    return { li, a, isDynamic, href, panel, loaded: false };
  }

  /** Returns the element after which the next dynamic panel should be inserted. */
  private lastPanelRef(): HTMLElement {
    let ref: HTMLElement = this.ul;
    for (const tab of this.tabs) {
      if (ref.compareDocumentPosition(tab.panel) & Node.DOCUMENT_POSITION_FOLLOWING) {
        ref = tab.panel;
      }
    }
    return ref;
  }

  /** Write ARIA + CSS classes to all tabs and panels in their inactive state.
   *  activateTab() is called afterwards to promote one tab to active. */
  private applyAttrs(): void {
    for (let i = 0; i < this.tabs.length; i++) {
      const { li, a, panel } = this.tabs[i];
      const tabId = `dui-tab-${this.uid}-${i}`;

      li.classList.add('dui-tab');
      li.setAttribute('role', 'presentation');

      a.setAttribute('role', 'tab');
      a.setAttribute('id', tabId);
      a.setAttribute('aria-controls', panel.id);
      a.setAttribute('aria-selected', 'false');
      a.setAttribute('tabindex', '-1');

      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.setAttribute('tabindex', '-1');
      panel.classList.add('dui-tab-panel');
      panel.classList.remove('dui-tab-panel-active');
    }
  }

  // ── Activation ────────────────────────────────────────────────────────────

  private activateTab(index: number, fireCallbacks = true): void {
    if (index < 0 || index >= this.tabs.length) return;
    if (index === this.activeIndex) return;

    const tab = this.tabs[index];
    const info = this.makeInfo(index, tab);

    if (fireCallbacks && this.opts.onBeforeTabLoad?.(index, info) === false) return;

    // Deactivate the current tab (skip on first call when activeIndex is -1).
    if (this.activeIndex >= 0 && this.activeIndex < this.tabs.length) {
      const prev = this.tabs[this.activeIndex];
      prev.li.classList.remove('dui-tab-active');
      prev.a.setAttribute('aria-selected', 'false');
      prev.a.setAttribute('tabindex', '-1');
      prev.panel.classList.remove('dui-tab-panel-active');
      prev.panel.setAttribute('tabindex', '-1');
    }

    // Activate the new tab.
    tab.li.classList.add('dui-tab-active');
    tab.a.setAttribute('aria-selected', 'true');
    tab.a.setAttribute('tabindex', '0');
    tab.panel.classList.add('dui-tab-panel-active');
    tab.panel.setAttribute('tabindex', '0');
    this.activeIndex = index;

    if (tab.isDynamic && !tab.loaded) void this.loadPanel(tab);

    if (fireCallbacks) this.opts.onTabSelected?.(index, info);
  }

  // ── Async content loading ─────────────────────────────────────────────────

  private async loadPanel(tab: TabState): Promise<void> {
    // Cancel any in-flight request (e.g. user clicked a different tab mid-load).
    this.abortCtrl?.abort();
    this.abortCtrl = new AbortController();
    const { signal } = this.abortCtrl;

    tab.panel.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'dui-tab-panel-loading';
    const spinner = new Spinner();
    wrap.appendChild(spinner.el);
    tab.panel.appendChild(wrap);

    try {
      const res = await fetch(tab.href, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (signal.aborted) return;
      tab.panel.innerHTML = '';
      // innerHTML is intentional: this component is designed to load
      // server-generated HTML fragments from trusted internal endpoints.
      tab.panel.innerHTML = html;
      tab.loaded = true;
    } catch {
      if (signal.aborted) return;
      tab.panel.innerHTML = '';
      const errEl = document.createElement('p');
      errEl.className = 'dui-tab-panel-error';
      errEl.textContent = 'Failed to load content.';
      tab.panel.appendChild(errEl);
      // loaded stays false so refresh() or the next select() will retry.
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private onUlClick = (e: MouseEvent): void => {
    e.preventDefault();
    const li = (e.target as Element).closest<HTMLLIElement>('li.dui-tab');
    if (!li) return;
    const index = this.tabs.findIndex(t => t.li === li);
    if (index >= 0) this.activateTab(index);
  };

  private onUlKeydown = (e: KeyboardEvent): void => {
    const a = (document.activeElement as Element | null)
      ?.closest<HTMLAnchorElement>('.dui-tab > a');
    if (!a) return;
    const index = this.tabs.findIndex(t => t.a === a);
    if (index < 0) return;

    const last = this.tabs.length - 1;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = (index + dir + this.tabs.length) % this.tabs.length;
        this.activateTab(next);
        this.tabs[next].a.focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        this.activateTab(0);
        this.tabs[0].a.focus();
        break;
      case 'End':
        e.preventDefault();
        this.activateTab(last);
        this.tabs[last].a.focus();
        break;
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  private makeInfo(index: number, tab: TabState): TabInfo {
    return {
      index,
      isDynamic: tab.isDynamic,
      href: tab.href,
      li: tab.li,
      panel: tab.panel,
    };
  }
}
