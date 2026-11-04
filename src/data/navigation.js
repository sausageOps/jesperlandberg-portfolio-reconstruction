// Single source of truth for the A24-style navigation and the section routes it
// points at. Menus are declared here once so the nav and the router cannot drift.

const menus = {
  routes: {
    label: 'Routes',
    items: [
      { slug: 'lab', title: 'Lab' },
      { slug: 'writing', title: 'Writing' },
      { slug: 'studio', title: 'Studio' },
      { slug: 'art', title: 'Art' },
    ],
  },
  myself: {
    label: 'Myself',
    items: [
      { slug: 'about', title: 'About' },
      { slug: 'contact', title: 'Contact' },
      { slug: 'my-toys', title: 'My toys' },
      // Placeholder destinations: these resolve through the existing
      // `/myself/<slug>` route to the same generic Section page as About,
      // Contact and My toys (no bespoke My Library / Shop page exists yet).
      // The slug stays `my-book` so the existing /myself/my-book URL is kept.
      { slug: 'my-book', title: 'My Library' },
      { slug: 'shop', title: 'Shop' },
    ],
  },
};

export const menuKeys = Object.keys(menus);

export const navMenus = Object.fromEntries(menuKeys.map((key) => [
  key,
  {
    key,
    label: menus[key].label,
    items: menus[key].items.map((item) => ({ ...item, to: `/${key}/${item.slug}` })),
  },
]));

// Which top-level navigation item owns the current path. Only one can be active.
export const activeTopLevel = (path) => {
  if (path === '/') return 'life';
  if (path === '/routes' || path.startsWith('/routes/')) return 'routes';
  if (path === '/myself' || path.startsWith('/myself/')) return 'myself';
  return null;
};

// Sections that may carry exactly one trailing segment (e.g. a detail page under
// a menu item). Declared explicitly so every other two-segment path still falls
// through to not-found and the existing route surface is preserved.
const nestedSections = new Set(['routes/writing', 'routes/lab']);

/** Sentence-cases a URL segment: `the-personal-starter` -> `The personal starter`. */
export const formatSegment = (segment) =>
  segment
    .split('-')
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');

// Resolves `/routes/<slug>` and `/myself/<slug>` to their menu + item, plus one
// optional trailing segment for the sections listed in `nestedSections`.
export const resolveSection = (path) => {
  const match = /^\/(routes|myself)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(path);
  if (!match) return null;
  const menu = navMenus[match[1]];
  const slug = match[2] || null;
  const item = slug ? menu.items.find((entry) => entry.slug === slug) || null : null;
  if (slug && !item) return null;
  const nested = match[3] || null;
  if (nested && !nestedSections.has(`${match[1]}/${slug}`)) return null;
  return { menu, item, nested };
};
