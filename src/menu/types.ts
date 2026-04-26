/**
 * Public option type for the Menu component.
 */
export interface MenuOptions {
  /** Called when a leaf item is clicked or activated via Enter. */
  onSelect?: ((renderedLi: HTMLLIElement, sourceLi: HTMLLIElement) => void) | null;
  /** Called when the menu finishes closing (panels removed). Not fired for inline menus on leaf selection, which collapse submenus but stay open. */
  onClose?: (() => void) | null;
  /** Item height in px — must match CSS .dui-menu-item height. Default 28. */
  itemHeight?: number;
  /** Max panel height before vertical scroll kicks in. Default 380. */
  maxHeight?: number;
  /** Virtualize panels with more items than this. Default 60. */
  virtThreshold?: number;
  /** Hover delay (ms) before a submenu opens. Default 80. */
  openDelay?: number;
  /** Extra rows rendered above/below the visible window. Default 6. */
  virtBuffer?: number;
  /**
   * Render the root panel inline in the document flow (inserted after the
   * source UL) rather than floating via position:fixed.  Submenus still
   * float.  The menu opens automatically on construction; leaf selection
   * collapses submenus but keeps the root visible.  close() still works.
   */
  inline?: boolean;
}

/**
 * Internal parsed item — the result of walking the source UL once.
 * Children are created lazily only where sub-ULs exist.
 */
export interface MenuItem {
  label: string;
  separator?: boolean;
  /** The original source LI — passed back as the second arg to onSelect. */
  el: HTMLLIElement;
  children: MenuItem[] | null;
}
