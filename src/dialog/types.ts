export interface DialogOptions {
  title?:      string;
  draggable?:  boolean;
  resizable?:  boolean;
  closable?:   boolean;
  width?:      number;
  minWidth?:   number;
  minHeight?:  number;
  position?:   { x: number; y: number };
  onOpen?:     (() => void) | null;
  onClose?:    (() => void) | null;
  onMinimize?: ((minimized: boolean) => void) | null;
}
