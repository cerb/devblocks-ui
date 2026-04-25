/**
 * Spinner arc SVG. Constant string — never user-controlled.
 * This is the only innerHTML write in the Spinner component (see spinner.ts).
 *
 * r=8 circle; circumference ≈ 50.27. dasharray "12.57 37.70" shows ~25% of the
 * arc; CSS animation on the parent SVG element spins it.
 */
export const SPINNER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"' +
  ' aria-hidden="true" focusable="false">' +
  '<circle cx="10" cy="10" r="8"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-dasharray="12.57 37.70"/>' +
  '</svg>';
