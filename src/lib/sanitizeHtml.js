// Dependency-free HTML sanitiser for user-authored rich content.
// Rich text (notes, assignment submissions) is stored as HTML and rendered with
// dangerouslySetInnerHTML, so it must be cleaned before it reaches the DOM.
//
// DOMParser parses the markup inertly — nothing runs while we inspect it — then
// we strip executable elements and every event/script-bearing attribute.

const BLOCKED_TAGS = new Set([
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'option',
  'link',
  'meta',
  'base',
  'style',
  'template',
  'svg',
  'math',
]);

const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);
const DANGEROUS_URL = /^\s*(javascript|vbscript)\s*:/i;
// data: is only dangerous on navigable attributes; inline images stay allowed.
const DANGEROUS_DATA_URL = /^\s*data\s*:/i;

export function sanitizeHtml(html) {
  if (html === null || html === undefined) return '';
  const source = String(html);
  if (!source) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    // No DOM available — fall back to dropping all markup rather than risk it.
    return source.replace(/<[^>]*>/g, ' ');
  }

  const doc = new DOMParser().parseFromString(`<div>${source}</div>`, 'text/html');
  const root = doc.body && doc.body.firstElementChild;
  if (!root) return '';

  root.querySelectorAll('*').forEach((el) => {
    if (BLOCKED_TAGS.has(el.tagName.toLowerCase())) {
      el.remove();
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || '';

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'srcdoc') {
        el.removeAttribute(attr.name);
        return;
      }

      if (URL_ATTRS.has(name)) {
        const navigable = name !== 'src' && name !== 'poster';
        if (DANGEROUS_URL.test(value) || (navigable && DANGEROUS_DATA_URL.test(value))) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });

  return root.innerHTML;
}

export default sanitizeHtml;