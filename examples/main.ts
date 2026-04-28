import { Menu, Toggle, Tabs, Spinner, Dialog, Tooltip, DatePicker, SelectMenu, Accordion, Sortable } from 'devblocks-ui';
import type { MenuOptions } from 'devblocks-ui';
import 'devblocks-ui/styles';

declare const Prism: { highlightAllUnder: (root: ParentNode) => void } | undefined;

// ── Theme toggle ──────────────────────────────────────────────────────

const toggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const toggleLabel = toggle.querySelector('.theme-toggle-label') as HTMLElement;

function setTheme(dark: boolean): void {
  if (dark) document.documentElement.setAttribute('data-dui-theme', 'dark');
  else document.documentElement.removeAttribute('data-dui-theme');
  document.body.classList.toggle('page-dark', dark);
  toggle.setAttribute('aria-pressed', String(dark));
  toggleLabel.textContent = dark ? 'Light mode' : 'Dark mode';
}

toggle.addEventListener('click', () => {
  const isDark = toggle.getAttribute('aria-pressed') === 'true';
  setTheme(!isDark);
});

// Default to system preference on first load.
if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
  setTheme(true);
}

// ── Helper: wire a menu to a button + result output ───────────────────

function wireMenu(
  triggerId: string,
  ulId: string,
  resultId: string,
): void {
  const trigger = document.getElementById(triggerId) as HTMLButtonElement;
  const ul = document.getElementById(ulId) as HTMLUListElement;
  const result = document.getElementById(resultId) as HTMLElement;

  const menu = new Menu(ul, {
    onSelect: (_renderedLi, sourceLi) => {
      const id = sourceLi.dataset['id'] ?? '(no id)';
      const label = sourceLi.firstChild?.textContent?.trim() ?? '';
      result.textContent = `Selected: ${label} [${id}]`;
    },
  });

  trigger.addEventListener('click', () => {
    if (menu.isOpen()) menu.close();
    else menu.open(trigger);
  });
}

// ── Demo: small static ────────────────────────────────────────────────

wireMenu('menu-small-trigger', 'menu-small', 'menu-small-result');

(document.getElementById('code-menu-small-html') as HTMLElement).textContent = `
<button id="menu-small-trigger" type="button">Open menu</button>

<ul id="menu-small" hidden>
  <li data-id="new">New
    <ul>
      <li data-id="new.doc">Document</li>
      <li data-id="new.folder">Folder</li>
    </ul>
  </li>
  <li data-id="open">Open</li>
  <li data-id="save">Save</li>
  <li data-id="export">Export
    <ul>
      <li data-id="export.pdf">PDF</li>
      <li data-id="export.csv">CSV</li>
      <li data-id="export.json">JSON</li>
    </ul>
  </li>
  <li data-id="quit">Quit</li>
</ul>
`.trim();

(document.getElementById('code-menu-small') as HTMLElement).textContent = `
import { Menu } from 'devblocks-ui';
import 'devblocks-ui/styles';

const menu = new Menu(document.querySelector('ul#my-menu'), {
  // Callbacks
  onSelect:     (renderedLi, sourceLi, event) => {
    console.log('selected', sourceLi.dataset.id);
  },
  onClose:      () => { /* menu closed and panels removed */ },
  onRenderItem: (renderedLi, sourceLi) => { /* add icons, badges, etc. */ },
  // Layout
  itemHeight:    28,    // px — must match CSS .dui-menu-item height (default 28)
  maxHeight:     380,   // max panel height before scroll (default 380)
  virtThreshold: 60,    // virtualize panels with more items than this (default 60)
  virtBuffer:    6,     // extra rows above/below the visible window (default 6)
  openDelay:     80,    // ms hover delay before submenu opens (default 80)
  inline:        false, // render root panel in document flow (default false)
});

// Methods:
menu.open(anchorEl); // show (floating) — pass anchor element to position against
menu.open();         // re-open inline menu (no anchor needed)
menu.close();        // close and remove rendered panels
menu.isOpen();       // → boolean
menu.destroy();      // close, remove panels, detach all event listeners

// Retrieve an existing instance from the root element:
Menu.from(ul);       // → Menu | undefined
`.trim();

// ── Demo: large (5000 items) ──────────────────────────────────────────

const largeUl = document.getElementById('menu-large') as HTMLUListElement;
{
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 5000; i++) {
    const li = document.createElement('li');
    li.dataset['id'] = `item-${i}`;
    li.textContent = `Item ${i.toLocaleString()}`;
    frag.appendChild(li);
  }
  largeUl.appendChild(frag);
}
wireMenu('menu-large-trigger', 'menu-large', 'menu-large-result');

(document.getElementById('code-menu-large-html') as HTMLElement).textContent = `
<button id="menu-large-trigger" type="button">Open 5000-item menu</button>
<ul id="menu-large" hidden></ul>
`.trim();

(document.getElementById('code-menu-large') as HTMLElement).textContent = `
// Populate the source UL however you like — the menu parses it once.
const ul = document.querySelector('ul#menu-large');
for (let i = 1; i <= 5000; i++) {
  const li = document.createElement('li');
  li.dataset.id = 'item-' + i;
  li.textContent = 'Item ' + i;
  ul.appendChild(li);
}

const menu = new Menu(ul, {
  onSelect: (_renderedLi, sourceLi) => console.log(sourceLi.dataset.id),
  // Defaults: virtThreshold: 60, itemHeight: 28, maxHeight: 380, virtBuffer: 6
});
`.trim();

// ── Demo: deep nested ─────────────────────────────────────────────────

wireMenu('menu-deep-trigger', 'menu-deep', 'menu-deep-result');

(document.getElementById('code-menu-deep-html') as HTMLElement).textContent = `
<button id="menu-deep-trigger" type="button">Open deep menu</button>

<ul id="menu-deep" hidden>
  <li data-id="region.americas">Americas
    <ul>
      <li data-id="region.americas.us">United States
        <ul>
          <li data-id="region.americas.us.ca">California</li>
          <li data-id="region.americas.us.ny">New York</li>
          <li data-id="region.americas.us.tx">Texas</li>
        </ul>
      </li>
      <li data-id="region.americas.ca">Canada
        <ul>
          <li data-id="region.americas.ca.on">Ontario</li>
          <li data-id="region.americas.ca.qc">Quebec</li>
        </ul>
      </li>
      <li data-id="region.americas.mx">Mexico</li>
    </ul>
  </li>
  <li data-id="region.europe">Europe
    <ul>
      <li data-id="region.europe.uk">United Kingdom</li>
      <li data-id="region.europe.de">Germany</li>
      <li data-id="region.europe.fr">France</li>
      <li data-id="region.europe.es">Spain</li>
    </ul>
  </li>
  <li data-id="region.apac">Asia-Pacific
    <ul>
      <li data-id="region.apac.jp">Japan</li>
      <li data-id="region.apac.au">Australia</li>
      <li data-id="region.apac.in">India</li>
    </ul>
  </li>
</ul>
`.trim();

(document.getElementById('code-menu-deep') as HTMLElement).textContent = `
// Menu nests as deeply as the source UL/LI tree.
// Submenus auto-flip left or up if they'd overflow the viewport.

const menu = new Menu(document.querySelector('ul#menu-deep'), {
  onSelect: (_renderedLi, sourceLi) => {
    console.log('region:', sourceLi.dataset.id);
  },
});
`.trim();

// ── Demo: inline menu ─────────────────────────────────────────────────

{
  const inlineUl = document.getElementById('menu-inline') as HTMLUListElement;
  const result   = document.getElementById('menu-inline-result') as HTMLElement;
  const closeBtn = document.getElementById('menu-inline-close') as HTMLButtonElement;
  const openBtn  = document.getElementById('menu-inline-open')  as HTMLButtonElement;

  const menuInline = new Menu(inlineUl, {
    inline: true,
    onSelect: (_renderedLi, sourceLi) => {
      const id = sourceLi.dataset['id'] ?? '(no id)';
      const label = sourceLi.firstChild?.textContent?.trim() ?? '';
      result.textContent = `Selected: ${label} [${id}]`;
    },
  });

  closeBtn.addEventListener('click', () => menuInline.close());
  openBtn.addEventListener('click', () => menuInline.open());
}

(document.getElementById('code-menu-inline-html') as HTMLElement).textContent = `
<ul id="menu-inline" hidden>
  <li data-id="new">New
    <ul>
      <li data-id="new.doc">Document</li>
      <li data-id="new.folder">Folder</li>
    </ul>
  </li>
  <li data-id="open">Open</li>
  <li data-id="save">Save</li>
  <li data-id="export">Export
    <ul>
      <li data-id="export.pdf">PDF</li>
      <li data-id="export.csv">CSV</li>
      <li data-id="export.json">JSON</li>
    </ul>
  </li>
  <li data-id="quit">Quit</li>
</ul>
`.trim();

(document.getElementById('code-menu-inline') as HTMLElement).textContent = `
import { Menu } from 'devblocks-ui';

const menu = new Menu(document.querySelector('ul#menu-inline'), {
  inline: true,
  onSelect: (_renderedLi, sourceLi) => {
    console.log('selected', sourceLi.dataset.id);
  },
});

// The root panel is already visible — no open(anchor) call needed.
// Close/re-open programmatically:
menu.close();
menu.open();
`.trim();

// ── Demo: hover navbar ────────────────────────────────────────────────

{
  const result = document.getElementById('hover-navbar-result') as HTMLElement;

  const onSelect: MenuOptions['onSelect'] = (_renderedLi, sourceLi) => {
    const id = sourceLi.dataset['id'] ?? '(no id)';
    const label = sourceLi.firstChild?.textContent?.trim() ?? '';
    result.textContent = `Selected: ${label} [${id}]`;
  };

  const defs: Array<[string, string]> = [
    ['hover-trigger-configure',  'hover-menu-configure'],
    ['hover-trigger-records',    'hover-menu-records'],
    ['hover-trigger-developers', 'hover-menu-developers'],
  ];

  for (const [triggerId, ulId] of defs) {
    const trigger = document.getElementById(triggerId) as HTMLButtonElement;
    const ul = document.getElementById(ulId) as HTMLUListElement;
    new Menu(ul, {
      hoverTrigger: trigger,
      hoverGroup: 'main-nav',
      hoverCloseDelay: 150,
      onSelect,
    });
  }
}

(document.getElementById('code-menu-hover-html') as HTMLElement).textContent = `
<nav style="display:flex;gap:4px">
  <button id="hover-trigger-configure"  type="button">Configure</button>
  <button id="hover-trigger-records"    type="button">Records</button>
  <button id="hover-trigger-developers" type="button">Developers</button>
</nav>

<ul id="hover-menu-configure" hidden>
  <li data-id="cfg.settings">Settings</li>
  <li data-id="cfg.mail">Mail</li>
  <li data-id="cfg.storage">Storage
    <ul>
      <li data-id="cfg.storage.attachments">Attachments</li>
      <li data-id="cfg.storage.profiles">Profile Images</li>
    </ul>
  </li>
  <li data-id="cfg.plugins">Plugins</li>
</ul>
<!-- ... repeat for each trigger/ul pair ... -->
`.trim();

(document.getElementById('code-menu-hover') as HTMLElement).textContent = `
import { Menu } from 'devblocks-ui';

const triggers = ['configure', 'records', 'developers'];

for (const name of triggers) {
  const trigger = document.getElementById('hover-trigger-' + name);
  const ul      = document.getElementById('hover-menu-' + name);

  new Menu(ul, {
    hoverTrigger:    trigger,    // opens on mouseenter, closes on mouseleave
    hoverGroup:      'main-nav', // instant switch between siblings in same group
    hoverCloseDelay: 150,        // ms to wait after mouse leaves before closing
    onSelect: (_renderedLi, sourceLi) => {
      console.log('selected', sourceLi.dataset.id);
    },
  });
}
`.trim();

// ── Demo: tabs — anchor ───────────────────────────────────────────────

{
  const result = document.getElementById('tabs-static-result') as HTMLElement;

  const tabsStatic = new Tabs(
    document.getElementById('tabs-static') as HTMLUListElement,
    {
      remember: 'tabs-static-demo',
      onTabSelected: (index, tab) => {
        const label = tab.li.querySelector('a')?.textContent?.trim() ?? '';
        result.textContent = `Selected tab ${index}: ${label}`;
      },
    },
  );

  // Expose on window for console experimentation in the demo.
  (window as unknown as Record<string, unknown>)['tabsStatic'] = tabsStatic;
}

(document.getElementById('code-tabs-static-html') as HTMLElement).textContent = `
<ul id="tabs-static">
  <li><a href="#tab-s1">Overview</a></li>
  <li><a href="#tab-s2">Details</a></li>
  <li><a href="#tab-s3">Settings</a></li>
</ul>
<div id="tab-s1"><p>Overview: static panel content.</p></div>
<div id="tab-s2"><p>Details: static panel content.</p></div>
<div id="tab-s3"><p>Settings: static panel content.</p></div>
`.trim();

(document.getElementById('code-tabs-static') as HTMLElement).textContent = `
import { Tabs } from 'devblocks-ui';

// TabInfo shape (passed to callbacks):
//   index:     number          — 0-based tab index
//   li:        HTMLLIElement   — the source <li>
//   panel:     HTMLDivElement  — the content panel
//   href:      string          — '#anchor' or '/url'
//   isDynamic: boolean         — true for Ajax tabs

const tabs = new Tabs(document.querySelector('ul#my-tabs'), {
  active: 0,                          // initial selected tab index (default 0)
  remember: true,                     // persist active tab in localStorage (auto-key)
  // remember: 'my-tabs',            // or use a fixed key
  onBeforeTabLoad: (index, tab) => {
    if (someCondition) return false;  // return false to cancel the switch
  },
  onTabSelected: (index, tab) => {
    console.log('switched to', index, tab.href);
  },
});

// remember: true  auto-derives a key from the page URL + component DOM path.
// Pass active: N to override the stored tab (e.g. for permalink navigation).

tabs.select(2);           // programmatic switch
tabs.active;              // current index (getter)
tabs.refresh(1);          // clear cache and reload dynamic tab 1 from its URL
tabs.sync();              // re-parse <ul> after adding/removing <li> items
tabs.destroy();           // tear down ARIA attrs and remove dynamic panels

// Retrieve an existing instance from the root element:
Tabs.from(ul);            // → Tabs | undefined
`.trim();

// ── Demo: tabs — dynamic ──────────────────────────────────────────────

{
  const result = document.getElementById('tabs-dynamic-result') as HTMLElement;

  const tabsDynamic = new Tabs(
    document.getElementById('tabs-dynamic') as HTMLUListElement,
    {
      executeScripts: true,
      onTabSelected: (index, tab) => {
        const label = tab.li.querySelector('a')?.textContent?.trim() ?? '';
        result.textContent = `Selected tab ${index}: ${label}${tab.isDynamic ? ' (Ajax)' : ''}`;
      },
    },
  );

  (window as unknown as Record<string, unknown>)['tabsDynamic'] = tabsDynamic;
}

(document.getElementById('code-tabs-dynamic-html') as HTMLElement).textContent = `
<ul id="tabs-dynamic">
  <li><a href="#tab-d1">Summary</a></li>
  <li><a href="/ajax/tab-a.html">Details (Ajax)</a></li>
  <li><a href="/ajax/tab-b.html">History (Ajax)</a></li>
</ul>
<div id="tab-d1"><p>Summary: static content; the other two tabs load dynamically.</p></div>
`.trim();

(document.getElementById('code-tabs-dynamic') as HTMLElement).textContent = `
// Dynamic tab: <a href="/some/url"> — Tabs creates and manages the panel div.
// Content is fetched on first click and cached.  Use refresh() to reload.

const tabs = new Tabs(document.querySelector('ul#my-tabs'), {
  // executeScripts: false (default) — <script> tags in fetched HTML are ignored.
  // Set to true only when loading from trusted endpoints with CSP protection.
  executeScripts: true,
  onTabSelected: (index, tab) => {
    if (tab.isDynamic) console.log('loaded from', tab.href);
  },
});

// Re-fetch tab 2's content (e.g. after a form submission):
tabs.refresh(2);
`.trim();

// ── Demo: spinner ─────────────────────────────────────────────────────

{
  const host   = document.getElementById('spinner-host')   as HTMLElement;
  const result = document.getElementById('spinner-result') as HTMLElement;
  const status = document.getElementById('spinner-status') as HTMLElement;
  const startBtn = document.getElementById('spinner-start') as HTMLButtonElement;
  const stopBtn  = document.getElementById('spinner-stop')  as HTMLButtonElement;

  let spinner: InstanceType<typeof Spinner> | null = new Spinner();
  host.appendChild(spinner.el);

  startBtn.addEventListener('click', () => {
    if (!spinner) {
      spinner = new Spinner();
      host.appendChild(spinner.el);
      result.textContent = 'Spinner is running.';
      status.textContent = 'Loading…';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (spinner) {
      spinner.destroy();
      spinner = null;
      result.textContent = 'Spinner stopped.';
      status.textContent = '';
    }
  });
}

(document.getElementById('code-spinner-html') as HTMLElement).textContent = `
<span id="spinner-host"></span>
`.trim();

(document.getElementById('code-spinner') as HTMLElement).textContent = `
import { Spinner } from 'devblocks-ui';

const spinner = new Spinner();
document.getElementById('spinner-host').appendChild(spinner.el);

// Remove when done loading:
spinner.destroy();

// Retrieve an existing instance from the span element:
Spinner.from(spinner.el); // → Spinner | undefined
`.trim();

// ── Demo: toggle ──────────────────────────────────────────────────────

{
  const result = document.getElementById('toggle-result') as HTMLElement;

  (['toggle-wifi', 'toggle-bt', 'toggle-airplane'] as const).forEach((id) => {
    const input = document.getElementById(id) as HTMLInputElement;
    new Toggle(input, {
      onChange: (checked, inp) => {
        result.textContent = `${inp.id}: ${checked ? 'on' : 'off'}`;
      },
    });
  });
}

(document.getElementById('code-toggle-html') as HTMLElement).textContent = `
<label>
  <input type="checkbox" id="toggle-wifi">
  Wi-Fi
</label>
<label>
  <input type="checkbox" id="toggle-bt" checked>
  Bluetooth
</label>
<label>
  <input type="checkbox" id="toggle-airplane" disabled>
  Airplane mode (disabled)
</label>
`.trim();

(document.getElementById('code-toggle') as HTMLElement).textContent = `
import { Toggle } from 'devblocks-ui';

// Wrap a checkbox with an animated switch.
// <label>
//   <input type="checkbox" id="my-toggle">
//   My setting
// </label>

const t = new Toggle(document.getElementById('my-toggle'), {
  onChange: (checked, input) => {
    console.log(input.id, checked ? 'on' : 'off');
  },
});

// Methods / properties:
t.checked;         // get current state (mirrors input.checked)
t.checked = true;  // set programmatically (does not fire onChange)
t.sync();          // re-sync visual after externally changing input.checked
t.destroy();       // remove toggle wrapper, restore original input

// Retrieve an existing instance from the input element:
Toggle.from(input); // → Toggle | undefined
`.trim();

// ── Demo: dialog — basic ──────────────────────────────────────────────

{
  const openBtn = document.getElementById('dialog-basic-open') as HTMLButtonElement;
  const result  = document.getElementById('dialog-basic-result') as HTMLElement;
  const content = document.getElementById('dialog-basic-content') as HTMLElement;

  const dlg = new Dialog(content, {
    title: 'Example Dialog',
    onOpen:  () => { result.textContent = 'Dialog is open.'; },
    onClose: () => { result.textContent = 'Dialog is closed.'; },
  });

  openBtn.addEventListener('click', () => {
    if (dlg.isOpen()) dlg.close();
    else dlg.open();
  });

  (window as unknown as Record<string, unknown>)['dialogBasic'] = dlg;
}

(document.getElementById('code-dialog-basic-html') as HTMLElement).textContent = `
<button id="open-btn" type="button">Open dialog</button>

<div id="my-content">
  <p>This is the dialog content area.</p>
</div>
`.trim();

(document.getElementById('code-dialog-basic') as HTMLElement).textContent = `
import { Dialog } from 'devblocks-ui';

const dlg = new Dialog(document.getElementById('my-content'), {
  title:     'Example Dialog', // titlebar label (default '')
  draggable: true,             // drag by titlebar (default true)
  resizable: true,             // resize from edges/corners (default true)
  closable:  true,             // show × close button (default true)
  width:     400,              // initial width in px (default 400)
  minWidth:  200,              // resize floor in px (default 200)
  minHeight: 80,               // resize floor in px (default 80)
  position:  { x: 100, y: 100 }, // initial position; omit to center in viewport
  onOpen:     () => console.log('opened'),
  onClose:    () => console.log('closed'),
  onMinimize: (minimized) => console.log(minimized ? 'minimized' : 'restored'),
});

document.getElementById('open-btn').addEventListener('click', () => {
  dlg.isOpen() ? dlg.close() : dlg.open();
});

dlg.open();              // show dialog
dlg.close();             // hide dialog
dlg.isOpen();            // → boolean
dlg.setTitle('New Title'); // update titlebar text
dlg.destroy();           // remove from DOM, restore content element

// Retrieve an existing instance from the content element:
Dialog.from(contentEl);  // → Dialog | undefined
`.trim();

// ── Demo: dialog — multiple + closable:false ──────────────────────────

{
  const openA   = document.getElementById('dialog-a-open')   as HTMLButtonElement;
  const openB   = document.getElementById('dialog-b-open')   as HTMLButtonElement;
  const closeB  = document.getElementById('dialog-b-close')  as HTMLButtonElement;
  const result  = document.getElementById('dialog-multi-result') as HTMLElement;

  const contentA = document.getElementById('dialog-a-content') as HTMLElement;
  const contentB = document.getElementById('dialog-b-content') as HTMLElement;

  const dlgA = new Dialog(contentA, {
    title: 'Dialog A',
    width: 360,
    onOpen:  () => updateResult(),
    onClose: () => updateResult(),
  });

  const dlgB = new Dialog(contentB, {
    title:    'Dialog B',
    closable: false,
    width:    340,
    onOpen:   () => updateResult(),
    onClose:  () => updateResult(),
  });

  function updateResult(): void {
    const a = dlgA.isOpen();
    const b = dlgB.isOpen();
    if (!a && !b) result.textContent = 'Both dialogs closed.';
    else result.textContent = [a && 'A', b && 'B'].filter(Boolean).join(' and ') + ' open.';
  }

  openA.addEventListener('click', () => { dlgA.isOpen() ? dlgA.close() : dlgA.open(); });
  openB.addEventListener('click', () => { dlgB.isOpen() ? dlgB.close() : dlgB.open(); });
  closeB.addEventListener('click', () => dlgB.close());
}

(document.getElementById('code-dialog-multi-html') as HTMLElement).textContent = `
<div id="content-a"><p>Dialog A content.</p></div>
<div id="content-b"><p>Dialog B content.</p></div>
`.trim();

(document.getElementById('code-dialog-multi') as HTMLElement).textContent = `
import { Dialog } from 'devblocks-ui';

const dlgA = new Dialog(document.getElementById('content-a'), {
  title: 'Dialog A',
});

const dlgB = new Dialog(document.getElementById('content-b'), {
  title:    'Dialog B',
  closable: false,  // no close button — dismiss programmatically
});

dlgA.open();
dlgB.open();

// Clicking either dialog brings it to the front automatically.
// Close Dialog B via API:
dlgB.close();
`.trim();

// ── Demo: tooltip — basic ─────────────────────────────────────────────

{
  const trigger = document.getElementById('tooltip-trigger') as HTMLButtonElement;
  const src = document.getElementById('tooltip-text') as HTMLElement;

  const tip = new Tooltip(src, { target: '#tooltip-trigger' });

  trigger.addEventListener('click', () => {
    if (tip.isOpen()) tip.close();
    else tip.open();
  });
}

(document.getElementById('code-tooltip-html') as HTMLElement).textContent = `
<button id="tooltip-trigger" type="button">Show tooltip</button>
<div id="tooltip-text" hidden>Workspace pages are organized into tabs.</div>
`.trim();

(document.getElementById('code-tooltip-js') as HTMLElement).textContent = `
import { Tooltip } from 'devblocks-ui';

const tip = new Tooltip(document.getElementById('tooltip-text'), {
  target:   '#tooltip-trigger', // CSS selector or HTMLElement for the anchor
  maxWidth: 280,                // max tooltip width in px (default 280)
  onOpen:   () => console.log('opened'),
  onClose:  () => console.log('closed'),
});

document.getElementById('tooltip-trigger').addEventListener('click', () => {
  tip.isOpen() ? tip.close() : tip.open();
});

tip.open();                // show tooltip
tip.close();               // dismiss tooltip
tip.isOpen();              // → boolean
tip.setTarget('#new-btn'); // swap the anchor element
tip.destroy();             // close and deregister

// Retrieve an existing instance from the source element:
Tooltip.from(srcEl);       // → Tooltip | undefined
`.trim();

// ── Demo: datepicker ──────────────────────────────────────────────────

{
  const result    = document.getElementById('datepicker-result') as HTMLElement;
  const clearBtn  = document.getElementById('dp-clear')    as HTMLButtonElement;
  const todayBtn  = document.getElementById('dp-set-today') as HTMLButtonElement;

  const dpDefault = new DatePicker(
    document.getElementById('dp-default') as HTMLInputElement,
    {
      startOfWeek:  'mon',
      outputFormat: 'YYYY-MM-DD',
      onSelect: (_date, formatted) => {
        result.textContent = `Selected (default): ${formatted}`;
      },
    },
  );

  const dpUS = new DatePicker(
    document.getElementById('dp-us') as HTMLInputElement,
    {
      startOfWeek:  'sun',
      outputFormat: 'MM/DD/YYYY',
      onSelect: (_date, formatted) => {
        result.textContent = `Selected (US): ${formatted}`;
      },
    },
  );

  clearBtn.addEventListener('click', () => {
    dpDefault.setDate(null);
    dpUS.setDate(null);
    result.textContent = 'Cleared.';
  });

  todayBtn.addEventListener('click', () => {
    const today = new Date();
    dpDefault.setDate(today);
    dpUS.setDate(today);
    result.textContent = `Set to today via API.`;
  });

  (window as unknown as Record<string, unknown>)['dpDefault'] = dpDefault;
  (window as unknown as Record<string, unknown>)['dpUS']      = dpUS;
}

(document.getElementById('code-datepicker-html') as HTMLElement).textContent = `
<input type="text" id="my-date" placeholder="Pick a date">
`.trim();

(document.getElementById('code-datepicker-js') as HTMLElement).textContent = `
import { DatePicker } from 'devblocks-ui';

const dp = new DatePicker(document.getElementById('my-date'), {
  startOfWeek:  'mon',        // 'mon' | 'sun' (default: 'mon')
  outputFormat: 'YYYY-MM-DD', // format written to input after selection (default: 'YYYY-MM-DD')
  parseFormat:  'YYYY-MM-DD', // format used to read a pre-existing input value on init
                              //   defaults to outputFormat when omitted
  trigger:      'auto',       // 'auto' (default) — opens on click/focus
                              // 'button' — inserts a toggle button; use when input has autocomplete
  onSelect: (date, formatted) => {
    console.log(formatted);   // e.g. "2026-04-24"
  },
});

// Format tokens: YYYY (4-digit year), YY (2-digit), MM (zero-padded month),
//   M (month), DD (zero-padded day), D (day).
//   Examples: 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'

// Methods:
dp.setDate(new Date());    // set to a Date object
dp.setDate('2026-12-25'); // set by string (parsed with outputFormat)
dp.setDate(null);          // clear
dp.getDate();              // → Date | null
dp.open();                 // open popup
dp.close();                // close popup
dp.isOpen();               // → boolean
dp.destroy();              // remove popup, detach listeners

// Retrieve an existing instance from the input element:
DatePicker.from(inputEl); // → DatePicker | undefined
`.trim();

// ── Demo: datepicker — button trigger ────────────────────────────────────

{
  const result = document.getElementById('datepicker-btn-result') as HTMLElement;

  const dpBtn = new DatePicker(
    document.getElementById('dp-btn') as HTMLInputElement,
    {
      trigger:      'button',
      outputFormat: 'YYYY-MM-DD',
      onSelect: (_date, formatted) => {
        result.textContent = `Selected: ${formatted}`;
      },
    },
  );

  (window as unknown as Record<string, unknown>)['dpBtn'] = dpBtn;
}

(document.getElementById('code-datepicker-btn-html') as HTMLElement).textContent = `
<input type="text" id="my-date" placeholder="Pick a date">
`.trim();

(document.getElementById('code-datepicker-btn-js') as HTMLElement).textContent = `
import { DatePicker } from 'devblocks-ui';

// trigger: 'button' — a toggle button is inserted after the input.
// The calendar does not open on focus or click; only the button opens it.
// Use this when the input has its own autocomplete.
const dp = new DatePicker(document.getElementById('my-date'), {
  trigger:      'button',
  outputFormat: 'YYYY-MM-DD',
  onSelect: (date, formatted) => {
    console.log(formatted);
  },
});
`.trim();

// ── Demo: selectmenu — basic ──────────────────────────────────────────

{
  const select = document.getElementById('sm-basic') as HTMLSelectElement;
  const result = document.getElementById('sm-basic-result') as HTMLElement;
  const setBtn = document.getElementById('sm-basic-set') as HTMLButtonElement;

  const sm = new SelectMenu(select, {
    onSelect: (value, text) => {
      result.textContent = `Selected: ${text} (value="${value}")`;
    },
  });

  setBtn.addEventListener('click', () => {
    sm.setValue('grape');
    result.textContent = 'Set to "Grape" via API.';
  });

  (window as unknown as Record<string, unknown>)['smBasic'] = sm;
}

(document.getElementById('code-sm-basic-html') as HTMLElement).textContent = `
<label for="fruit">Favourite fruit</label>
<select id="fruit" name="fruit">
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
  <option value="durian" disabled>Durian (disabled)</option>
</select>
`.trim();

(document.getElementById('code-sm-basic-js') as HTMLElement).textContent = `
import { SelectMenu } from 'devblocks-ui';

const sm = new SelectMenu(document.getElementById('my-select'), {
  // Callbacks
  onSelect:  (value, text, option) => {
    console.log(value, text);   // e.g. "apple", "Apple"
  },
  onRender:  (li, option) => { /* add icons/badges before <li> is inserted */ },
  // Layout
  placeholder:   'Choose one…', // shown when the empty/placeholder option is active
  itemHeight:    28,             // px — must match CSS .dui-selectmenu-item height (default 28)
  maxHeight:     380,            // max panel height before scroll (default 380)
  virtThreshold: 60,             // virtualize panels with more items than this (default 60)
  virtBuffer:    6,              // extra rows above/below the visible window (default 6)
});

sm.getValue();            // → current <select> value string
sm.setValue('banana');    // set programmatically (does not fire onSelect)
sm.open();                // open panel
sm.close();               // close panel
sm.isOpen();              // → boolean
sm.destroy();             // restore <select>, remove trigger

// Retrieve an existing instance from the <select> element:
SelectMenu.from(selectEl); // → SelectMenu | undefined
`.trim();

// ── Demo: selectmenu — large timezone list with type-to-filter ────────

{
  const tzSelect = document.getElementById('sm-tz') as HTMLSelectElement;
  const result   = document.getElementById('sm-tz-result') as HTMLElement;

  // Populate with all IANA timezones (or a fallback list)
  const tzones: string[] = (() => {
    try {
      return (Intl as { supportedValuesOf?(k: string): string[] }).supportedValuesOf?.('timeZone') ?? [];
    } catch {
      return [];
    }
  })();
  if (tzones.length === 0) {
    tzones.push(
      'Africa/Abidjan', 'America/Adak', 'America/Anchorage', 'America/Bogota',
      'America/Chicago', 'America/Denver', 'America/Detroit', 'America/Halifax',
      'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
      'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo',
      'America/Toronto', 'America/Vancouver', 'Asia/Bangkok', 'Asia/Dubai',
      'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kolkata',
      'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Seoul', 'Asia/Shanghai',
      'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
      'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne',
      'Australia/Perth', 'Australia/Sydney', 'Europe/Amsterdam',
      'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels', 'Europe/Budapest',
      'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul',
      'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow',
      'Europe/Oslo', 'Europe/Paris', 'Europe/Prague', 'Europe/Rome',
      'Europe/Sofia', 'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw',
      'Europe/Zurich', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam',
      'Pacific/Honolulu', 'Pacific/Tahiti', 'UTC',
    );
  }

  const frag = document.createDocumentFragment();
  for (const tz of tzones) {
    const opt = document.createElement('option');
    opt.value = tz;
    opt.textContent = tz;
    frag.appendChild(opt);
  }
  tzSelect.appendChild(frag);
  tzSelect.value = 'America/Los_Angeles';

  const smTz = new SelectMenu(tzSelect, {
    onSelect: (value) => {
      result.textContent = `Selected: ${value}`;
    },
  });

  (window as unknown as Record<string, unknown>)['smTz'] = smTz;
}

(document.getElementById('code-sm-tz-html') as HTMLElement).textContent = `
<label for="tz">Time zone</label>
<select id="tz" name="timezone"></select>
`.trim();

(document.getElementById('code-sm-tz-js') as HTMLElement).textContent = `
import { SelectMenu } from 'devblocks-ui';

// Populate the <select> however you like — SelectMenu reads it on open.
const tzSelect = document.getElementById('tz');
for (const tz of Intl.supportedValuesOf('timeZone')) {
  const opt = document.createElement('option');
  opt.value = opt.textContent = tz;
  tzSelect.appendChild(opt);
}

const sm = new SelectMenu(tzSelect, {
  // virtThreshold: 60  (default) — panels with more items are virtualized
  onSelect: (value) => console.log('timezone:', value),
});

// Type-to-filter: open the menu and type characters to narrow the list.
// The filter text is shown above the list; Backspace removes characters.
// Selecting an item (or pressing Escape) always clears the filter.
`.trim();

// ── Demo: selectmenu — onRender (custom item markup) ─────────────────

{
  const STATUS_COLORS: Record<string, string> = {
    active:   '#22c55e',
    pending:  '#f59e0b',
    archived: '#6b7280',
    deleted:  '#ef4444',
  };

  const smStatus = new SelectMenu(
    document.getElementById('sm-status') as HTMLSelectElement,
    {
      onRender: (li, option) => {
        const dot = document.createElement('span');
        // Inline style is safe here — it's library consumer code, not user data
        dot.style.cssText =
          'display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;' +
          `background:${STATUS_COLORS[option.value] ?? '#ccc'};margin-right:6px;`;
        li.insertBefore(dot, li.firstChild);
      },
      onSelect: (_value, text) => {
        (document.getElementById('sm-status-result') as HTMLElement).textContent =
          `Status: ${text}`;
      },
    },
  );

  (window as unknown as Record<string, unknown>)['smStatus'] = smStatus;
}

(document.getElementById('code-sm-status-html') as HTMLElement).textContent = `
<label for="status">Status</label>
<select id="status" name="status">
  <option value="active">Active</option>
  <option value="pending">Pending</option>
  <option value="archived">Archived</option>
  <option value="deleted">Deleted</option>
</select>
`.trim();

(document.getElementById('code-sm-status-js') as HTMLElement).textContent = `
import { SelectMenu } from 'devblocks-ui';

const STATUS_COLORS = {
  active: '#22c55e', pending: '#f59e0b',
  archived: '#6b7280', deleted: '#ef4444',
};

const sm = new SelectMenu(document.getElementById('status'), {
  // onRender(li, option) — called after the default <span.label> is built,
  // before the <li> is inserted into the DOM. Add icons, badges, etc.
  onRender: (li, option) => {
    const dot = document.createElement('span');
    dot.style.cssText =
      'display:inline-block;width:8px;height:8px;border-radius:50%;' +
      'flex-shrink:0;margin-right:6px;background:' +
      (STATUS_COLORS[option.value] ?? '#ccc');
    li.insertBefore(dot, li.firstChild);
  },
  onSelect: (value, text, option) => {
    console.log('status:', value, text, option);
  },
});
`.trim();

// ── Demo: accordion — basic ───────────────────────────────────────────

{
  const result = document.getElementById('accordion-basic-result') as HTMLElement;

  const accordionBasic = new Accordion(
    document.getElementById('accordion-basic') as HTMLElement,
    {
      active: 0,
      onExpand: (index, info) => {
        const label = info.header.querySelector('button')?.childNodes[0]?.textContent?.trim() ?? '';
        result.textContent = `Expanded section ${index}: ${label}`;
      },
      onCollapse: (_index, _info) => {
        result.textContent = 'All sections collapsed.';
      },
    },
  );

  (window as unknown as Record<string, unknown>)['accordionBasic'] = accordionBasic;
}

(document.getElementById('code-accordion-basic-html') as HTMLElement).textContent = `
<div id="my-accordion">
  <h3>Getting started</h3>
  <div><p>Panel content goes here.</p></div>
  <h3>Keyboard navigation</h3>
  <div><p>ArrowDown/Up move focus; Enter/Space toggle.</p></div>
  <h3>Dark mode</h3>
  <div><p>Set data-dui-theme="dark" on any ancestor.</p></div>
</div>
`.trim();

(document.getElementById('code-accordion-basic') as HTMLElement).textContent = `
import { Accordion } from 'devblocks-ui';

// AccordionItemInfo shape (passed to callbacks):
//   index:  number             — 0-based section index
//   header: HTMLHeadingElement — the <h3> element
//   panel:  HTMLDivElement     — the collapsible content panel

const accordion = new Accordion(document.getElementById('my-accordion'), {
  active:      0,     // index of initially open section (default 0); -1 = all collapsed
  collapsible: false, // clicking the open section collapses it (default false)
  scrollable:  false, // cap panel height and add scroll (default false)
  onExpand:   (index, info) => console.log('expanded', index),
  onCollapse: (index, info) => console.log('collapsed', index),
});

accordion.expand(1);      // open section 1
accordion.collapse(0);    // close section 0
accordion.expanded;       // currently open index (-1 if none)
accordion.destroy();      // restore original DOM

// Retrieve an existing instance from the container element:
Accordion.from(container); // → Accordion | undefined
`.trim();

// ── Demo: accordion — collapsible ─────────────────────────────────────

{
  const result = document.getElementById('accordion-collapsible-result') as HTMLElement;

  const accordionCollapsible = new Accordion(
    document.getElementById('accordion-collapsible') as HTMLElement,
    {
      active: -1,
      collapsible: true,
      onExpand: (_index, info) => {
        const label = info.header.querySelector('button')?.childNodes[0]?.textContent?.trim() ?? '';
        result.textContent = `Expanded: ${label}`;
      },
      onCollapse: (_index, _info) => {
        result.textContent = 'All sections collapsed.';
      },
    },
  );

  (window as unknown as Record<string, unknown>)['accordionCollapsible'] = accordionCollapsible;
}

(document.getElementById('code-accordion-collapsible-html') as HTMLElement).textContent = `
<div id="my-accordion">
  <h3>Alpha</h3><div><p>Alpha content.</p></div>
  <h3>Beta</h3><div><p>Beta content.</p></div>
  <h3>Gamma</h3><div><p>Gamma content.</p></div>
</div>
`.trim();

(document.getElementById('code-accordion-collapsible') as HTMLElement).textContent = `
import { Accordion } from 'devblocks-ui';

const accordion = new Accordion(document.getElementById('my-accordion'), {
  active: -1,         // start with all sections closed
  collapsible: true,  // clicking the open section collapses it
  scrollable: false,  // true adds max-height + overflow-y: auto to panels
});
`.trim();

// ── Demo: sortable — basic vertical list ──────────────────────────────

{
  const list   = document.getElementById('sortable-basic') as HTMLElement;
  const result = document.getElementById('sortable-basic-result') as HTMLElement;

  const sortableBasic = new Sortable(list, {
    items: '> li',
    onSorted: (info) => {
      const labels = Array.from(list.querySelectorAll('li'))
        .map(li => li.textContent?.trim() ?? '');
      result.textContent =
        `Moved from index ${info.fromIndex} → ${info.toIndex}. Order: ${labels.join(', ')}`;
    },
  });

  (window as unknown as Record<string, unknown>)['sortableBasic'] = sortableBasic;
}

(document.getElementById('code-sortable-basic-html') as HTMLElement).textContent = `
<ul id="my-list">
  <li>Alpha</li>
  <li>Beta</li>
  <li>Gamma</li>
</ul>
`.trim();

(document.getElementById('code-sortable-basic-js') as HTMLElement).textContent = `
import { Sortable } from 'devblocks-ui';

const sortable = new Sortable(document.getElementById('my-list'), {
  items:     '> li',        // which children are sortable
  helper:    'original',    // drag the real element (default)
  distance:  5,             // px to move before drag activates (default)
  tolerance: 'pointer',     // insertion point follows mouse (default)
  onStart:   (info) => console.log('drag started', info.fromIndex),
  onStop:    (info) => console.log('drag stopped', info.toIndex),
  onSorted:  (info) => console.log('sorted', info.fromIndex, '→', info.toIndex),
});

// Retrieve an existing instance from the container element:
Sortable.from(container); // → Sortable | undefined

// Re-apply cursor classes after programmatic DOM changes:
sortable.refresh();

// Remove all listeners and classes:
sortable.destroy();
`.trim();

// ── Demo: sortable — connected lists with handles ─────────────────────

{
  const listA  = document.getElementById('sortable-list-a') as HTMLElement;
  const listB  = document.getElementById('sortable-list-b') as HTMLElement;
  const result = document.getElementById('sortable-connected-result') as HTMLElement;

  const onSorted = (info: { from: HTMLElement; fromIndex: number; to: HTMLElement; toIndex: number }) => {
    result.textContent =
      `Moved from ${info.from.id}[${info.fromIndex}] → ${info.to.id}[${info.toIndex}]`;
  };

  // Construct both with each other's container element.
  // Instances are resolved at drag time via Sortable.from(), so order is irrelevant.
  const sortA = new Sortable(listA, {
    items:       '> li',
    handle:      '.sort-grip',
    helper:      'clone',
    connectWith: [listB],
    onSorted,
  });

  const sortB = new Sortable(listB, {
    items:       '> li',
    handle:      '.sort-grip',
    helper:      'clone',
    connectWith: [listA],
    onSorted,
  });

  (window as unknown as Record<string, unknown>)['sortA'] = sortA;
  (window as unknown as Record<string, unknown>)['sortB'] = sortB;
}

(document.getElementById('code-sortable-connected-html') as HTMLElement).textContent = `
<ul id="list-a">
  <li><span class="grip">···</span> Item 1</li>
  <li><span class="grip">···</span> Item 2</li>
</ul>
<ul id="list-b">
  <li><span class="grip">···</span> Item A</li>
</ul>
`.trim();

(document.getElementById('code-sortable-connected-js') as HTMLElement).textContent = `
import { Sortable } from 'devblocks-ui';

const listA = document.getElementById('list-a');
const listB = document.getElementById('list-b');

// Pass each container to the other's connectWith.
// Instances resolve lazily at drag time — construction order is irrelevant.
const sortA = new Sortable(listA, {
  items:       '> li',
  handle:      '.grip',   // drag only from the grip element
  helper:      'clone',   // clone follows cursor; original stays (dimmed)
  connectWith: [listB],   // allow items to be dragged into list-b
  onSorted: (info) =>
    console.log(info.from.id, info.fromIndex, '→', info.to.id, info.toIndex),
});

const sortB = new Sortable(listB, {
  items:       '> li',
  handle:      '.grip',
  helper:      'clone',
  connectWith: [listA],
  onSorted: (info) =>
    console.log(info.from.id, info.fromIndex, '→', info.to.id, info.toIndex),
});
`.trim();

// ── Highlight all code blocks once they're populated ──────────────────

if (typeof Prism !== 'undefined') Prism.highlightAllUnder(document.body);
