# Devblocks UI

Lightweight, zero-dependency UI components. TypeScript source, ships as a single IIFE bundle for `<script>` tags, plus an ESM build for modern bundlers. CSS is a separate file you include yourself.

Built to replace jQuery UI with hand-rolled components that are small, fast, and consistent. The first consumer is [Cerb](https://cerb.ai), but nothing here is Cerb-specific.

## Status

| Component  | Status                       |
| ---------- | ---------------------------- |
| Menu       | Available — cascading, virtualizes 5000+ items, inline mode, full keyboard nav |
| Toggle     | Available — animated binary switch wrapping `input[type=checkbox]` |
| Spinner    | Available — CSS-animated loading indicator |
| Tabs       | Available — anchor (static) and dynamic (Ajax) panels, full keyboard nav |
| Dialog     | Available — floating, draggable, resizable, minimize/restore, multi-instance z-index focus |
| Tooltip    | Available — floating tip with directional arrow, auto-flips above/below |
| DatePicker | Available — popup calendar, month/year navigation, configurable week start and format |
| SelectMenu | Available — styled `<select>` replacement, type-to-filter, virtualizes 5000+ items |
| Accordion  | Available — expand/collapse sections, CSS grid animation, keyboard nav |

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
  onSelect?:      (renderedLi: HTMLLIElement, sourceLi: HTMLLIElement, event: MouseEvent | KeyboardEvent) => void;
  onClose?:       () => void;   // called after the menu finishes closing
  onRenderItem?:  (renderedLi: HTMLLIElement, sourceLi: HTMLLIElement) => void;  // decorate items (add icons, badges, etc.)
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

Pass an `input[type=checkbox]` element. The Toggle wraps it in an animated binary switch — the native input stays accessible and submits with its form normally. Programmatic control: `toggle.checked = true/false` (does not fire `onChange`). Call `toggle.sync()` to re-sync the visual after changing `input.checked` externally. Public methods: `toggle.checked` (getter/setter), `sync()`, `destroy()`.

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
  index:     number;
  li:        HTMLLIElement;
  panel:     HTMLDivElement;
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

## Tooltip — options

```ts
interface TooltipOptions {
  target?:   string | HTMLElement;   // CSS selector or element for the anchor
  maxWidth?: number;                 // max tooltip width in px (default 280)
  onOpen?:   () => void;
  onClose?:  () => void;
}
```

Public methods: `open()`, `close()`, `isOpen()`, `setTarget(target)`.

Pass the element that contains the tooltip text (can be `hidden`). The tooltip floats above or below the `target` element, auto-flipping based on available viewport space. A directional arrow points at the anchor. Click outside or call `close()` to dismiss.

## DatePicker — options

```ts
interface DatePickerOptions {
  startOfWeek?:  'mon' | 'sun';   // default 'mon'
  outputFormat?: string;          // format written to input after selection (default 'YYYY-MM-DD')
  parseFormat?:  string;          // format used to read a pre-existing input value on init; defaults to outputFormat
  trigger?:      'auto' | 'button';   // 'auto' (default) opens on click/focus; 'button' inserts a toggle button
  onSelect?:     (date: Date, formatted: string) => void;
}
```

Public methods: `open()`, `close()`, `isOpen()`, `setDate(date)`, `getDate()`, `destroy()`.

Pass an `input[type=text]`. The calendar popup opens on click or focus and closes on selection, Escape, or click-outside. The popup scrolls with the page (`position: absolute`).

**Focus model:** clicking the input shows the calendar but keeps focus in the input so you can type immediately. Tabbing to the input shows the calendar and moves focus into the day grid for keyboard navigation. ArrowDown also moves focus from the input into the grid.

**Typing:** type a date directly in the input — the calendar navigates to the matching month as soon as the value parses against the configured format. Press Enter to confirm a typed date.

**Mouse/keyboard navigation:** month and year advance with the header buttons (`«`/`»` for year, `‹`/`›` for month). In the grid: arrow keys move between days, Home/End jump to row edges, PageUp/PageDown changes month, Shift+PageUp/Down changes year.

**Format tokens:** `YYYY` (4-digit year), `YY` (2-digit), `MM` (zero-padded month), `M` (month), `DD` (zero-padded day), `D` (day). Examples: `'YYYY-MM-DD'`, `'MM/DD/YYYY'`, `'DD/MM/YYYY'`.

```html
<input type="text" id="my-date" placeholder="Pick a date">

<script>
  const dp = new DevblocksUI.DatePicker(document.getElementById('my-date'), {
    outputFormat: 'MM/DD/YYYY',
    startOfWeek:  'sun',
    onSelect: (date, formatted) => console.log(formatted),
  });
</script>
```

## SelectMenu — options

```ts
interface SelectMenuOptions {
  onSelect?:      (value: string, text: string, option: HTMLOptionElement) => void;
  onRender?:      (li: HTMLLIElement, option: HTMLOptionElement) => void;
  placeholder?:   string;   // text shown when the empty/placeholder option is selected
  itemHeight?:    number;   // default 28 (px) — must match CSS .dui-selectmenu-item height
  maxHeight?:     number;   // default 380 — max panel height before scroll
  virtThreshold?: number;   // default 60 — virtualize panels with more items than this
  virtBuffer?:    number;   // default 6 — extra rows above/below the visible window
}
```

Public methods: `open()`, `close()`, `isOpen()`, `getValue()`, `setValue(value)`, `destroy()`.

Pass a `<select>` element. SelectMenu replaces the native browser control with a styled trigger button and floating panel while keeping the underlying `<select>` in sync for form submission. Type any characters while the panel is open to filter the list. `onRender` is called for each rendered item and lets you decorate rows (add icons, badges, etc.) without breaking the built-in filter or virtualization.

```html
<select id="my-select">
  <option value="">Choose one…</option>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</select>

<script>
  const sm = new DevblocksUI.SelectMenu(document.getElementById('my-select'), {
    placeholder: 'Choose one…',
    onSelect: (value, text) => console.log(value, text),
  });
</script>
```

## Accordion — options

```ts
interface AccordionOptions {
  active?:      number;   // initially-open section index (default 0); pass -1 for all collapsed
  collapsible?: boolean;  // clicking the open section collapses it (default false)
  scrollable?:  boolean;  // cap panel height and scroll (default false)
  onExpand?:    (index: number, info: AccordionItemInfo) => void;
  onCollapse?:  (index: number, info: AccordionItemInfo) => void;
}

interface AccordionItemInfo {
  index:  number;
  header: HTMLHeadingElement;
  panel:  HTMLDivElement;
}
```

Public methods: `expand(index)`, `collapse(index)`, `get expanded` (current open index, `-1` if none), `destroy()`.

Pass a `<div>` whose direct children alternate between `<h3>` headers and `<div>` panels. Each `<h3>` becomes a clickable trigger; its following `<div>` expands and collapses with a CSS grid-row animation. Arrow keys navigate between headers; Space/Enter toggles the focused section. When `scrollable` is `true`, panel height is capped by the `--dui-accordion-max-height` token (default `300px`).

```html
<div id="my-accordion">
  <h3>Section 1</h3>
  <div><p>Content for section 1.</p></div>
  <h3>Section 2</h3>
  <div><p>Content for section 2.</p></div>
</div>

<script>
  const acc = new DevblocksUI.Accordion(document.getElementById('my-accordion'), {
    active:      0,
    collapsible: true,
    onExpand: (index) => console.log('opened', index),
  });
</script>
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
