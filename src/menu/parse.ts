import type { MenuItem } from './types';

/**
 * Walk a UL/LI tree once into a plain JS array. Children arrays are created
 * only where sub-ULs exist, so leaf-heavy trees stay cheap.
 */
export function parseUl(ul: HTMLUListElement): MenuItem[] {
  const out: MenuItem[] = [];
  for (let i = 0; i < ul.children.length; i++) {
    const child = ul.children[i];
    if (!(child instanceof HTMLLIElement)) continue;

    const childUl = child.querySelector(':scope > ul');

    let label = '';
    for (let j = 0; j < child.childNodes.length; j++) {
      const n = child.childNodes[j];
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent?.trim();
        if (t) { label = t; break; }
      } else if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName !== 'UL') {
        label = ((n as Element).textContent ?? '').trim();
        break;
      }
    }

    out.push({
      label,
      el: child,
      children: childUl instanceof HTMLUListElement ? parseUl(childUl) : null,
    });
  }
  return out;
}
