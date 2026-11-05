/**
 * Lab experiments: metadata for the nine `/routes/lab/<slug>` documents.
 *
 * Ported from `app/data/lab.ts` in sausageOps/carterogunsola-reconstruction
 * 3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249. Every field is Carter's verbatim:
 * `name`, `category`, `isNew`, `poster` and `reel` (relative to
 * https://assets.carterogunsola.com) and `description`, which reaches the page
 * through `<meta name="description">` like Carter's `[slug].astro`. Order,
 * `labHref()` and the prev/next ring follow the same file. The slug, name and
 * description records come from ./lab-slugs.js so the document metadata can be
 * resolved without loading this module's Notes HTML.
 *
 * `notes` is the captured Notes pane for each experiment (see data/lab-notes).
 * Rendered as captured HTML, exactly like Carter's `set:html={notes}`.
 */
import { LAB_ENTRIES } from './lab-slugs.js';

export const LAB_ASSETS_ORIGIN = 'https://assets.carterogunsola.com';

/**
 * Carter's `img(path, width, quality)` helper (app/lib/assets.ts). The binaries
 * live on Carter's asset host, not in Jesper's public assets, so the detail
 * shell keeps Carter's source URL convention. Phase 4A's Lab index uses the same
 * host; see pages/lab/LabPage.jsx.
 */
export const labImage = (path, width = 720, quality = 86) =>
  `${LAB_ASSETS_ORIGIN}/cdn-cgi/image/width=${width},quality=${quality},format=auto/${path.replace(/^\/+/, '')}`;

const ITEMS = [
  // `description` comes from ./lab-slugs.js (the metadata route also needs it).
  { ...LAB_ENTRIES[0], category: 'Interaction', isNew: true, poster: 'lab/live-cursors/poster-r3.jpg', reel: 'lab/live-cursors/reel-r3.mp4' },
  { ...LAB_ENTRIES[1], category: 'Interaction', isNew: true, poster: 'lab/dial/poster-v2.jpg', reel: 'lab/dial/reel-v2.mp4' },
  { ...LAB_ENTRIES[2], category: 'Canvas', isNew: false, poster: 'lab/polka-dots/poster-v2.jpg', reel: 'lab/polka-dots/reel.mp4' },
  { ...LAB_ENTRIES[3], category: 'Canvas', isNew: true, poster: 'lab/heart/poster-v3.jpg', reel: 'lab/heart/reel-v2.mp4' },
  { ...LAB_ENTRIES[4], category: '3D', isNew: false, poster: 'lab/threejs-test/poster.jpg', reel: 'lab/threejs-test/reel.mp4' },
  { ...LAB_ENTRIES[5], category: 'UI', isNew: false, poster: 'lab/dynamic-scrollbar/poster-r2.jpg', reel: 'lab/dynamic-scrollbar/reel-r3.mp4' },
  { ...LAB_ENTRIES[6], category: 'Gallery', isNew: false, poster: 'lab/rotating-gallery/poster-nc.jpg', reel: 'lab/rotating-gallery/reel.mp4' },
  { ...LAB_ENTRIES[7], category: 'Transition', isNew: true, poster: 'lab/paste-up/poster-nc.jpg', reel: 'lab/paste-up/reel.mp4' },
  { ...LAB_ENTRIES[8], category: '3D', isNew: true, poster: 'lab/vocal-orb/poster-v1.jpg', reel: 'lab/vocal-orb/reel-v1.mp4' },
].map((item, index) => ({ ...item, index, position: index + 1, total: LAB_ENTRIES.length }));

export const LAB_ITEMS = Object.freeze(ITEMS);

const itemsBySlug = new Map(LAB_ITEMS.map((item) => [item.slug, item]));

/** Carter `labHref(item)`: `/lab/<slug>`. */
export const labHref = (item) => `/lab/${item.slug}`;

/**
 * Everything one Lab document needs: the item, its neighbours in Carter's ring,
 * and the captured Notes pane. `labDocument(slug)` returns null for a slug that
 * is not one of the nine, which leaves the route on its existing placeholder.
 */
export function labDocument(slug) {
  const item = itemsBySlug.get(slug);
  if (!item) return null;
  const ring = (offset) => LAB_ITEMS[(item.index + offset + LAB_ITEMS.length) % LAB_ITEMS.length];
  return {
    item,
    previous: ring(-1),
    next: ring(1),
    notes: labNotes[slug],
    code: labCode[slug],
  };
}

/**
 * Captured Notes panes, verbatim.
 *
 * Provenance (identical to Carter's app/data/lab-evidence.ts):
 * - `dial` and `vocal-orb` are extracted from the saved pages/lab_dial.html and
 *   pages/lab_vocal-orb.html captures, which contain the original rendered Notes.
 * - The other seven come from app/data/lab-restored/<slug>.notes.html, Carter's
 *   restored documents (prose verbatim from the Jina-recovered markdown, rendered
 *   through the golden-calibrated Expressive Code reconstruction).
 *
 * The pane bodies are static HTML: `<p class="labd__summary text-lead">`, the
 * "Dependencies" RefRow list, and `<div class="labd__article">` prose. Their
 * Astro scope attributes are intact (f3pbbn5j for labd, mgnwo4tu for the RefRow
 * block), so lab-detail.css applies unmodified; only the arrow-roll scope
 * (klkmuj5r) and the captured copy button inside heart's inline example are
 * stripped (both classes are styled without a scope in Carter too).
 */
import dialNotes from './lab-notes/dial.html?raw';
import dynamicScrollbarNotes from './lab-notes/dynamic-scrollbar.html?raw';
import heartNotes from './lab-notes/heart.html?raw';
import liveCursorsNotes from './lab-notes/live-cursors.html?raw';
import pasteUpNotes from './lab-notes/paste-up.html?raw';
import polkaDotsNotes from './lab-notes/polka-dots.html?raw';
import rotatingGalleryNotes from './lab-notes/rotating-gallery.html?raw';
import threejsTestNotes from './lab-notes/threejs-test.html?raw';
import vocalOrbNotes from './lab-notes/vocal-orb.html?raw';
import dialCode from './lab-code/dial.code.html?raw';
import dynamicScrollbarCode from './lab-code/dynamic-scrollbar.code.html?raw';
import heartCode from './lab-code/heart.code.html?raw';
import liveCursorsCode from './lab-code/live-cursors.code.html?raw';
import pasteUpCode from './lab-code/paste-up.code.html?raw';
import polkaDotsCode from './lab-code/polka-dots.code.html?raw';
import rotatingGalleryCode from './lab-code/rotating-gallery.code.html?raw';
import threeJsTestCode from './lab-code/threejs-test.code.html?raw';
import vocalOrbCode from './lab-code/vocal-orb.code.html?raw';

const labNotes = {
  'live-cursors': liveCursorsNotes,
  dial: dialNotes,
  'polka-dots': polkaDotsNotes,
  heart: heartNotes,
  'threejs-test': threejsTestNotes,
  'dynamic-scrollbar': dynamicScrollbarNotes,
  'rotating-gallery': rotatingGalleryNotes,
  'paste-up': pasteUpNotes,
  'vocal-orb': vocalOrbNotes,
};

const labCode = {
  'live-cursors': liveCursorsCode,
  dial: dialCode,
  'polka-dots': polkaDotsCode,
  heart: heartCode,
  'threejs-test': threeJsTestCode,
  'dynamic-scrollbar': dynamicScrollbarCode,
  'rotating-gallery': rotatingGalleryCode,
  'paste-up': pasteUpCode,
  'vocal-orb': vocalOrbCode,
};
