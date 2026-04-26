import type { DatePickerOptions } from './types';
import { PREV_YEAR_SVG, PREV_MONTH_SVG, NEXT_MONTH_SVG, NEXT_YEAR_SVG, TOGGLE_SVG } from './icons';

// parseFormat is intentionally omitted from Required — undefined means "fall back to outputFormat".
type ResolvedOpts = Required<Omit<DatePickerOptions, 'onSelect' | 'parseFormat'>> & Pick<DatePickerOptions, 'onSelect' | 'parseFormat'>;

const DEFAULTS: ResolvedOpts = {
  startOfWeek:  'mon',
  outputFormat: 'YYYY-MM-DD',
  trigger:      'auto',
  onSelect:     null,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ABBREVS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEKDAY_ABBREVS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export class DatePicker {
  private static _uid = 0;
  private static _instances = new WeakMap<HTMLInputElement, DatePicker>();

  readonly el: HTMLDivElement;

  private readonly inputEl: HTMLInputElement;
  private readonly opts: ResolvedOpts;
  private readonly uid: number;

  private viewYear: number;
  private viewMonth: number;
  private selectedDate: Date | null;

  private readonly headerCaption: HTMLElement;
  private readonly daysGrid: HTMLElement;

  private docClick:   ((e: MouseEvent)   => void) | null = null;
  private docKeydown: ((e: KeyboardEvent) => void) | null = null;

  // Only used in 'auto' trigger mode.
  // pointerdown fires before focus; set this flag so onInputFocus can yield to onInputClick.
  private _pointerDown = false;
  // Prevents the focus handler from reopening after our own inputEl.focus() calls.
  private _ignoreNextFocus = false;

  // Only present in 'button' trigger mode.
  private toggleBtn: HTMLButtonElement | null = null;

  constructor(inputEl: HTMLInputElement, opts: DatePickerOptions = {}) {
    this.inputEl = inputEl;
    this.uid     = ++DatePicker._uid;

    this.opts = { ...DEFAULTS, ...opts };

    const existingVal = inputEl.value.trim();
    const initFmt     = this.opts.parseFormat ?? this.opts.outputFormat;
    const defaultDate = existingVal ? this.parseDate(existingVal, initFmt) : null;

    const seed = defaultDate ?? new Date();
    this.viewYear     = seed.getFullYear();
    this.viewMonth    = seed.getMonth();
    this.selectedDate = defaultDate;

    // Build popup
    this.el = document.createElement('div');
    this.el.className = 'dui-datepicker';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'false');
    this.el.setAttribute('aria-label', 'Calendar');
    this.el.setAttribute('id', `dui-datepicker-${this.uid}`);
    this.el.setAttribute('hidden', '');

    const header = this.buildHeader();
    this.headerCaption = header.querySelector('.dui-datepicker-caption') as HTMLElement;

    const weekdaysRow = this.buildWeekdaysRow();

    this.daysGrid = document.createElement('div');
    this.daysGrid.className = 'dui-datepicker-days';

    this.el.appendChild(header);
    this.el.appendChild(weekdaysRow);
    this.el.appendChild(this.daysGrid);

    document.body.appendChild(this.el);

    this.renderGrid();

    this.inputEl.setAttribute('autocomplete', 'off');
    this.inputEl.addEventListener('input',   this.onInputInput);
    this.inputEl.addEventListener('keydown', this.onInputKeydown);

    if (this.opts.trigger === 'button') {
      this.toggleBtn = this.buildToggleBtn();
      this.inputEl.insertAdjacentElement('afterend', this.toggleBtn);
    } else {
      this.inputEl.addEventListener('pointerdown', this.onInputPointerdown);
      this.inputEl.addEventListener('focus',       this.onInputFocus);
      this.inputEl.addEventListener('click',       this.onInputClick);
    }
    DatePicker._instances.set(inputEl, this);
  }

  static from(el: HTMLInputElement): DatePicker | undefined {
    return DatePicker._instances.get(el);
  }

  // ── DOM builders ────────────────────────────────────────────────────────

  private buildToggleBtn(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dui-datepicker-toggle';
    btn.setAttribute('aria-label', 'Open calendar');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-controls', `dui-datepicker-${this.uid}`);
    btn.innerHTML = TOGGLE_SVG; // constant SVG, not user data
    btn.addEventListener('click', this.onToggleClick);
    return btn;
  }

  private onToggleClick = (): void => {
    if (this.isOpen()) {
      this.close();
      this.inputEl.focus();
    } else {
      // Sync to whatever the user typed while the calendar was closed.
      const parsed = this.parseDate(this.inputEl.value, this.opts.outputFormat);
      if (parsed) {
        this.selectedDate = parsed;
        this.viewYear  = parsed.getFullYear();
        this.viewMonth = parsed.getMonth();
      }
      this.openAndFocus();
    }
  };

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'dui-datepicker-header';

    const prevYear  = this.makeNavBtn('dui-datepicker-prev-year',  'Previous year',  PREV_YEAR_SVG,  () => this.shiftYear(-1));
    const prevMonth = this.makeNavBtn('dui-datepicker-prev-month', 'Previous month', PREV_MONTH_SVG, () => this.shiftMonth(-1));

    const caption = document.createElement('div');
    caption.className = 'dui-datepicker-caption';

    const nextMonth = this.makeNavBtn('dui-datepicker-next-month', 'Next month', NEXT_MONTH_SVG, () => this.shiftMonth(1));
    const nextYear  = this.makeNavBtn('dui-datepicker-next-year',  'Next year',  NEXT_YEAR_SVG,  () => this.shiftYear(1));

    header.appendChild(prevYear);
    header.appendChild(prevMonth);
    header.appendChild(caption);
    header.appendChild(nextMonth);
    header.appendChild(nextYear);

    return header;
  }

  private makeNavBtn(cls: string, label: string, svgStr: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dui-datepicker-nav ${cls}`;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = svgStr; // constant SVG string, not user data
    btn.addEventListener('click', handler);
    return btn;
  }

  private buildWeekdaysRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'dui-datepicker-weekdays';
    row.setAttribute('aria-hidden', 'true');

    const order = this.opts.startOfWeek === 'sun'
      ? [0, 1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6, 0];

    for (const i of order) {
      const cell = document.createElement('span');
      cell.className = 'dui-datepicker-weekday';
      cell.textContent = WEEKDAY_ABBREVS[i];
      row.appendChild(cell);
    }

    return row;
  }

  // ── Grid rendering ───────────────────────────────────────────────────────

  private renderGrid(): void {
    this.headerCaption.textContent = `${MONTH_NAMES[this.viewMonth]} ${this.viewYear}`;

    this.daysGrid.textContent = '';

    const year  = this.viewYear;
    const month = this.viewMonth;

    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();

    const offset = this.opts.startOfWeek === 'sun' ? firstDow : (firstDow + 6) % 7;

    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    const selY = this.selectedDate?.getFullYear() ?? -1;
    const selM = this.selectedDate?.getMonth()    ?? -1;
    const selD = this.selectedDate?.getDate()     ?? -1;

    let firstCurrentTabTarget: HTMLButtonElement | null = null;

    for (let i = 0; i < 42; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dui-datepicker-day';
      btn.setAttribute('tabindex', '-1');

      let cellYear: number;
      let cellMonth: number;
      let cellDay: number;

      if (i < offset) {
        cellMonth = month === 0 ? 11 : month - 1;
        cellYear  = month === 0 ? year - 1 : year;
        cellDay   = daysInPrev - offset + i + 1;
        btn.classList.add('dui-datepicker-day-other');
      } else if (i < offset + daysInMonth) {
        cellYear  = year;
        cellMonth = month;
        cellDay   = i - offset + 1;

        if (cellYear === todayY && cellMonth === todayM && cellDay === todayD) {
          btn.classList.add('dui-datepicker-day-today');
          btn.setAttribute('aria-current', 'date');
        }
        if (cellYear === selY && cellMonth === selM && cellDay === selD) {
          btn.classList.add('dui-datepicker-day-selected');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('tabindex', '0');
        }
        if (!firstCurrentTabTarget) firstCurrentTabTarget = btn;
      } else {
        cellMonth = month === 11 ? 0 : month + 1;
        cellYear  = month === 11 ? year + 1 : year;
        cellDay   = i - offset - daysInMonth + 1;
        btn.classList.add('dui-datepicker-day-other');
      }

      btn.textContent = String(cellDay!);
      btn.dataset['y'] = String(cellYear!);
      btn.dataset['m'] = String(cellMonth!);
      btn.dataset['d'] = String(cellDay!);

      const cy = cellYear!;
      const cm = cellMonth!;
      const cd = cellDay!;
      btn.addEventListener('click', () => this.selectDate(new Date(cy, cm, cd)));

      this.daysGrid.appendChild(btn);
    }

    const hasSelected = this.daysGrid.querySelector('.dui-datepicker-day-selected');
    if (!hasSelected && firstCurrentTabTarget) {
      firstCurrentTabTarget.setAttribute('tabindex', '0');
    }
  }

  // ── Date helpers ─────────────────────────────────────────────────────────

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return this.opts.outputFormat.replace(/YYYY|YY|MMM|MM|M|DDD|DD|D/g, (token) => {
      switch (token) {
        case 'YYYY': return String(y);
        case 'YY':   return String(y).slice(-2);
        case 'MMM':  return MONTH_ABBREVS[m - 1]!;
        case 'MM':   return String(m).padStart(2, '0');
        case 'M':    return String(m);
        case 'DDD':  return DAY_ABBREVS[date.getDay()]!;
        case 'DD':   return String(d).padStart(2, '0');
        case 'D':    return String(d);
        default:     return token;
      }
    });
  }

  private parseDate(str: string, fmt: string): Date | null {
    try {
      const tokens: string[] = [];
      const escapedFmt = fmt
        .replace(/[-/.()\[\]{}^$*+?|\\]/g, '\\$&')
        .replace(/YYYY|YY|MMM|MM|M|DDD|DD|D/g, (t) => {
          tokens.push(t);
          return (t === 'MMM' || t === 'DDD') ? '([A-Za-z]{3})' : '(\\d+)';
        });

      // No trailing $ — allows optional time suffixes like " 12:00 am" to be ignored.
      const match = str.match(new RegExp('^' + escapedFmt));
      if (!match) return null;

      let year = new Date().getFullYear();
      let month = 0;
      let day = 1;

      tokens.forEach((token, i) => {
        const raw = match[i + 1]!;
        switch (token) {
          case 'YYYY': year = parseInt(raw, 10); break;
          case 'YY':   year = 2000 + parseInt(raw, 10); break;
          case 'MMM': {
            const idx = MONTH_ABBREVS.findIndex(a => a.toLowerCase() === raw.toLowerCase());
            if (idx !== -1) month = idx;
            break;
          }
          case 'MM':
          case 'M':    month = parseInt(raw, 10) - 1; break;
          case 'DDD':  break; // weekday name — position consumed, value ignored
          case 'DD':
          case 'D':    day = parseInt(raw, 10); break;
        }
      });

      const result = new Date(year, month, day);
      return isNaN(result.getTime()) ? null : result;
    } catch {
      return null;
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  private shiftMonth(delta: number): void {
    let m = this.viewMonth + delta;
    let y = this.viewYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    this.viewMonth = m;
    this.viewYear  = y;
    this.renderGrid();
  }

  private shiftYear(delta: number): void {
    this.viewYear += delta;
    this.renderGrid();
  }

  // ── Selection ────────────────────────────────────────────────────────────

  private selectDate(date: Date): void {
    this.selectedDate = date;
    const formatted = this.formatDate(date);
    this.inputEl.value = formatted;
    this.inputEl.dispatchEvent(new Event('input',  { bubbles: true }));
    this.inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    this.opts.onSelect?.(date, formatted);
    this.close();
    if (document.activeElement !== this.inputEl) {
      if (this.opts.trigger === 'auto') this._ignoreNextFocus = true;
      this.inputEl.focus();
    }
  }

  // ── Positioning ──────────────────────────────────────────────────────────

  private position(): void {
    const rect = this.inputEl.getBoundingClientRect();
    const calH = this.el.offsetHeight || 300;
    const calW = this.el.offsetWidth  || 272;

    // Flip above the input if there isn't enough space below in the viewport.
    const topViewport = (window.innerHeight - rect.bottom >= calH + 8 || rect.top < calH + 8)
      ? rect.bottom + 4
      : rect.top - calH - 4;

    // Clamp so the right edge doesn't leave the viewport.
    const leftViewport = Math.min(rect.left, document.documentElement.clientWidth - calW - 8);

    // Add scroll offset — the popup is position:absolute relative to the document.
    this.el.style.top  = `${topViewport  + window.scrollY}px`;
    this.el.style.left = `${Math.max(8, leftViewport) + window.scrollX}px`;
  }

  // ── Open / Close ─────────────────────────────────────────────────────────

  // Shows the calendar without stealing focus — safe to call while typing.
  open(): void {
    if (!this.el.hasAttribute('hidden')) return;
    if (this.selectedDate) {
      this.viewYear  = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
      this.renderGrid();
    }
    this.el.removeAttribute('hidden');
    this.position();
    this.attachDocListeners();
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', 'true');
      this.toggleBtn.setAttribute('aria-label', 'Close calendar');
    }
  }

  // Opens and moves keyboard focus into the grid (for click / tab interactions).
  private openAndFocus(): void {
    this.open();
    const focusTarget = (
      this.daysGrid.querySelector<HTMLElement>('.dui-datepicker-day-selected') ??
      this.daysGrid.querySelector<HTMLElement>('.dui-datepicker-day-today') ??
      this.daysGrid.querySelector<HTMLElement>('[tabindex="0"]')
    );
    focusTarget?.focus();
  }

  close(): void {
    if (this.el.hasAttribute('hidden')) return;
    this.el.setAttribute('hidden', '');
    if (this.docClick)   { document.removeEventListener('click',   this.docClick);   this.docClick   = null; }
    if (this.docKeydown) { document.removeEventListener('keydown', this.docKeydown); this.docKeydown = null; }
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      this.toggleBtn.setAttribute('aria-label', 'Open calendar');
    }
  }

  isOpen(): boolean {
    return !this.el.hasAttribute('hidden');
  }

  private attachDocListeners(): void {
    this.docClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!this.el.contains(t) && t !== this.inputEl && t !== this.toggleBtn) {
        this.close();
      }
    };
    this.docKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        if (document.activeElement !== this.inputEl) {
          // In 'auto' mode suppress the focus handler so it doesn't reopen.
          if (this.opts.trigger === 'auto') this._ignoreNextFocus = true;
          this.inputEl.focus();
        }
      } else if (e.key === 'Tab') {
        this.close();
      } else if (document.activeElement !== this.inputEl) {
        // Arrow-key grid navigation only when focus is inside the calendar.
        this.handleGridKeydown(e);
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('click',   this.docClick!);
      document.addEventListener('keydown', this.docKeydown!);
    });
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────

  private handleGridKeydown(e: KeyboardEvent): void {
    const days = Array.from(this.daysGrid.querySelectorAll<HTMLButtonElement>('.dui-datepicker-day'));
    const idx  = days.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;

    let newIdx = idx;

    switch (e.key) {
      case 'ArrowLeft':  newIdx = idx - 1; break;
      case 'ArrowRight': newIdx = idx + 1; break;
      case 'ArrowUp':    newIdx = idx - 7; break;
      case 'ArrowDown':  newIdx = idx + 7; break;
      case 'Home':       newIdx = idx - (idx % 7); break;
      case 'End':        newIdx = idx - (idx % 7) + 6; break;
      case 'PageUp':
        e.preventDefault();
        e.shiftKey ? this.shiftYear(-1) : this.shiftMonth(-1);
        return;
      case 'PageDown':
        e.preventDefault();
        e.shiftKey ? this.shiftYear(1) : this.shiftMonth(1);
        return;
      default: return;
    }

    e.preventDefault();

    if (newIdx < 0)            { this.shiftMonth(-1); return; }
    if (newIdx >= days.length) { this.shiftMonth(1);  return; }

    days[idx].setAttribute('tabindex', '-1');
    days[newIdx].setAttribute('tabindex', '0');
    days[newIdx].focus();
  }

  // ── Input listeners ──────────────────────────────────────────────────────

  // pointerdown fires before focus — set flag so onInputFocus can yield to onInputClick.
  private onInputPointerdown = (): void => {
    this._pointerDown = true;
  };

  // Opens on tab-focus. Skipped when the focus came from a pointer click
  // (_pointerDown) or from our own inputEl.focus() call (_ignoreNextFocus).
  private onInputFocus = (): void => {
    if (this._pointerDown)      { this._pointerDown = false; return; }
    if (this._ignoreNextFocus)  { this._ignoreNextFocus = false; return; }
    if (!this.isOpen()) this.openAndFocus();
  };

  // Shows the calendar on click without stealing focus — the user may want to type.
  // Resets _pointerDown so the flag doesn't linger if focus was skipped.
  private onInputClick = (): void => {
    this._pointerDown = false;
    if (!this.isOpen()) this.open();
  };

  // Live-parse the typed value and navigate the calendar to match.
  // In 'auto' mode, also reopens the calendar if it was dismissed while the input still has focus.
  private onInputInput = (): void => {
    if (!this.isOpen()) {
      if (this.opts.trigger === 'auto' && this.inputEl.value.trim()) this.open();
    }
    if (!this.isOpen()) return;

    const parsed = this.parseDate(this.inputEl.value, this.opts.outputFormat);
    if (parsed) {
      this.selectedDate = parsed;
      this.viewYear  = parsed.getFullYear();
      this.viewMonth = parsed.getMonth();
      this.renderGrid();
    }
  };

  // Enter confirms a valid typed date. ArrowDown moves focus into the grid.
  private onInputKeydown = (e: KeyboardEvent): void => {
    if (!this.isOpen()) return;
    if (e.key === 'Enter') {
      const parsed = this.parseDate(this.inputEl.value, this.opts.outputFormat);
      if (parsed) { e.preventDefault(); this.selectDate(parsed); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.daysGrid.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    }
  };

  // ── Public API ───────────────────────────────────────────────────────────

  setDate(date: Date | string | null): void {
    if (date === null) {
      this.selectedDate = null;
      this.inputEl.value = '';
    } else {
      const d = date instanceof Date ? date : this.parseDate(date, this.opts.outputFormat);
      this.selectedDate = d;
      if (d) this.inputEl.value = this.formatDate(d);
    }
    if (this.selectedDate) {
      this.viewYear  = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
    }
    this.renderGrid();
  }

  getDate(): Date | null {
    return this.selectedDate;
  }

  destroy(): void {
    DatePicker._instances.delete(this.inputEl);
    this.close();
    this.inputEl.removeEventListener('input',   this.onInputInput);
    this.inputEl.removeEventListener('keydown', this.onInputKeydown);
    if (this.toggleBtn) {
      this.toggleBtn.removeEventListener('click', this.onToggleClick);
      this.toggleBtn.remove();
    } else {
      this.inputEl.removeEventListener('pointerdown', this.onInputPointerdown);
      this.inputEl.removeEventListener('focus',       this.onInputFocus);
      this.inputEl.removeEventListener('click',       this.onInputClick);
    }
    this.el.remove();
  }
}
