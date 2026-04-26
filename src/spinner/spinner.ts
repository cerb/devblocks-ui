/*!
 * Devblocks UI — Spinner
 *
 * Creates a CSS-animated loading spinner element. Append spinner.el wherever
 * needed; call destroy() to remove it from the DOM.
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import { SPINNER_SVG } from './icons';

export class Spinner {
  private static _instances = new WeakMap<HTMLSpanElement, Spinner>();
  readonly el: HTMLSpanElement;

  constructor() {
    this.el = document.createElement('span');
    this.el.className = 'dui-spinner';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-label', 'Loading');
    // One innerHTML write: constant SPINNER_SVG string only.
    this.el.innerHTML = SPINNER_SVG;
    Spinner._instances.set(this.el, this);
  }

  static from(el: HTMLSpanElement): Spinner | undefined {
    return Spinner._instances.get(el);
  }

  destroy(): void {
    Spinner._instances.delete(this.el);
    this.el.remove();
  }
}
