/**
 * The nine Lab experiments, in Carter's source order.
 *
 * Slug, display name and description only, so this module stays tiny enough for
 * routes.js to import statically (App.jsx bundles routes.js for the document
 * title and description). Categories, media paths and the Notes panes live in
 * ./lab.js, which merges these records into Carter's `LAB_ITEMS`.
 *
 * Source: `app/data/lab.ts` in sausageOps/carterogunsola-reconstruction
 * 3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249 (comment there: "The order, names,
 * categories and media paths are taken from pages/lab.html"); `description` is
 * the per-experiment summary that reaches Carter's `<meta name="description">`
 * and JSON-LD through `lab/[slug].astro`. That order is also Carter's prev/next
 * ring and the `position` odometer (`index + 1` of nine).
 */
export const LAB_ENTRIES = Object.freeze([
  {
    slug: 'live-cursors',
    name: 'Live Cursors',
    description:
      "Everyone else on the page, in real time. You broadcast your pointer as a 0-to-1 position, a Cloudflare Durable Object fans it out, and each peer eases toward its latest spot, on the same server that counts who's online in the header.",
  },
  {
    slug: 'dial',
    name: 'Dial',
    description:
      'A tuner dial you spin: a full ring of channels hubbed off-screen left, one active where it crosses the axis. Drag, scroll, or arrow-key it; each detent snaps with an elastic settle and a click pitched to how fast you spun.',
  },
  {
    slug: 'polka-dots',
    name: 'Polka Dots',
    description:
      'A grid of dots run as one spring integration on a single ticker. The cursor repels and blooms them, a click sends a ripple through the field, and a slow wave keeps it breathing at rest.',
  },
  {
    slug: 'heart',
    name: 'Heart',
    description:
      "Taubin's implicit heart surface, solved into a point cloud and spun on canvas. Grab it and it coasts on its own momentum, the outer points trailing elastically, tone carried by a monochrome halftone.",
  },
  {
    slug: 'threejs-test',
    name: 'ThreeJs Scene',
    description:
      'A vanilla Three.js scene, pared to the basis: a renderer on a canvas, a camera, orbit controls, a render loop. On the stage, a loaded glTF model or a superformula that morphs between four shapes, each drawn as surface, mesh or vertices, in one of four finishes baked from a lit sphere.',
  },
  {
    slug: 'dynamic-scrollbar',
    name: 'Dynamic Scrollbar',
    description:
      "A slim gray bar that inks to black and blooms into a live analog clock as you scroll, then taps open into a working native-audio mini player. A faithful rebuild of Xavier Jac's three-state Webflow scrollbar, on its own Lenis-style smooth scroll.",
  },
  {
    slug: 'rotating-gallery',
    name: 'Rotating Gallery',
    description:
      'A ring of image plates riding pure translateZ depth under a deep perspective. Drag, scroll, or let it drift, the front card live and in color. Hit the grid button and the same cards re-parent into a grid via GSAP Flip.',
  },
  {
    slug: 'paste-up',
    name: 'Paste-Up',
    description:
      "One set of prints, three layout boards. The DOM lays out invisible boxes; WebGL planes sit on them, each claimed by an ID. Switch boards and the prints fly to their new homes. The transition is never written, only implied. Landberg's mirrored-DOM mechanism, on the paste-up table.",
  },
  {
    slug: 'vocal-orb',
    name: 'Vocal Orb',
    description:
      'A small black hole that listens. Talk and it moves with your voice, writes back what you said, picks up the mood of it, and can play your own voice back through a few effects. All of it runs on your device.',
  },
]);

/** Carter's per-experiment description for a Lab slug (document metadata). */
export const labDescription = (slug) =>
  LAB_ENTRIES.find((entry) => entry.slug === slug)?.description ?? null;
