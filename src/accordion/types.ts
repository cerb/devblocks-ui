export interface AccordionItemInfo {
  index: number;
  header: HTMLHeadingElement;
  panel: HTMLDivElement;
}

export interface AccordionOptions {
  active?: number;
  collapsible?: boolean;
  scrollable?: boolean;
  onExpand?: ((index: number, info: AccordionItemInfo) => void) | null;
  onCollapse?: ((index: number, info: AccordionItemInfo) => void) | null;
}
