/**
 * Toggle track + knob SVG. Constant string — never user-controlled.
 * This is the only innerHTML write in the toggle component (see toggle.ts).
 *
 * Track: 40×22 pill. Knob: circle r=8 at cx=11 (off) → cx=29 (on, +18px).
 */
export const TOGGLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="22" viewBox="0 0 40 22"' +
  ' aria-hidden="true" focusable="false">' +
  '<rect class="dui-toggle-track" width="40" height="22" rx="11"/>' +
  '<circle class="dui-toggle-knob" cx="11" cy="11" r="8"/>' +
  '</svg>';
