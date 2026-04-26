# Devblocks UI — guide for Claude

This file is the canonical context for any Claude session working on this repo. Read it before making changes.

## What this library is

Devblocks UI is a hand-rolled, zero-dependency UI component library — TypeScript + Vite + Sass — built to replace jQuery UI in Cerb (enterprise CRM) but designed as a general-purpose library. Anyone should be able to drop the dist into a plain HTML page (IIFE → `window.DevblocksUI`) or import the ESM from a modern bundler.

Currently ships: **Menu** (cascading, virtualizes 5000+ items, inline mode), **Toggle** (animated binary switch for `input[type=checkbox]`), **Spinner** (CSS loading indicator), **Tabs** (anchor + Ajax panels, full keyboard nav), **Dialog** (floating, draggable, resizable window — near-drop-in replacement for jQuery UI dialog), **Tooltip** (floating tip with directional arrow, auto-flips above/below), **DatePicker** (popup calendar, month/year navigation, configurable week start and date format, type-to-navigate, focus stays in input on click), **SelectMenu** (styled `<select>` replacement, type-to-filter, virtualizes large lists, keeps native `<select>` in sync for form submission), **Accordion** (expand/collapse sections with CSS grid animation, keyboard nav, optional scroll cap).

## Conventions (apply to every component)

- **Class prefix**: `dui-` (the "DUI" pun is intentional).
- **Class naming**: flat hyphen-separated. `dui-menu-item`, `dui-menu-item-active`. No BEM, no underscores.
- **CSS is never injected by JS.** Components ship behavior only. Styles live in `styles/*.scss` and are compiled to `dist/devblocks-ui.css` by `sass`. Consumers include the CSS themselves.
- **Theming via CSS custom properties.** Defaults on `:root` (light); `[data-dui-theme="dark"]` overrides for dark. Tokens live in `styles/tokens.scss`. Add new tokens there, never hard-code colors in component SCSS.
- **No emoji or Unicode glyph icons.** Ever. Hand-author tiny inline SVGs (Lucide-style is the precedent — see `src/menu/icons.ts`). One `innerHTML` write per component, for the constant icon string only — document it as such at the call site.
- **XSS-conscious by default.** First consumer is an enterprise CRM where user-controlled data routinely flows through components.
  - User-controlled text → `textContent`, never `innerHTML`.
  - Mirror attributes from source elements only via a strict allowlist (we use `name.startsWith('data-')` in Menu). Never blindly copy attributes; never copy `class`, `style`, or `on*`.
  - No `eval`, `new Function`, or `Function(...)`.
- **Public API shape**: `new DevblocksUI.<Component>(rootEl, opts)` for vanilla JS, `new Component(rootEl, opts)` for ESM.
- **Instance retrieval**: every component has `static from(el): Component | undefined`. Implemented via a `private static _instances = new WeakMap<ElementType, Component>()` — register in constructor, delete in `destroy()`. The key is always the element the caller passed to the constructor (for `Dialog` that's `contentEl`/`this.innerContent`; for `Spinner` it's `this.el` since there's no constructor arg).
- **TypeScript strict mode** is on. Don't relax it without a real reason.

## Project layout

```
src/
  index.ts               # public entry — re-exports each component
  menu/
    menu.ts              # Menu class (floating + inline modes)
    parse.ts             # parseUl()
    icons.ts             # constant SVG strings (only innerHTML source for Menu)
    types.ts             # MenuOptions, MenuItem
    index.ts             # re-exports
  toggle/
    toggle.ts            # Toggle class
    types.ts             # ToggleOptions
    index.ts             # re-exports
  spinner/
    spinner.ts           # Spinner class
    icons.ts             # spinner SVG/animation element
    index.ts             # re-exports
  tabs/
    tabs.ts              # Tabs class (anchor + Ajax panels)
    types.ts             # TabsOptions, TabInfo
    index.ts             # re-exports
  dialog/
    dialog.ts            # Dialog class (floating, draggable, resizable)
    types.ts             # DialogOptions
    icons.ts             # constant SVG strings (minimize, restore, close)
    index.ts             # re-exports
  tooltip/
    tooltip.ts           # Tooltip class (floating tip with directional arrow)
    types.ts             # TooltipOptions
    index.ts             # re-exports
  datepicker/
    datepicker.ts        # DatePicker class (popup calendar)
    types.ts             # DatePickerOptions
    icons.ts             # constant SVG strings (prev/next month and year chevrons)
    index.ts             # re-exports
  selectmenu/
    selectmenu.ts        # SelectMenu class (styled <select> replacement, type-to-filter)
    types.ts             # SelectMenuOptions
    icons.ts             # constant SVG strings (chevron, search)
    index.ts             # re-exports
  accordion/
    accordion.ts         # Accordion class (expand/collapse sections, CSS grid animation)
    types.ts             # AccordionOptions, AccordionItemInfo
    icons.ts             # constant SVG strings (chevron)
    index.ts             # re-exports
styles/
  tokens.scss            # CSS custom properties (light + dark)
  menu.scss              # all .dui-menu-* rules; uses var(--dui-*) only
  toggle.scss            # all .dui-toggle-* rules
  spinner.scss           # all .dui-spinner-* rules
  tabs.scss              # all .dui-tab-* rules
  dialog.scss            # all .dui-dialog-* rules
  tooltip.scss           # all .dui-tooltip-* rules
  datepicker.scss        # all .dui-datepicker-* rules
  selectmenu.scss        # all .dui-selectmenu-* rules
  accordion.scss         # all .dui-accordion-* rules
  index.scss             # @use 'tokens'; @use each component
examples/
  index.html             # demo page (served by `npm run dev`)
  main.ts                # demo wiring + sample code displayed in <pre>
  examples.css           # demo-page styling — NOT shipped
  ajax/
    tab-a.html           # fixture fragment for the dynamic Tabs demo
    tab-b.html           # fixture fragment for the dynamic Tabs demo
dist/                    # build output (gitignored)
```

## Build and verify

```sh
npm run dev           # vite dev server at http://localhost:5173/ (serves examples/)
npm run typecheck     # tsc --noEmit, strict mode
npm run build         # produces dist/devblocks-ui.{js,esm.js,css,d.ts}
npm run build:js      # IIFE + ESM bundle
npm run build:css     # sass → dist/devblocks-ui.css
npm run build:types   # tsc -p tsconfig.build.json → .d.ts
```

The `npm run build:js` step uses `vite build` in library mode (see `vite.config.ts`). Dev mode and build mode use the same config; dev sets `root: 'examples'` and aliases `devblocks-ui` → `src/index.ts`, `devblocks-ui/styles` → `styles/index.scss`.

For UI-affecting changes, run `npm run dev`, open http://localhost:5173/, exercise the demos manually. Type checking does not catch UI regressions.

## Adding a new component

1. `src/<name>/{<name>.ts,types.ts,index.ts}` — class + types. Add icon files only if needed.
2. Re-export from `src/index.ts`: `export { Name } from './<name>/<name>';` plus `export type { NameOptions } from './<name>/types';`.
3. `styles/<name>.scss` — use only `var(--dui-*)` tokens. Add new tokens to `styles/tokens.scss` (with both light + dark values) before referencing them. Then `@use '<name>';` from `styles/index.scss`.
4. Add a `<section class="component">` to `examples/index.html` and a wiring block to `examples/main.ts` with at least one live demo and a runnable code snippet (Prism highlights it via the CDN script already loaded).
5. Run `npm run typecheck && npm run build && npm run dev` and verify in a browser.

## Don't

- Don't add runtime dependencies to the library. Dev deps for tooling only.
- Don't inject CSS from JS. Don't bundle CSS into the JS module.
- Don't hard-code colors or shadows in component SCSS — go through tokens.
- Don't use emoji or Unicode glyphs as icons.
- Don't bake Cerb-specific assumptions in (selectors, env detection, etc.). The library is general-purpose; Cerb is one consumer.
- Don't break the IIFE bundle's `window.DevblocksUI.<Name>` shape — it's the entry point for `<script>`-tag consumers.
