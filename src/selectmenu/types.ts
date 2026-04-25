export interface SelectMenuOptions {
  onSelect?: ((value: string, text: string, option: HTMLOptionElement) => void) | null;
  onRender?: ((li: HTMLLIElement, option: HTMLOptionElement) => void) | null;
  itemHeight?: number;
  maxHeight?: number;
  virtThreshold?: number;
  virtBuffer?: number;
  placeholder?: string;
}
