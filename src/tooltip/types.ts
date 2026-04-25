export type TargetInput = string | HTMLElement | { get(index: 0): HTMLElement };

export interface TooltipOptions {
  target?: TargetInput;
  maxWidth?: number;
  onOpen?: () => void;
  onClose?: () => void;
}
