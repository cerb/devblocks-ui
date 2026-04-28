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
  /** Execute <script> elements found in dynamically loaded panel HTML.
   *  Defaults to false. Enable only when fetching from trusted endpoints
   *  and your page has a CSP nonce or equivalent protection. */
  executeScripts?: boolean;
  /** Persist the active tab index in localStorage and restore it on re-init.
   *  Value is the tab set's unique key (e.g. 'ticketProfile'). Final storage
   *  key: `${storagePrefix}[${remember}]`. An explicit active option takes precedence. */
  remember?: string;
  /** Prefix for the localStorage key composed with remember. Default: 'dui-tabs'.
   *  Final key: `${storagePrefix}[${remember}]`. */
  storagePrefix?: string;
}
