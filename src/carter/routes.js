/**
 * Carter pages mounted inside Jesper's shell.
 *
 * `path` is the Jesper URL (src/data/navigation.js stays the source of truth for
 * the menus); `carter` is the carterogunsola.com path the page is ported from.
 * Only these routes mount through the shared Carter frame (CarterRoute.jsx);
 * every other URL keeps its existing Jesper behaviour.
 *
 * This module is deliberately framework- and CSS-free: App.jsx imports it
 * statically, so it must stay tiny.
 */
export const CARTER_PAGES = Object.freeze([
  { key: 'about', path: '/myself/about', carter: '/about' },
  { key: 'lab', path: '/routes/lab', carter: '/lab' },
  { key: 'writing', path: '/routes/writing', carter: '/writing' },
  {
    key: 'writing-post',
    path: '/routes/writing/the-personal-starter',
    carter: '/writing/the-personal-starter',
  },
]);

const pagesByPath = new Map(CARTER_PAGES.map((page) => [page.path, page]));

/** Carter page for an already-cleaned Jesper path (App's cleanPath), or null. */
export const resolveCarterPage = (path) => pagesByPath.get(path) || null;

/* Carter top-level sections and their Jesper homes. Deeper segments carry over
   verbatim (/lab/dial -> /routes/lab/dial); whether that URL renders a page is
   decided by Jesper's router, exactly as if the URL had been typed. */
const SECTION_HOMES = [
  ['/about', '/myself/about'],
  ['/contact', '/myself/contact'],
  ['/lab', '/routes/lab'],
  ['/writing', '/routes/writing'],
  ['/studio', '/routes/studio'],
];

const CARTER_HOSTS = new Set(['carterogunsola.com', 'www.carterogunsola.com']);
const JESPER_PREFIXES = ['/myself/', '/routes/', '/projects/'];

/**
 * Map an internal Carter href ("/writing/the-personal-starter#credits") to its
 * Jesper URL ("/routes/writing/the-personal-starter#credits").
 *
 * Accepts root-relative paths and absolute carterogunsola.com URLs. Paths that
 * are already Jesper URLs are returned unchanged. Returns null for same-page
 * fragments, external links, non-HTTP schemes and Carter routes that have no
 * Jesper home (e.g. /changelog), so callers fall back to the browser default.
 */
export function toJesperPath(href) {
  if (typeof href !== 'string') return null;
  const raw = href.trim();
  if (!raw || raw.startsWith('#')) return null;

  const rootRelative = raw.startsWith('/') && !raw.startsWith('//');
  let url;
  try {
    url = new URL(raw, 'https://carterogunsola.com');
  } catch {
    return null;
  }
  if (!rootRelative && !CARTER_HOSTS.has(url.hostname)) return null;

  const tail = url.search + url.hash;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || JESPER_PREFIXES.some((prefix) => path.startsWith(prefix))) return path + tail;

  for (const [from, to] of SECTION_HOMES) {
    if (path === from || path.startsWith(`${from}/`)) return to + path.slice(from.length) + tail;
  }
  return null;
}
