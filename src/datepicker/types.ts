export interface DatePickerOptions {
  startOfWeek?: 'mon' | 'sun';
  /** Format used to parse a pre-existing value in the input on init. Defaults to outputFormat. */
  parseFormat?: string;
  /** Format used to write dates back to the input after selection. Default: 'YYYY-MM-DD'. */
  outputFormat?: string;
  /**
   * 'auto'   — calendar opens on input focus/click (default, existing behaviour).
   * 'button' — a toggle button is inserted after the input; calendar opens only via that button.
   *            Use this when the input has its own autocomplete to avoid conflicts.
   */
  trigger?: 'auto' | 'button';
  onSelect?: ((date: Date, formatted: string) => void) | null;
}
