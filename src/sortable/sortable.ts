import type { SortableOptions, SortableItemInfo } from './types';

type ResolvedOpts = Required<Omit<SortableOptions, 'onStart' | 'onStop' | 'onSorted'>> &
  Pick<SortableOptions, 'onStart' | 'onStop' | 'onSorted'>;

const DEFAULTS: ResolvedOpts = {
  items:            '> *',
  handle:           '',
  helper:           'original',
  distance:         5,
  tolerance:        'pointer',
  connectWith:      [],
  placeholderClass: '',
  onStart:          null,
  onStop:           null,
  onSorted:         null,
};

interface DragState {
  item:           HTMLElement;
  helperEl:       HTMLElement;
  /** Fills the item's original slot throughout the drag (dashed border). */
  originEl:       HTMLElement;
  /** Moves to show the current insertion point (accent border/fill). */
  destEl:         HTMLElement;
  /**
   * The item's original next-sibling, captured before any DOM mutations.
   * Used to restore position on cancel/Escape.
   */
  restoreAnchor:  Element | null;
  fromContainer:  HTMLElement;
  fromIndex:      number;
  activeInstance: Sortable;
  connectedRects: Array<{ instance: Sortable; rect: DOMRect }>;
  offsetX:        number;
  offsetY:        number;
  axis:           'vertical' | 'horizontal';
  currentDestIndex: number;
  moveHandler:    (e: PointerEvent) => void;
  upHandler:      (e: PointerEvent) => void;
  keyHandler:     (e: KeyboardEvent) => void;
}

export class Sortable {
  private readonly container: HTMLElement;
  private opts: ResolvedOpts;
  private static _uid = 0;
  private readonly uid: number;
  private static _instances = new WeakMap<HTMLElement, Sortable>();
  private drag: DragState | null = null;

  constructor(el: HTMLElement, opts: SortableOptions = {}) {
    this.container = el;
    this.opts = { ...DEFAULTS, ...opts };
    this.uid = ++Sortable._uid;
    this.init();
    Sortable._instances.set(el, this);
  }

  static from(el: HTMLElement): Sortable | undefined {
    return Sortable._instances.get(el);
  }

  /** Re-apply item/handle cursor classes after external DOM mutations. */
  refresh(): void {
    this.refreshItemClasses();
  }

  destroy(): void {
    if (this.drag) this.cancelDrag();
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.classList.remove('dui-sortable');
    for (const item of this.getItems()) {
      item.classList.remove('dui-sortable-item');
    }
    if (this.opts.handle) {
      for (const el of Array.from(
        this.container.querySelectorAll<HTMLElement>(this.opts.handle),
      )) {
        el.classList.remove('dui-sortable-handle');
      }
    }
    Sortable._instances.delete(this.container);
  }

  // ── Init ──────────────────────────────────────────────────────────────

  private init(): void {
    this.container.classList.add('dui-sortable');
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.refreshItemClasses();
  }

  private refreshItemClasses(): void {
    if (this.opts.handle) {
      for (const item of this.getItems()) {
        item.classList.remove('dui-sortable-item');
        const handle = item.querySelector<HTMLElement>(this.opts.handle);
        if (handle) handle.classList.add('dui-sortable-handle');
      }
    } else {
      for (const item of this.getItems()) {
        item.classList.add('dui-sortable-item');
      }
    }
  }

  // ── Item query ────────────────────────────────────────────────────────

  private getItems(): HTMLElement[] {
    // Prepend :scope when selector starts with a combinator (e.g. '> li')
    // so querySelectorAll receives a valid absolute selector.
    const raw = this.opts.items.trimStart();
    const sel = /^[>+~]/.test(raw) ? `:scope ${raw}` : raw;
    return Array.from(
      this.container.querySelectorAll<HTMLElement>(sel),
    ).filter(
      el =>
        el.parentElement === this.container &&
        !el.classList.contains('dui-sortable-origin') &&
        !el.classList.contains('dui-sortable-dest'),
    );
  }

  private getItemIndex(el: HTMLElement): number {
    return this.getItems().indexOf(el);
  }

  // ── Orientation detection ─────────────────────────────────────────────

  private detectOrientation(items: HTMLElement[]): 'vertical' | 'horizontal' {
    if (items.length < 2) return 'vertical';
    const r0 = items[0].getBoundingClientRect();
    const r1 = items[1].getBoundingClientRect();
    return Math.abs(r1.top - r0.top) > 4 ? 'vertical' : 'horizontal';
  }

  // ── Pointer events ────────────────────────────────────────────────────

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    const target = e.target as Element;

    // Find the sortable item that was clicked — avoids relative-selector issues
    // with closest() by scanning the live item list instead.
    const item = this.getItems().find(el => el === target || el.contains(target));
    if (!item) return;

    // Enforce handle constraint
    if (this.opts.handle) {
      const handle = target.closest<HTMLElement>(this.opts.handle);
      if (!handle || !item.contains(handle)) return;
    }

    e.preventDefault();
    this.beginPreDrag(e, item);
  };

  private beginPreDrag(startEvent: PointerEvent, item: HTMLElement): void {
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) >= this.opts.distance) {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onCancel);
        this.activateDrag(e, item);
      }
    };

    const onCancel = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onCancel);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onCancel);
  }

  private activateDrag(e: PointerEvent, item: HTMLElement): void {
    const itemRect = item.getBoundingClientRect();
    const fromIndex = this.getItemIndex(item);

    // Capture the original next-sibling before any DOM mutations so we can
    // restore the item to its exact original position on cancel.
    const restoreAnchor = item.nextElementSibling;

    // originEl fills the item's slot for the duration of the drag.
    // destEl moves to indicate the current drop target.
    const originEl = this.createPlaceholder('origin', itemRect);
    const destEl   = this.createPlaceholder('dest',   itemRect);

    // Insert originEl where item is now (before the item in the DOM).
    item.parentElement!.insertBefore(originEl, item);

    const helperEl = this.buildHelper(item, itemRect);

    if (this.opts.helper === 'original') {
      // The item itself becomes the floating helper.
      item.classList.add('dui-sortable-helper');
      item.style.width = `${itemRect.width}px`;
      item.style.left  = `${itemRect.left}px`;
      item.style.top   = `${itemRect.top}px`;
      // item stays in the DOM after originEl; position:fixed removes it from flow.
    } else {
      // Clone / custom: detach the original item so it doesn't consume space.
      // restoreAnchor already points past it, so the slot is held by originEl.
      item.remove();
      helperEl.style.left  = `${itemRect.left}px`;
      helperEl.style.top   = `${itemRect.top}px`;
      helperEl.style.width = `${itemRect.width}px`;
      document.body.appendChild(helperEl);
    }

    // destEl starts immediately after originEl (same logical slot).
    // syncOriginVisibility() will hide originEl so only 1 placeholder shows.
    originEl.after(destEl);

    // Detect layout axis from the current item set.
    const preItems = this.getItems().filter(el => el !== item);
    const axis = this.detectOrientation(preItems);

    // Cache connected container rects once for the drag lifetime.
    const connectedRects = this.opts.connectWith
      .map(el => ({ instance: Sortable.from(el), rect: el.getBoundingClientRect() }))
      .filter((r): r is { instance: Sortable; rect: DOMRect } => r.instance != null);

    const offsetX = e.clientX - itemRect.left;
    const offsetY = e.clientY - itemRect.top;

    this.container.classList.add('dui-sortable-dragging-active');

    const moveHandler = (me: PointerEvent) => this.onDragMove(me);
    const upHandler   = (ue: PointerEvent) => this.onDragEnd(ue);
    const keyHandler  = (ke: KeyboardEvent) => {
      if (ke.key === 'Escape') this.cancelDrag();
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup',   upHandler);
    document.addEventListener('keydown',     keyHandler);

    this.drag = {
      item, helperEl, originEl, destEl,
      restoreAnchor,
      fromContainer: this.container,
      fromIndex,
      activeInstance: this,
      connectedRects,
      offsetX, offsetY,
      axis,
      currentDestIndex: fromIndex,
      moveHandler, upHandler, keyHandler,
    };

    // Hide originEl while destEl is at the same slot (avoids double-height gap).
    this.syncOriginVisibility(this.drag);

    this.opts.onStart?.(this.makeInfo());
  }

  private onDragMove = (e: PointerEvent): void => {
    const drag = this.drag;
    if (!drag) return;

    const cx = e.clientX;
    const cy = e.clientY;

    // Move the helper element.
    if (this.opts.helper === 'original') {
      drag.item.style.left = `${cx - drag.offsetX}px`;
      drag.item.style.top  = `${cy - drag.offsetY}px`;
    } else {
      drag.helperEl.style.left = `${cx - drag.offsetX}px`;
      drag.helperEl.style.top  = `${cy - drag.offsetY}px`;
    }

    const newActive = this.resolveActiveContainer(cx, cy, drag);

    if (newActive === null) {
      // Outside all containers: retract the dest indicator and show origin slot.
      if (drag.destEl.parentElement) {
        drag.destEl.remove();
        drag.activeInstance.container.classList.remove('dui-sortable-dragging-active');
        this.syncOriginVisibility(drag);
      }
      return;
    }

    if (newActive !== drag.activeInstance) {
      drag.activeInstance.container.classList.remove('dui-sortable-dragging-active');
      newActive.container.classList.add('dui-sortable-dragging-active');
      drag.activeInstance = newActive;
      drag.axis = this.detectOrientation(newActive.getItems());
    }

    this.updateDestPlaceholder(cx, cy, drag);
    this.syncOriginVisibility(drag);
  };

  private onDragEnd = (e: PointerEvent): void => {
    const drag = this.drag;
    if (!drag) return;

    // If released outside all valid containers, snap back to origin.
    if (this.resolveActiveContainer(e.clientX, e.clientY, drag) === null) {
      this.teardownDrag(drag, true);
      return;
    }

    // destEl may have been retracted (mouse briefly left then re-entered too fast).
    // Re-insert it at the last known good position before committing.
    if (!drag.destEl.parentElement) {
      this.updateDestPlaceholder(e.clientX, e.clientY, drag);
    }

    const info = this.makeInfo();

    this.opts.onStop?.(info);

    this.commitDrop(drag);

    this.opts.onSorted?.(info);
    if (drag.activeInstance !== this) {
      drag.activeInstance.opts.onSorted?.(info);
    }

    this.teardownDrag(drag, false);
  };

  private cancelDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    this.teardownDrag(drag, true);
  }

  // ── Drag helpers ──────────────────────────────────────────────────────

  /**
   * Hide originEl when destEl sits immediately after it (same logical slot,
   * so only 1 placeholder is visible). Show it once they've separated.
   * Also show it when destEl has been retracted (cursor outside containers).
   */
  private syncOriginVisibility(drag: DragState): void {
    const atOrigin = drag.originEl.nextElementSibling === drag.destEl
      && drag.destEl.parentElement !== null;
    drag.originEl.style.display = atOrigin ? 'none' : '';
  }

  private createPlaceholder(kind: 'origin' | 'dest', rect: DOMRect): HTMLElement {
    const el = document.createElement('div');
    el.className = `dui-sortable-${kind}`;
    if (this.opts.placeholderClass) el.classList.add(this.opts.placeholderClass);
    el.style.width  = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  private buildHelper(item: HTMLElement, _rect: DOMRect): HTMLElement {
    const h = this.opts.helper;
    if (h === 'original') return item;
    if (h === 'clone') {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.classList.add('dui-sortable-helper');
      clone.removeAttribute('id');
      return clone;
    }
    const custom = h(item);
    custom.classList.add('dui-sortable-helper');
    return custom;
  }

  private resolveActiveContainer(
    cx: number,
    cy: number,
    drag: DragState,
  ): Sortable | null {
    const ownRect = this.container.getBoundingClientRect();
    if (cx >= ownRect.left && cx <= ownRect.right &&
        cy >= ownRect.top  && cy <= ownRect.bottom) {
      return this;
    }
    for (const { instance, rect } of drag.connectedRects) {
      if (cx >= rect.left && cx <= rect.right &&
          cy >= rect.top  && cy <= rect.bottom) {
        return instance;
      }
    }
    return null;
  }

  private updateDestPlaceholder(cx: number, cy: number, drag: DragState): void {
    const targetInst = drag.activeInstance;
    const container  = targetInst.container;

    const items = targetInst.getItems().filter(
      el => el !== drag.item && el !== drag.originEl && el !== drag.destEl,
    );

    const insertBefore = this.computeInsertionPoint(cx, cy, drag, items);

    const sameParent = drag.destEl.parentElement === container;
    const sameNext   = drag.destEl.nextElementSibling === insertBefore;
    if (sameParent && sameNext) return;

    if (insertBefore) {
      container.insertBefore(drag.destEl, insertBefore);
    } else {
      container.appendChild(drag.destEl);
    }

    drag.currentDestIndex = this.getDestIndex(drag);
  }

  private computeInsertionPoint(
    cx: number,
    cy: number,
    drag: DragState,
    items: HTMLElement[],
  ): HTMLElement | null {
    if (this.opts.tolerance === 'pointer') {
      for (const it of items) {
        const r   = it.getBoundingClientRect();
        const mid = drag.axis === 'vertical'
          ? r.top  + r.height / 2
          : r.left + r.width  / 2;
        const cursor = drag.axis === 'vertical' ? cy : cx;
        if (cursor < mid) return it;
      }
      return null;
    }

    // 'intersect': item with maximum overlap area with the helper wins.
    const hr = drag.helperEl.getBoundingClientRect();
    let bestOverlap = 0;
    let bestItem: HTMLElement | null = null;

    for (const it of items) {
      const r  = it.getBoundingClientRect();
      const ox = Math.max(0, Math.min(hr.right, r.right)   - Math.max(hr.left, r.left));
      const oy = Math.max(0, Math.min(hr.bottom, r.bottom) - Math.max(hr.top,  r.top));
      const overlap = ox * oy;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestItem    = it;
      }
    }

    if (!bestItem) return null;

    const r      = bestItem.getBoundingClientRect();
    const mid    = drag.axis === 'vertical' ? r.top + r.height / 2 : r.left + r.width / 2;
    const cursor = drag.axis === 'vertical' ? cy : cx;

    if (cursor < mid) return bestItem;
    return bestItem.nextElementSibling as HTMLElement | null;
  }

  private getDestIndex(drag: DragState): number {
    const items = drag.activeInstance.getItems();
    let count = 0;
    let node = drag.destEl.previousElementSibling;
    while (node) {
      if (items.includes(node as HTMLElement)) count++;
      node = node.previousElementSibling;
    }
    return count;
  }

  private commitDrop(drag: DragState): void {
    const container = drag.activeInstance.container;

    container.insertBefore(drag.item, drag.destEl);
    drag.destEl.remove();
    drag.originEl.remove();

    if (this.opts.helper === 'original') {
      drag.item.classList.remove('dui-sortable-helper');
      drag.item.style.width = '';
      drag.item.style.left  = '';
      drag.item.style.top   = '';
    } else {
      // item was detached; it's been re-inserted above. Remove the floating clone.
      if (drag.helperEl !== drag.item) drag.helperEl.remove();
    }

    drag.activeInstance.refreshItemClasses();
    if (drag.activeInstance !== this) this.refreshItemClasses();
  }

  private teardownDrag(drag: DragState, cancelled: boolean): void {
    document.removeEventListener('pointermove', drag.moveHandler);
    document.removeEventListener('pointerup',   drag.upHandler);
    document.removeEventListener('keydown',     drag.keyHandler);

    if (cancelled) {
      // Restore item to its exact original position using the pre-drag anchor.
      drag.fromContainer.insertBefore(drag.item, drag.restoreAnchor);
      drag.destEl.remove();
      drag.originEl.remove();

      if (this.opts.helper === 'original') {
        drag.item.classList.remove('dui-sortable-helper');
        drag.item.style.width = '';
        drag.item.style.left  = '';
        drag.item.style.top   = '';
      } else {
        if (drag.helperEl !== drag.item) drag.helperEl.remove();
      }
    }

    this.container.classList.remove('dui-sortable-dragging-active');
    if (drag.activeInstance !== this) {
      drag.activeInstance.container.classList.remove('dui-sortable-dragging-active');
    }

    this.drag = null;
  }

  private makeInfo(): SortableItemInfo {
    const drag = this.drag!;
    return {
      item:      drag.item,
      from:      drag.fromContainer,
      to:        drag.activeInstance.container,
      fromIndex: drag.fromIndex,
      toIndex:   drag.currentDestIndex,
    };
  }

  get id(): number { return this.uid; }
}
