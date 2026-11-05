/*
 * Experiment-level split for the nine Lab stages.
 *
 * Carter's lab document loads the experiment's module on demand and shows the
 * poster with `data-stage-loading` ("Loading experiment" + the loader bar)
 * until it resolves, then swaps to `data-stage-live` and fades the empty state
 * out. The markup that pairs with those attributes is Carter's own
 * (LabDetailPage's `labd__empty` block), which is why it exists in the capture.
 *
 * Jesper's detail route used to import all nine stages statically, so every
 * Lab document also carried eight irrelevant engines and their stylesheets
 * (Phase 14 measurement: 374 kB of the chunk, plus 74 kB of stage CSS). Here
 * each stage — its engine graph and its stylesheet — is its own chunk, and only
 * the current experiment's is fetched. Mount order, teardown and the
 * loading/live sequence are unchanged: the stage components still own their
 * `data-stage-loading` → `data-stage-live` handover and register their teardown
 * through the shared Carter runtime.
 */
const STAGE_LOADERS = {
  'polka-dots': () => import('./PolkaDotsStage.jsx'),
  heart: () => import('./HeartStage.jsx'),
  'rotating-gallery': () => import('./RotatingGalleryStage.jsx'),
  dial: () => import('./DialStage.jsx'),
  'paste-up': () => import('./PasteUpStage.jsx'),
  'threejs-test': () => import('./ThreeJsTestStage.jsx'),
  'dynamic-scrollbar': () => import('./DynamicScrollbarStage.jsx'),
  'live-cursors': () => import('./LiveCursorsStage.jsx'),
  'vocal-orb': () => import('./VocalOrbStage.jsx'),
};

// One in-flight/resolved promise per slug, so moving between two experiments and
// back does not re-download a stage that is already in the module graph.
const loaded = new Map();

/**
 * Resolve the stage component for `slug`, or null when the slug has no stage.
 *
 * A rejected chunk resolves to null after logging, so the document keeps its
 * poster and empty state instead of taking the route down — the same outcome as
 * an engine that fails to mount.
 */
export function loadLabStage(slug) {
  const load = STAGE_LOADERS[slug];
  if (!load) return Promise.resolve(null);
  if (!loaded.has(slug)) {
    loaded.set(
      slug,
      load()
        .then((module) => module.default)
        .catch((error) => {
          loaded.delete(slug);
          console.error(`[lab] ${slug} stage failed to load`, error);
          return null;
        }),
    );
  }
  return loaded.get(slug);
}
