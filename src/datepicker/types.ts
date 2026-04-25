export interface DatePickerOptions {
  startOfWeek?: 'mon' | 'sun';
  format?: string;
  defaultDate?: Date | string | null;
  onSelect?: ((date: Date, formatted: string) => void) | null;
}
