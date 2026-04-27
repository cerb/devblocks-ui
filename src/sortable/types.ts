export interface SortableItemInfo {
  item:      HTMLElement;
  from:      HTMLElement;
  to:        HTMLElement;
  fromIndex: number;
  toIndex:   number;
}

export interface SortableOptions {
  /** CSS selector for sortable child items. Default: `'> *'` */
  items?: string;
  /** CSS selector for a drag handle within each item. Drag only initiates from matching elements. */
  handle?: string;
  /** How to render the drag helper. Default: `'original'` */
  helper?: 'original' | 'clone' | ((item: HTMLElement) => HTMLElement);
  /** Pixels the pointer must move before drag activates. Default: `5` */
  distance?: number;
  /** How to compute the insertion point. Default: `'pointer'` */
  tolerance?: 'pointer' | 'intersect';
  /**
   * Container elements of other Sortable instances to allow cross-list dragging.
   * Instances are resolved at drag time via `Sortable.from(el)`, so construction
   * order doesn't matter — simply pass each container element to the other list's
   * `connectWith` array and both instances will cross-link automatically.
   */
  connectWith?: HTMLElement[];
  /** Extra CSS class added to both placeholder elements. */
  placeholderClass?: string;
  /** Fires when the drag distance threshold is crossed and drag activates. */
  onStart?: ((info: SortableItemInfo) => void) | null;
  /** Fires when the pointer is released, before DOM changes are committed. */
  onStop?: ((info: SortableItemInfo) => void) | null;
  /** Fires after the item has been moved to its new DOM position. */
  onSorted?: ((info: SortableItemInfo) => void) | null;
}
