/*!
 * Devblocks UI — Toggle
 *
 * Enhances an input[type=checkbox] with an animated binary switch visual.
 * The native input is visually hidden but remains in the DOM so it is still
 * accessible to screen readers, participates in form submission, and accepts
 * keyboard focus (Space to toggle, visible focus ring on the visual track).
 *
 * CSS is NOT injected by this component — include dist/devblocks-ui.css.
 */

import { TOGGLE_SVG } from './icons';
import type { ToggleOptions } from './types';

export class Toggle {
  private static _instances = new WeakMap<HTMLInputElement, Toggle>();
  private readonly input: HTMLInputElement;
  private readonly track: HTMLSpanElement;
  private readonly opts: ToggleOptions;
  // True when the input sits inside a <label>. In that case the browser's
  // native label activation reliably toggles the input on click (including in
  // Safari), so we do NOT add our own pointer listener — adding one would
  // cause a double-toggle because we'd fire AND the label would fire.
  private readonly inLabel: boolean;

  constructor(input: HTMLInputElement, opts: ToggleOptions = {}) {
    this.input = input;
    this.opts = opts;
    this.inLabel = !!input.closest('label');

    // Visually hide the native input; keep it accessible and form-submittable.
    input.classList.add('dui-toggle-input');

    this.track = document.createElement('span');
    this.track.className = 'dui-toggle';
    this.track.setAttribute('aria-hidden', 'true');
    // One innerHTML write: constant TOGGLE_SVG string only.
    this.track.innerHTML = TOGGLE_SVG;

    // Insert visual track immediately after the input so the CSS adjacent-
    // sibling selectors (:focus-visible + .dui-toggle, :disabled + .dui-toggle)
    // resolve correctly.
    input.insertAdjacentElement('afterend', this.track);
    this.syncVisual();

    // Only handle pointer events ourselves when there is no wrapping label.
    // When a label wraps the input, clicking the track bubbles to the label
    // which activates the input natively — adding our own listener on top
    // would toggle the input twice (net: no change).
    if (!this.inLabel) {
      this.track.addEventListener('pointerdown', this.onPointerDown);
    }
    this.input.addEventListener('change', this.onInputChange);
    Toggle._instances.set(input, this);
  }

  static from(el: HTMLInputElement): Toggle | undefined {
    return Toggle._instances.get(el);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  get checked(): boolean {
    return this.input.checked;
  }

  /** Programmatically set checked state without firing onChange. */
  set checked(value: boolean) {
    if (this.input.checked === value) return;
    this.input.checked = value;
    this.syncVisual();
  }

  /** Re-sync the visual from the current input.checked value.
   *  Call after any external programmatic change to input.checked. */
  sync(): void {
    this.syncVisual();
  }

  destroy(): void {
    Toggle._instances.delete(this.input);
    if (!this.inLabel) {
      this.track.removeEventListener('pointerdown', this.onPointerDown);
    }
    this.input.removeEventListener('change', this.onInputChange);
    this.input.classList.remove('dui-toggle-input');
    this.track.remove();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  // Only registered when !inLabel (see constructor).
  private onPointerDown = (e: PointerEvent): void => {
    if (this.input.disabled) return;
    if (e.button !== 0) return; // primary button / touch only
    e.preventDefault();
    this.input.checked = !this.input.checked;
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  private onInputChange = (): void => {
    this.syncVisual();
    this.opts.onChange?.(this.input.checked, this.input);
  };

  private syncVisual(): void {
    this.track.classList.toggle('dui-toggle--checked', this.input.checked);
  }
}
