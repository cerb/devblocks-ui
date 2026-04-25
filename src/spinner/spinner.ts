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
  readonly el: HTMLSpanElement;

  constructor() {
    this.el = document.createElement('span');
    this.el.className = 'dui-spinner';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-label', 'Loading');
    // One innerHTML write: constant SPINNER_SVG string only.
    this.el.innerHTML = SPINNER_SVG;
  }

  destroy(): void {
    this.el.remove();
  }
}
