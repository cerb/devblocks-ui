export interface TabInfo {
  index: number;
  isDynamic: boolean;
  /** The raw href value: '#anchor' for anchor tabs, '/url' for dynamic tabs. */
  href: string;
  li: HTMLLIElement;
  panel: HTMLDivElement;
}

export interface TabsOptions {
  /** 0-based index of the initially active tab (default: 0). */
  active?: number;
  /** Fires after a tab panel is shown. */
  onTabSelected?: ((index: number, tab: TabInfo) => void) | null;
  /** Fires before a tab is activated. Return false to cancel. */
  onBeforeTabLoad?: ((index: number, tab: TabInfo) => boolean | void) | null;
}
