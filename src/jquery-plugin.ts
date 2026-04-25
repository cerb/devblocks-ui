import { Menu } from './menu/menu';
import type { MenuOptions } from './menu/types';
import { Toggle } from './toggle/toggle';
import type { ToggleOptions } from './toggle/types';
import { Tabs } from './tabs/tabs';
import type { TabsOptions } from './tabs/types';
import { Dialog } from './dialog/dialog';
import type { DialogOptions } from './dialog/types';

interface MenuPluginOptions extends MenuOptions {
  /** Trigger element (CSS selector or DOM element) that toggles the menu. */
  trigger?: string | Element;
}

interface DialogPluginOptions extends DialogOptions {
  /** Trigger element (CSS selector or DOM element) that toggles the dialog. */
  trigger?: string | Element;
}

// Minimal jQuery surface — no @types/jquery dependency.
interface JQuery {
  each(cb: (this: HTMLElement) => void): JQuery;
  data(key: string, value: unknown): JQuery;
  on(event: string, cb: (this: HTMLElement, e: Event) => void): JQuery;
}
interface JQueryStatic {
  (sel: string | Element): JQuery;
  fn: Record<string, unknown>;
}

/**
 * Optional jQuery glue. Mirrors the jQuery UI menu init pattern:
 *
 *   $('ul#my-menu').duiMenu({ trigger: '#open-btn', onSelect: fn });
 *
 * Gated on `typeof jQuery !== 'undefined'` — never required at runtime.
 */
export function registerJQueryPlugin(): void {
  const $ = (globalThis as { jQuery?: JQueryStatic }).jQuery;
  if (!$) return;

  if (!$.fn['duiMenu']) {
    $.fn['duiMenu'] = function (this: JQuery, opts: MenuPluginOptions = {}): JQuery {
      return this.each(function (this: HTMLElement) {
        const ul = this as HTMLUListElement;
        const menu = new Menu(ul, opts);
        $(ul).data('duiMenu', menu);

        if (opts.trigger) {
          const $trig = $(opts.trigger);
          $trig.data('duiMenu', menu);
          $trig.on('click', function (this: HTMLElement, e: Event) {
            e.stopPropagation();
            if (menu.isOpen()) menu.close();
            else menu.open(this);
          });
        }
      });
    };
  }

  if (!$.fn['duiToggle']) {
    $.fn['duiToggle'] = function (this: JQuery, opts: ToggleOptions = {}): JQuery {
      return this.each(function (this: HTMLElement) {
        const input = this as HTMLInputElement;
        const t = new Toggle(input, opts);
        $(input).data('duiToggle', t);
      });
    };
  }

  if (!$.fn['duiTabs']) {
    $.fn['duiTabs'] = function (this: JQuery, opts: TabsOptions = {}): JQuery {
      return this.each(function (this: HTMLElement) {
        const ul = this as HTMLUListElement;
        const tabs = new Tabs(ul, opts);
        $(ul).data('duiTabs', tabs);
      });
    };
  }

  if (!$.fn['duiDialog']) {
    $.fn['duiDialog'] = function (this: JQuery, opts: DialogPluginOptions = {}): JQuery {
      return this.each(function (this: HTMLElement) {
        const d = new Dialog(this, opts);
        $(this).data('duiDialog', d);

        if (opts.trigger) {
          const $trig = $(opts.trigger);
          $trig.data('duiDialog', d);
          $trig.on('click', function () {
            if (d.isOpen()) d.close();
            else d.open();
          });
        }
      });
    };
  }
}
