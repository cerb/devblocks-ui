import { Menu, Toggle, Tabs, Spinner, Dialog } from 'devblocks-ui';
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

const menu = new Menu(document.querySelector('ul#menu-small'), {
  onSelect: (renderedLi, sourceLi) => {
    console.log('selected', sourceLi.dataset.id);
  },
});

document.querySelector('#menu-small-trigger')
  .addEventListener('click', function () {
    menu.isOpen() ? menu.close() : menu.open(this);
  });
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

// ── Demo: tabs — anchor ───────────────────────────────────────────────

{
  const result = document.getElementById('tabs-static-result') as HTMLElement;

  const tabsStatic = new Tabs(
    document.getElementById('tabs-static') as HTMLUListElement,
    {
      active: 0,
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

const tabs = new Tabs(document.querySelector('ul#my-tabs'), {
  active: 0,                          // default selected tab index
  onBeforeTabLoad: (index, tab) => {
    if (someCondition) return false;  // cancel the tab switch
  },
  onTabSelected: (index, tab) => {
    console.log('switched to', index, tab.href);
  },
});

tabs.select(2);          // programmatic switch
console.log(tabs.active); // current index
tabs.refresh(1);          // reload dynamic tab 1 from its URL
tabs.sync();              // re-parse <ul> after adding/removing <li> items
tabs.destroy();           // tear down ARIA attrs and remove dynamic panels
`.trim();

// ── Demo: tabs — dynamic ──────────────────────────────────────────────

{
  const result = document.getElementById('tabs-dynamic-result') as HTMLElement;

  const tabsDynamic = new Tabs(
    document.getElementById('tabs-dynamic') as HTMLUListElement,
    {
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
  onTabSelected: (index, tab) => {
    if (tab.isDynamic) console.log('loaded from', tab.href);
  },
});

// Re-fetch tab 2's content (e.g. after a form submission):
tabs.refresh(2);

// jQuery plugin equivalent:
// $('ul#my-tabs').duiTabs({ onTabSelected: fn });
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

// Enhance a checkbox — keep label markup as-is.
// <label>
//   <input type="checkbox" id="my-toggle">
//   My setting
// </label>

const t = new Toggle(document.getElementById('my-toggle'), {
  onChange: (checked, input) => {
    console.log(input.id, checked ? 'on' : 'off');
  },
});

// Programmatic control (does not fire onChange):
t.checked = true;

// jQuery plugin (optional):
// $('input[type=checkbox]').duiToggle({ onChange: fn });
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
  title: 'Example Dialog',
  draggable: true,   // default
  resizable: true,   // default
  closable:  true,   // default
  width:     400,    // default
  onOpen:  () => console.log('opened'),
  onClose: () => console.log('closed'),
});

document.getElementById('open-btn').addEventListener('click', () => {
  dlg.isOpen() ? dlg.close() : dlg.open();
});

// Additional API:
dlg.setTitle('New Title');  // update titlebar text
dlg.destroy();              // remove from DOM, restore content element
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

// jQuery plugin (optional):
// $('#my-content').duiDialog({ title: 'My Dialog', trigger: '#open-btn' });
`.trim();

// ── Highlight all code blocks once they're populated ──────────────────

if (typeof Prism !== 'undefined') Prism.highlightAllUnder(document.body);
