import { useEffect, useRef } from "react";
import { mountLabIndex } from "./lab-index.js";
import "./lab.css";

/*
 * Carter /lab static DOM port from app/pages/lab/index.astro and
 * app/components/LabItem.astro at sausageOps/carterogunsola-reconstruction
 * 3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249.
 *
 * List, Wheel, and Grid are driven by Carter's original ticker-based LabIndex
 * engine, including its wrapping geometry, drag/wheel input, mode transitions,
 * focus behavior, and hover previews. Posters/reels retain Carter's asset URLs.
 */
const ASSETS_ORIGIN = "https://assets.carterogunsola.com";
const imageUrl = (path, width = 960) =>
  `${ASSETS_ORIGIN}/cdn-cgi/image/width=${width},quality=86,format=auto/${path}`;
const assetUrl = (path) => `${ASSETS_ORIGIN}/${path}`;

const ITEMS = [
  {
    slug: "live-cursors",
    name: "Live Cursors",
    category: "Interaction",
    isNew: true,
    poster: "lab/live-cursors/poster-r3.jpg",
    reel: "lab/live-cursors/reel-r3.mp4",
  },
  {
    slug: "dial",
    name: "Dial",
    category: "Interaction",
    isNew: true,
    poster: "lab/dial/poster-v2.jpg",
    reel: "lab/dial/reel-v2.mp4",
  },
  {
    slug: "polka-dots",
    name: "Polka Dots",
    category: "Canvas",
    isNew: false,
    poster: "lab/polka-dots/poster-v2.jpg",
    reel: "lab/polka-dots/reel.mp4",
  },
  {
    slug: "heart",
    name: "Heart",
    category: "Canvas",
    isNew: true,
    poster: "lab/heart/poster-v3.jpg",
    reel: "lab/heart/reel-v2.mp4",
  },
  {
    slug: "threejs-test",
    name: "ThreeJs Scene",
    category: "3D",
    isNew: false,
    poster: "lab/threejs-test/poster.jpg",
    reel: "lab/threejs-test/reel.mp4",
  },
  {
    slug: "dynamic-scrollbar",
    name: "Dynamic Scrollbar",
    category: "UI",
    isNew: false,
    poster: "lab/dynamic-scrollbar/poster-r2.jpg",
    reel: "lab/dynamic-scrollbar/reel-r3.mp4",
  },
  {
    slug: "rotating-gallery",
    name: "Rotating Gallery",
    category: "Gallery",
    isNew: false,
    poster: "lab/rotating-gallery/poster-nc.jpg",
    reel: "lab/rotating-gallery/reel.mp4",
  },
  {
    slug: "paste-up",
    name: "Paste-Up",
    category: "Transition",
    isNew: true,
    poster: "lab/paste-up/poster-nc.jpg",
    reel: "lab/paste-up/reel.mp4",
  },
  {
    slug: "vocal-orb",
    name: "Vocal Orb",
    category: "3D",
    isNew: true,
    poster: "lab/vocal-orb/poster-v1.jpg",
    reel: "lab/vocal-orb/reel-v1.mp4",
  },
];

function ArrowRoll() {
  return (
    <span className="arrow-roll" aria-hidden="true">
      {["current", "next"].map((position) => (
        <span
          className={`arrow-roll__icon arrow-roll__${position}`}
          key={position}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ))}
    </span>
  );
}

function LabItem({ item, duplicate = false }) {
  const poster = imageUrl(item.poster);
  return (
    <a
      href={`/lab/${item.slug}`}
      className="lab__item"
      data-lab-item=""
      data-hover=""
      data-preview={poster}
      data-reel={assetUrl(item.reel)}
      aria-hidden={duplicate ? "true" : undefined}
      tabIndex={duplicate ? -1 : undefined}
      data-astro-cid-jcwly6sb=""
    >
      <span className="lab__row-face" data-astro-cid-jcwly6sb="">
        <span className="lab__name" data-astro-cid-jcwly6sb="">
          {item.name}
        </span>
        <span
          className="lab__meta"
          aria-hidden="true"
          data-astro-cid-jcwly6sb=""
        >
          <span className="chip text-meta">{item.category}</span>
          {item.isNew && <span className="chip text-meta chip--pill">New</span>}
          <span className="linkcircle" aria-hidden="true">
            <ArrowRoll />
          </span>
        </span>
      </span>
      <span className="lab__card" aria-hidden="true" data-astro-cid-jcwly6sb="">
        <span className="lab__card-media u-media" data-astro-cid-jcwly6sb="">
          <img
            className="u-cover"
            src={poster}
            alt=""
            decoding="async"
            draggable="false"
            data-astro-cid-jcwly6sb=""
          />
        </span>
        <span className="lab__card-cap" data-astro-cid-jcwly6sb="">
          <span className="lab__card-name text-meta" data-astro-cid-jcwly6sb="">
            {item.name}
          </span>
          <span className="lab__card-tags" data-astro-cid-jcwly6sb="">
            <span className="chip text-meta">{item.category}</span>
            {item.isNew && (
              <span className="chip text-meta chip--pill">New</span>
            )}
          </span>
        </span>
      </span>
    </a>
  );
}

function Blur({ edge, height }) {
  return (
    <div
      className={`pblur pblur--${edge}`}
      style={{ "--pblur-h": height }}
      aria-hidden="true"
      data-astro-cid-jcwly6sb=""
      data-astro-cid-c2u6o4li=""
    >
      {[1, 2, 3].map((layer) => (
        <div
          className={`pblur__layer is--${layer}`}
          key={layer}
          data-astro-cid-c2u6o4li=""
        />
      ))}
    </div>
  );
}

export default function LabPage() {
  const labRef = useRef(null);

  useEffect(() => {
    if (!labRef.current) return undefined;
    return mountLabIndex(labRef.current);
  }, []);

  return (
    <main id="main" className="container">
      <h1 className="u-sr-only">Lab — motion experiments</h1>
      <section
        ref={labRef}
        className="lab bleed-full"
        data-lab=""
        data-lab-cols="6"
        data-lab-start="8"
        data-lab-mode="flat"
        aria-label="Lab experiments"
        data-astro-cid-jcwly6sb=""
      >
        <div
          className="lab__viewport"
          data-lab-viewport=""
          data-astro-cid-jcwly6sb=""
        >
          <div
            className="lab__list"
            data-lab-list=""
            data-astro-cid-jcwly6sb=""
          >
            {Array.from({ length: 4 }, (_, copy) =>
              ITEMS.map((item) => (
                <LabItem
                  key={`${copy}-${item.slug}`}
                  item={item}
                  duplicate={copy > 0}
                />
              )),
            )}
          </div>
          <Blur edge="top" height="9em" />
          <Blur edge="bottom" height="6em" />
          <div
            className="lab__mode"
            role="group"
            aria-label="View mode"
            data-lab-mode-toggle=""
            data-astro-cid-jcwly6sb=""
          >
            <button
              className="lab__mode-seg text-meta"
              type="button"
              data-lab-mode-set="flat"
              aria-pressed="true"
              data-astro-cid-jcwly6sb=""
            >
              <span
                className="lab__mode-bg"
                data-lab-mode-bg=""
                aria-hidden="true"
                data-astro-cid-jcwly6sb=""
              />
              List
            </button>
            <button
              className="lab__mode-seg text-meta"
              type="button"
              data-lab-mode-set="wheel"
              aria-pressed="false"
              data-astro-cid-jcwly6sb=""
            >
              Wheel
            </button>
            <button
              className="lab__mode-seg text-meta"
              type="button"
              data-lab-mode-set="grid"
              aria-pressed="false"
              data-astro-cid-jcwly6sb=""
            >
              Grid
            </button>
          </div>
          <div
            className="lab__preview u-media"
            data-lab-preview=""
            aria-hidden="true"
            data-astro-cid-jcwly6sb=""
          >
            <img
              className="lab__preview-img u-cover"
              data-lab-preview-img=""
              src={imageUrl(ITEMS[0].poster)}
              alt=""
              decoding="async"
              data-astro-cid-jcwly6sb=""
            />
            <video
              className="lab__preview-reel u-cover"
              data-lab-preview-reel=""
              muted
              loop
              playsInline
              preload="none"
              hidden
              data-astro-cid-jcwly6sb=""
            />
          </div>
        </div>
      </section>
    </main>
  );
}
