/*!
 * Devblocks UI — public entry
 *
 * Usage:
 *   <script src="dist/devblocks-ui.js"></script>
 *   <link  rel="stylesheet" href="dist/devblocks-ui.css">
 *   <script>
 *     const m = new DevblocksUI.Menu(document.querySelector('ul#my-menu'), {
 *       onSelect: (renderedLi, sourceLi) => console.log(sourceLi.dataset),
 *     });
 *   </script>
 *
 * ESM:
 *   import { Menu } from 'devblocks-ui';
 *   import 'devblocks-ui/styles';   // or include the .css yourself
 */

export { Menu } from './menu/menu';
export type { MenuOptions, MenuItem } from './menu/types';

import { registerJQueryPlugin } from './jquery-plugin';

if (typeof window !== 'undefined') {
  registerJQueryPlugin();
}
