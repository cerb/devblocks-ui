# Devblocks UI

Lightweight, zero-dependency UI components. TypeScript source, ships as a single IIFE bundle for `<script>` tags, plus an ESM build for modern bundlers. CSS is a separate file you include yourself.

Built to replace jQuery UI with hand-rolled components that are small, fast, and consistent. The first consumer is [Cerb](https://cerb.ai), but nothing here is Cerb-specific.

## Status

| Component | Status                       |
| --------- | ---------------------------- |
| Menu      | Available — cascading, virtualizes 5000+ items, inline mode, full keyboard nav |
| Toggle    | Available — animated binary switch wrapping `input[type=checkbox]` |
| Spinner   | Available — CSS-animated loading indicator |
| Tabs      | Available — anchor (static) and dynamic (Ajax) panels, full keyboard nav |
| Dialog    | Available — floating, draggable, resizable, minimize/restore, multi-instance z-index focus |

## Install

```sh
npm install devblocks-ui
```

Or grab the dist directly:

- `dist/devblocks-ui.js` — IIFE for `<script>` tags, exposes `window.DevblocksUI`
- `dist/devblocks-ui.esm.js` — ESM
- `dist/devblocks-ui.css` — light + dark in one file (1.4 kB)

## Usage

### Vanilla `<script>` tag

```html
<link rel="stylesheet" href="dist/devblocks-ui.css">
<script src="dist/devblocks-ui.js"></script>

<button id="trigger">Open menu</button>
<ul id="my-menu" hidden>
  <li data-id="new">New
    <ul>
      <li data-id="new.doc">Document</li>
      <li data-id="new.folder">Folder</li>
    </ul>
  </li>
  <li data-id="open">Open</li>
  <li data-id="quit">Quit</li>
</ul>

<script>
  const menu = new DevblocksUI.Menu(document.querySelector('#my-menu'), {
    onSelect: (renderedLi, sourceLi) => {
      console.log('selected', sourceLi.dataset.id);
    },
  });
  document.querySelector('#trigger').addEventListener('click', function () {
    menu.isOpen() ? menu.close() : menu.open(this);
  });
</script>
```

### ESM

```ts
import { Menu } from 'devblocks-ui';
import 'devblocks-ui/styles';   // or: import url from 'devblocks-ui/styles' and link manually

const menu = new Menu(document.querySelector('ul#my-menu'), {
  onSelect: (renderedLi, sourceLi) => console.log(sourceLi.dataset.id),
});
```

### jQuery plugin (optional)

If jQuery is on the page, a plugin is registered automatically that mirrors the jQuery UI menu init pattern:

```js
$('ul#my-menu').duiMenu({
  trigger:  '#trigger',
  onSelect: (renderedLi, sourceLi) => console.log(sourceLi.dataset.id),
});
```

## Theming

Themes are CSS custom properties. Light is the default. To switch to dark, set `data-dui-theme="dark"` on `<html>` or `<body>`:

```js
document.documentElement.setAttribute('data-dui-theme', 'dark');
```

To follow OS preference, mirror `prefers-color-scheme` to the attribute yourself — the library doesn't do this automatically because it would conflict with apps that have their own theme system.

Override any token at any scope:

```css
:root {
  --dui-accent-bg: #16a34a;   /* green accent in light mode */
}
[data-dui-theme="dark"] {
  --dui-accent-bg: #22c55e;   /* green accent in dark mode */
}
```

Available tokens are defined in [`styles/tokens.scss`](./styles/tokens.scss).

## Menu — options

```ts
interface MenuOptions {
  onSelect?:      (renderedLi: HTMLLIElement, sourceLi: HTMLLIElement) => void;
  itemHeight?:    number;   // default 28 (px) — must match CSS .dui-menu-item height
  maxHeight?:     number;   // default 380 — max panel height before scroll
  virtThreshold?: number;   // default 60 — virtualize panels with more items than this
  openDelay?:     number;   // default 80 (ms) — hover delay before submenu opens
  virtBuffer?:    number;   // default 6 — extra rows above/below the visible window
  inline?:        boolean;  // default false — render root panel in document flow
}
```

Public methods: `open(anchor?)`, `close()`, `isOpen()`, `destroy()`.

The Menu reads its source `<ul>` once at construction time. The source `<ul>` can be hidden. In normal mode, rendered panels are appended to `<body>` with `position: fixed`. In inline mode (`inline: true`), the root panel is inserted after the source `<ul>` in document flow and the menu opens automatically on construction; submenus still float. `data-*` attributes on each source `<li>` are mirrored onto the rendered `<li>` and available as the second arg of `onSelect`.

## Toggle — options

```ts
interface ToggleOptions {
  onChange?: (checked: boolean, input: HTMLInputElement) => void;
}
```

Pass an `input[type=checkbox]` element. The Toggle wraps it in an animated binary switch — the native input stays accessible and submits with its form normally. Programmatic control: `toggle.checked = true/false` (does not fire `onChange`).

## Spinner

```ts
const spinner = new Spinner();
someElement.appendChild(spinner.el);  // spinner.el is a <span>
spinner.destroy();                     // removes the element
```

CSS-animated loading indicator. Used internally by Tabs while dynamic panels load; also usable standalone.

## Tabs — options

```ts
interface TabsOptions {
  active?:          number;   // initial selected tab index (default 0)
  onBeforeTabLoad?: (index: number, tab: TabInfo) => boolean | void;  // return false to cancel
  onTabSelected?:   (index: number, tab: TabInfo) => void;
}

interface TabInfo {
  li:        HTMLLIElement;
  href:      string;
  isDynamic: boolean;   // true when href is a URL (Ajax tab), false for #anchor tabs
}
```

Public methods: `select(index)`, `get active()`, `refresh(index)`, `sync()`, `destroy()`.

Pass a `<ul>` of `<li><a href="...">` items. Anchor tabs (`href="#id"`) toggle a sibling `<div id="id">`. Dynamic tabs (`href="/some/url"`) fetch their content on first click and cache it; call `refresh(index)` to force a reload. Arrow keys navigate; Space/Enter activate.

## Dialog — options

```ts
interface DialogOptions {
  title?:      string;                               // titlebar label (default '')
  draggable?:  boolean;                              // drag by titlebar (default true)
  resizable?:  boolean;                              // resize from edges/corners (default true)
  closable?:   boolean;                              // show close button (default true)
  width?:      number;                               // initial width in px (default 400)
  minWidth?:   number;                               // resize floor in px (default 200)
  minHeight?:  number;                               // resize floor in px (default 80)
  position?:   { x: number; y: number };             // initial position; omit to center
  onOpen?:     () => void;
  onClose?:    () => void;
  onMinimize?: (minimized: boolean) => void;
}
```

Public methods: `open()`, `close()`, `isOpen()`, `setTitle(title)`, `destroy()`.

Pass any existing element as the content area — it is moved inside the dialog on construction and restored to its original DOM position on `destroy()`. The dialog is appended to `<body>` and hidden until `open()` is called. Clicking any dialog brings it to the front (z-index); pressing Escape closes the topmost open dialog.

```html
<div id="my-content">
  <p>Dialog body content.</p>
</div>

<script>
  const dlg = new DevblocksUI.Dialog(document.getElementById('my-content'), {
    title: 'My Dialog',
    onClose: () => console.log('closed'),
  });
  dlg.open();
</script>
```

jQuery plugin:

```js
$('#my-content').duiDialog({ title: 'My Dialog', trigger: '#open-btn' });
```

## Build from source

```sh
git clone <repo>
cd devblocks-ui
npm install
npm run dev          # examples page at http://localhost:5173/
npm run typecheck    # tsc --noEmit (strict)
npm run build        # produces dist/
```

## License

MIT
