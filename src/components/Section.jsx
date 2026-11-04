import './Section.css';

/**
 * Minimal destination page for a Routes or Myself section.
 *
 * `subtitle` is only used by nested section routes (e.g. a writing detail page):
 * the section's item still supplies the heading, and the nested segment is shown
 * above it so the placeholder identifies the exact URL that resolved.
 */
export default function Section({ menu, item, subtitle }) {
  const title = item ? item.title : menu.label;
  return (
    <main className="section-page route-layer" aria-label={`${title} — ${menu.label}`}>
      <p className="label section-page__group">{menu.label}</p>
      <h1 className="section-page__title">{title}</h1>
      {subtitle && <p className="label section-page__group">{subtitle}</p>}
    </main>
  );
}
