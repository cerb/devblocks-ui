# Devblocks UI — guide for Claude

This file is the canonical context for any Claude session working on this repo. Read it before making changes.

## What this library is

Devblocks UI is a hand-rolled, zero-dependency UI component library — TypeScript + Vite + Sass — built to replace jQuery UI in Cerb (enterprise CRM) but designed as a general-purpose library. Anyone should be able to drop the dist into a plain HTML page (IIFE → `window.DevblocksUI`) or import the ESM from a modern bundler.

Currently ships: **Menu** (cascading menu with virtualization for 5000+ items).

Planned next: **Tabs**, **Dialog** — both intended as near-drop-in replacements for the corresponding jQuery UI widgets. Don't design these speculatively; wait for jeff@cerb.ai to provide jQuery UI usage examples to mirror.

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
- **Public API shape**: `new DevblocksUI.<Component>(rootEl, opts)` for vanilla, `$.fn.dui<Component>` for the optional jQuery plugin. jQuery glue is gated on `typeof jQuery !== 'undefined'` and never required at runtime.
- **TypeScript strict mode** is on. Don't relax it without a real reason.

## Project layout

```
src/
  index.ts               # public entry — re-exports each component, registers jQuery plugin
  jquery-plugin.ts       # $.fn.duiMenu (and future $.fn.duiTabs, $.fn.duiDialog)
  menu/
    menu.ts              # Menu class
    parse.ts             # parseUl()
    icons.ts             # constant SVG strings (only innerHTML source for Menu)
    types.ts             # MenuOptions, MenuItem
    index.ts             # re-exports
styles/
  tokens.scss            # CSS custom properties (light + dark)
  menu.scss              # all .dui-menu-* rules; uses var(--dui-*) only
  index.scss             # @use 'tokens'; @use 'menu'; (and future @use 'tabs', etc.)
examples/
  index.html             # demo page (served by `npm run dev`)
  main.ts                # demo wiring + sample code displayed in <pre>
  examples.css           # demo-page styling — NOT shipped
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

## Adding a new component (e.g. Tabs)

1. `src/tabs/{tabs.ts,types.ts,index.ts}` — class + types. Add icon files only if needed.
2. Re-export from `src/index.ts`: `export { Tabs } from './tabs/tabs';` plus `export type { TabsOptions } from './tabs/types';`.
3. `styles/tabs.scss` — use only `var(--dui-*)` tokens. Add new tokens to `styles/tokens.scss` (with both light + dark values) before referencing them. Then `@use 'tabs';` from `styles/index.scss`.
4. Extend the jQuery plugin in `src/jquery-plugin.ts` — add a `$.fn.duiTabs` registration alongside `duiMenu`. Same `typeof jQuery !== 'undefined'` gating.
5. Add a `<section class="component">` to `examples/index.html` and a wiring block to `examples/main.ts` with at least one live demo and a runnable code snippet (Prism highlights it via the CDN script already loaded).
6. Run `npm run typecheck && npm run build && npm run dev` and verify in a browser.

## Don't

- Don't add runtime dependencies to the library. Dev deps for tooling only.
- Don't inject CSS from JS. Don't bundle CSS into the JS module.
- Don't hard-code colors or shadows in component SCSS — go through tokens.
- Don't use emoji or Unicode glyphs as icons.
- Don't bake Cerb-specific assumptions in (selectors, env detection, etc.). The library is general-purpose; Cerb is one consumer.
- Don't break the IIFE bundle's `window.DevblocksUI.<Name>` shape — it's the entry point for `<script>`-tag consumers.
