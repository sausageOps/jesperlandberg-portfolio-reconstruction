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
import { LAB_ENTRIES } from './data/lab-slugs.js';

const CARTER_PAGES = [
  { key: 'about', path: '/myself/about', carter: '/about' },
  { key: 'lab', path: '/routes/lab', carter: '/lab' },
  {
    key: 'writing',
    path: '/routes/writing',
    carter: '/writing',
    description:
      'Notes on design, development, motion, tools, creativity, and sometimes life outside of work.',
  },
  {
    key: 'writing-post',
    path: '/routes/writing/the-personal-starter',
    carter: '/writing/the-personal-starter',
    slug: 'the-personal-starter',
    label: 'The personal starter',
    description:
      "Templates, kits, starters, boilerplates etc. What I'd call a personal starter, what I'd keep in one, and the one I use for my own sites.",
  },
];

/* Phase 4B: the nine Lab experiment documents. Carter resolves these from one
   dynamic route (`lab/[slug].astro`); Jesper's router is a plain path map, so
   each slug is registered here. The order and names come from Carter's
   app/data/lab.ts (see data/lab.js); the frame renders them with `lab-detail`. */
for (const entry of LAB_ENTRIES) {
  CARTER_PAGES.push({
    key: 'lab-detail',
    path: `/routes/lab/${entry.slug}`,
    carter: `/lab/${entry.slug}`,
    slug: entry.slug,
    label: entry.name,
  });
}

export const CARTER_PAGE_LIST = Object.freeze(CARTER_PAGES.map((page) => Object.freeze(page)));


const pagesByPath = new Map(CARTER_PAGE_LIST.map((page) => [page.path, page]));

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
const JESPER_PREFIXES = ['/myself/', '/routes/'];

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
