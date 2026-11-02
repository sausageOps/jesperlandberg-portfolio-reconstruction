import './Section.css';

/** Minimal destination page for a Routes or Myself section. */
export default function Section({ menu, item }) {
  const title = item ? item.title : menu.label;
  return (
    <main className="section-page route-layer" aria-label={`${title} — ${menu.label}`}>
      <p className="label section-page__group">{menu.label}</p>
      <h1 className="section-page__title">{title}</h1>
    </main>
  );
}
