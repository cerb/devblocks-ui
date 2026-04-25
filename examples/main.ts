import { Menu, Toggle } from 'devblocks-ui';
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

(document.getElementById('code-menu-deep') as HTMLElement).textContent = `
// Menu nests as deeply as the source UL/LI tree.
// Submenus auto-flip left or up if they'd overflow the viewport.

const menu = new Menu(document.querySelector('ul#menu-deep'), {
  onSelect: (_renderedLi, sourceLi) => {
    console.log('region:', sourceLi.dataset.id);
  },
});
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

// ── Highlight all code blocks once they're populated ──────────────────

if (typeof Prism !== 'undefined') Prism.highlightAllUnder(document.body);
