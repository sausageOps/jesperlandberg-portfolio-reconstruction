import { useEffect, useRef, useState } from 'react';

export default function LetterSignature() {
  const host = useRef(null);
  const [opening, setOpening] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const dialog = host.current?.closest('dialog');
    if (!dialog) return undefined;
    const observer = new MutationObserver(() => {
      if (dialog.open) setOpening((value) => value + 1);
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    if (dialog.open) setOpening((value) => value + 1);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  const image = reducedMotion ? 'aniket-signature-final.png' : 'aniket-signature-animated.png';
  return (
    <span ref={host} className="ov3__sig ov3__signature" data-astro-cid-ta2fbyqs="">
      {opening > 0 && <img key={`${opening}-${image}`} className="ov3__signature-image" src={`/assets/carter/about/${image}?opening=${opening}`} alt="Aniket Chakraborty's handwritten signature" width="508" height="254" />}
    </span>
  );
}
