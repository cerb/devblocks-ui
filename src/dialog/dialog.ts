import type { DialogOptions } from './types';
import { MINIMIZE_SVG, RESTORE_SVG, CLOSE_SVG } from './icons';

interface ResolvedOpts {
  title:      string;
  draggable:  boolean;
  resizable:  boolean;
  closable:   boolean;
  width:      number;
  minWidth:   number;
  minHeight:  number;
  position:   { x: number; y: number } | null;
  onOpen:     (() => void) | null;
  onClose:    (() => void) | null;
  onMinimize: ((minimized: boolean) => void) | null;
}

const DEFAULTS: ResolvedOpts = {
  title:      '',
  draggable:  true,
  resizable:  true,
  closable:   true,
  width:      400,
  minWidth:   200,
  minHeight:  80,
  position:   null,
  onOpen:     null,
  onClose:    null,
  onMinimize: null,
};

export class Dialog {
  private static _uid = 0;
  private static _zTop = 10000;
  private static _instances = new WeakMap<HTMLElement, Dialog>();

  readonly el: HTMLDivElement;

  private readonly opts: ResolvedOpts;
  private readonly uid: number;
  private readonly titleEl: HTMLSpanElement;
  private readonly minimizeBtn: HTMLButtonElement;
  private readonly innerContent: HTMLElement;
  private readonly origParent: ParentNode | null;
  private readonly origNextSibling: ChildNode | null;

  private x = 0;
  private y = 0;
  private w: number;
  private h: number | null = null; // null = auto until first north/south resize

  private minimized = false;
  private _open = false;
  private docKeydown: ((e: KeyboardEvent) => void) | null = null;

  constructor(contentEl: HTMLElement, opts: DialogOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    this.uid = ++Dialog._uid;
    this.w = this.opts.width;

    this.innerContent = contentEl;
    this.origParent = contentEl.parentNode;
    this.origNextSibling = contentEl.nextSibling;

    const titleId = `dui-dialog-${this.uid}-title`;

    const dlg = document.createElement('div');
    dlg.className =
      'dui-dialog dui-dialog-hidden' +
      (this.opts.draggable ? ' dui-dialog-draggable' : '') +
      (this.opts.resizable ? ' dui-dialog-resizable' : '');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'false');
    dlg.setAttribute('aria-labelledby', titleId);
    dlg.style.width = this.w + 'px';
    this.el = dlg;

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'dui-dialog-titlebar';

    const titleEl = document.createElement('span');
    titleEl.className = 'dui-dialog-title';
    titleEl.id = titleId;
    titleEl.textContent = this.opts.title;
    this.titleEl = titleEl;
    titlebar.appendChild(titleEl);

    const controls = document.createElement('div');
    controls.className = 'dui-dialog-controls';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'dui-dialog-btn dui-dialog-btn-minimize';
    minimizeBtn.type = 'button';
    minimizeBtn.setAttribute('aria-label', 'Minimize');
    minimizeBtn.innerHTML = MINIMIZE_SVG; // constant SVG string, not user data
    minimizeBtn.addEventListener('click', this.onMinimizeClick);
    this.minimizeBtn = minimizeBtn;
    controls.appendChild(minimizeBtn);

    if (this.opts.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dui-dialog-btn dui-dialog-btn-close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = CLOSE_SVG; // constant SVG string, not user data
      closeBtn.addEventListener('click', this.onCloseClick);
      controls.appendChild(closeBtn);
    }

    titlebar.appendChild(controls);
    dlg.appendChild(titlebar);

    // Content
    const contentWrap = document.createElement('div');
    contentWrap.className = 'dui-dialog-content';
    contentWrap.appendChild(contentEl);
    dlg.appendChild(contentWrap);

    // Resize handles
    if (this.opts.resizable) {
      for (const dir of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
        const handle = document.createElement('div');
        handle.className = 'dui-dialog-resize';
        handle.dataset['dir'] = dir;
        handle.setAttribute('aria-hidden', 'true');
        dlg.appendChild(handle);
      }
    }

    // Single capture-phase listener routes drag, resize, and z-index focus.
    dlg.addEventListener('pointerdown', this.onPointerDown, true);

    document.body.appendChild(dlg);
    Dialog._instances.set(contentEl, this);
  }

  static from(el: HTMLElement): Dialog | undefined {
    return Dialog._instances.get(el);
  }

  open(): void {
    if (this._open) return;
    this._open = true;

    // Measure while invisible to determine centering position.
    this.el.style.visibility = 'hidden';
    this.el.classList.remove('dui-dialog-hidden');

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = this.el.offsetWidth;
    const h  = this.el.offsetHeight;

    if (this.opts.position) {
      this.x = this.opts.position.x;
      this.y = this.opts.position.y;
    } else {
      this.x = Math.max(0, Math.round((vw - w) / 2));
      this.y = Math.max(0, Math.round((vh - h) / 3));
    }

    this.el.style.left = this.x + 'px';
    this.el.style.top  = this.y + 'px';
    this.el.style.visibility = '';

    this.bringToFront();

    this.docKeydown = (e: KeyboardEvent) => {
      // Only the topmost dialog responds to Escape.
      if (e.key === 'Escape' && this.el.style.zIndex === String(Dialog._zTop)) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.docKeydown);

    this.opts.onOpen?.();
  }

  close(): void {
    if (!this._open) return;
    this._open = false;
    this.el.classList.add('dui-dialog-hidden');

    if (this.minimized) {
      this.minimized = false;
      this.el.classList.remove('dui-dialog-minimized');
      this.minimizeBtn.innerHTML = MINIMIZE_SVG; // constant SVG string, not user data
      this.minimizeBtn.setAttribute('aria-label', 'Minimize');
    }

    if (this.docKeydown) {
      document.removeEventListener('keydown', this.docKeydown);
      this.docKeydown = null;
    }

    this.opts.onClose?.();
  }

  isOpen(): boolean {
    return this._open;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  destroy(): void {
    Dialog._instances.delete(this.innerContent);
    if (this._open) this.close();

    this.el.removeEventListener('pointerdown', this.onPointerDown, true);

    if (this.origParent) {
      this.origParent.insertBefore(this.innerContent, this.origNextSibling);
    }

    this.el.remove();
  }

  private bringToFront(): void {
    Dialog._zTop++;
    this.el.style.zIndex = String(Dialog._zTop);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.bringToFront();

    const target = e.target as Element;

    const handle = target.closest<HTMLElement>('.dui-dialog-resize');
    if (handle) {
      if (this.opts.resizable && !this.minimized) {
        e.preventDefault();
        this.startResize(e, handle.dataset['dir'] ?? '');
      }
      return;
    }

    // Drag by titlebar works in both normal and minimized states.
    if (
      this.opts.draggable &&
      !target.closest('.dui-dialog-controls') &&
      target.closest('.dui-dialog-titlebar')
    ) {
      e.preventDefault();
      this.startDrag(e);
    }
  };

  private onMinimizeClick = (): void => {
    this.minimized = !this.minimized;
    this.el.classList.toggle('dui-dialog-minimized', this.minimized);
    // Swap between two constant SVG strings, not user data.
    this.minimizeBtn.innerHTML = this.minimized ? RESTORE_SVG : MINIMIZE_SVG;
    this.minimizeBtn.setAttribute('aria-label', this.minimized ? 'Restore' : 'Minimize');
    this.opts.onMinimize?.(this.minimized);
  };

  private onCloseClick = (): void => {
    this.close();
  };

  private startDrag(startEvent: PointerEvent): void {
    const offsetX = startEvent.clientX - this.x;
    const offsetY = startEvent.clientY - this.y;

    const onMove = (e: PointerEvent) => {
      this.x = e.clientX - offsetX;
      this.y = e.clientY - offsetY;
      this.el.style.left = this.x + 'px';
      this.el.style.top  = this.y + 'px';
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  private startResize(startEvent: PointerEvent, dir: string): void {
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startW = this.el.offsetWidth;
    const startLeft = this.x;
    const startTop  = this.y;

    const affectsH = dir.includes('n') || dir.includes('s');
    if (affectsH && this.h === null) this.h = this.el.offsetHeight;
    const startH = this.h ?? 0;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newW    = startW;
      let newH    = startH;
      let newLeft = startLeft;
      let newTop  = startTop;

      if (dir.includes('e')) newW = Math.max(this.opts.minWidth, startW + dx);
      if (dir.includes('w')) {
        newW    = Math.max(this.opts.minWidth, startW - dx);
        newLeft = startLeft + (startW - newW);
      }
      if (dir.includes('s')) newH = Math.max(this.opts.minHeight, startH + dy);
      if (dir.includes('n')) {
        newH   = Math.max(this.opts.minHeight, startH - dy);
        newTop = startTop + (startH - newH);
      }

      this.w = newW;
      this.x = newLeft;
      this.y = newTop;

      this.el.style.width = newW + 'px';
      this.el.style.left  = newLeft + 'px';
      this.el.style.top   = newTop + 'px';

      if (affectsH) {
        this.h = newH;
        this.el.style.height = newH + 'px';
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
}
