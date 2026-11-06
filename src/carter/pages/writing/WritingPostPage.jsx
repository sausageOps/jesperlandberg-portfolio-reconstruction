import './writing-ec.css';
import './writing-post.css';
import {
  CODE_BLOCKS,
  CREDITS,
  FOLDERS_JSON,
  POST,
  SIGNATURE_PATH,
  SIGNATURE_PTS,
  TOC,
} from '../../data/writing.js';
import { Folders } from '../../engines/folders.js';
import { SignatureFx } from '../../engines/signature-fx.js';
import { WritingPost } from '../../engines/writing-post.js';
import { useCarterEngine } from '../../useCarterEngine.js';
import { initWritingExpressiveCode } from './writingExpressiveCode.js';

/*
 * Carter Writing post (`/writing/the-personal-starter`) inside Jesper's Carter
 * frame (`/routes/writing/the-personal-starter`).
 *
 * Source: `app/pages/writing/the-personal-starter.astro` and captured
 * `pages/writing_the-personal-starter.html` in `sausageOps/carterogunsola-reconstruction`
 * (read-only reference).
 */

function ArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path
        d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpressiveCodeBlock({ block }) {
  const dataCode = block.code.replace(/\n/g, '\u007f');
  return (
    <div className="expressive-code">
      <figure className="frame">
        <figcaption className="header" />
        <pre
          data-language={block.language}
          className="wrap"
          style={{ '--ecMaxLine': block.maxLine }}
        >
          <code>
            {block.lines.map((line, idx) => (
              <div
                key={idx}
                className="ec-line"
                style={line.indent ? { '--ecIndent': line.indent } : undefined}
              >
                <div
                  className="code"
                  dangerouslySetInnerHTML={{ __html: line.html }}
                />
              </div>
            ))}
          </code>
        </pre>
        <div className="copy">
          <div aria-live="polite" />
          <button
            type="button"
            title="Copy to clipboard"
            data-copied="Copied!"
            data-code={dataCode}
          >
            <div />
          </button>
        </div>
      </figure>
    </div>
  );
}

export default function WritingPostPage() {
  useCarterEngine('writing-folders', () => Folders.init(), { beforePaint: true });
  useCarterEngine('writing-post', () => WritingPost.init());
  useCarterEngine('writing-signature', () => SignatureFx.init());
  useCarterEngine('writing-ec', () => initWritingExpressiveCode());

  return (
    <main
      id="main"
      className="wpost container"
      data-writing-post=""
      data-folders-slug={POST.slug}
      data-astro-cid-7mn2gw7j=""
    >
      <script
        type="application/json"
        data-folders-data=""
        dangerouslySetInnerHTML={{ __html: FOLDERS_JSON }}
      />

      <aside className="wpost__rail" data-flight-wait="" data-astro-cid-7mn2gw7j="">
        <nav
          className="toc is-open"
          data-toc=""
          aria-label="Table of contents"
          data-astro-cid-exnokgqg=""
        >
          <div className="toc__head" data-astro-cid-exnokgqg="">
            <span className="toc__id" data-astro-cid-exnokgqg="">
              <svg
                className="toc__ring"
                viewBox="0 0 14 14"
                aria-hidden="true"
                style={{ '--ring-c': '34.558' }}
                data-astro-cid-exnokgqg=""
              >
                <circle
                  className="toc__ring-track"
                  cx="7"
                  cy="7"
                  r="5.5"
                  data-astro-cid-exnokgqg=""
                />
                <circle
                  className="toc__ring-fill"
                  data-toc-ring=""
                  cx="7"
                  cy="7"
                  r="5.5"
                  strokeDasharray="34.558"
                  strokeDashoffset="34.558"
                  data-astro-cid-exnokgqg=""
                />
              </svg>
              <span className="toc__label text-label" data-astro-cid-exnokgqg="">
                Table of content
              </span>
            </span>
            <button
              className="toc__chev"
              type="button"
              data-toc-toggle=""
              aria-expanded="true"
              aria-controls="toc-list"
              aria-label="Collapse table of contents"
              data-astro-cid-exnokgqg=""
            >
              <svg
                width="1em"
                height="1em"
                className="toc__chev-icon"
                aria-hidden="true"
                data-astro-cid-exnokgqg="true"
                data-icon="chevron-right"
              >
                <symbol id="ai:local:chevron-right" viewBox="0 0 24 24">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m9 4 6.586 6.586a2 2 0 0 1 0 2.828L9 20"
                  />
                </symbol>
                <use href="#ai:local:chevron-right" />
              </svg>
            </button>
          </div>
          <div className="toc__body" id="toc-list" data-toc-body="" data-astro-cid-exnokgqg="">
            <div className="toc__clip" data-astro-cid-exnokgqg="">
              <ol className="toc__list" data-astro-cid-exnokgqg="">
                {TOC.map((item, idx) => (
                  <li key={item.id} data-astro-cid-exnokgqg="">
                    <a
                      className="toc__item text-meta"
                      href={`#${item.id}`}
                      data-toc-item=""
                      data-toc-active={idx === 0 ? '' : undefined}
                      data-astro-cid-exnokgqg=""
                    >
                      {idx === 0 && (
                        <span
                          className="toc__item-bg"
                          data-toc-bg=""
                          aria-hidden="true"
                          data-astro-cid-exnokgqg=""
                        />
                      )}
                      <span className="toc__dot" aria-hidden="true" data-astro-cid-exnokgqg="" />
                      <span className="toc__text" data-astro-cid-exnokgqg="">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </nav>
      </aside>

      <div className="wpost__close" data-astro-cid-7mn2gw7j="">
        <a
          href="/writing"
          aria-label="Close — back to writing"
          data-flight-wait="true"
          data-astro-cid-7mn2gw7j="true"
          data-astro-cid-rqy3m4bm="true"
          className="closebox closebox--md closebox--fill"
        >
          <svg
            width="1em"
            height="1em"
            aria-hidden="true"
            data-astro-cid-rqy3m4bm="true"
            data-icon="close"
          >
            <symbol id="ai:local:close" viewBox="0 0 24 24">
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
                d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5"
              />
            </symbol>
            <use href="#ai:local:close" />
          </svg>
        </a>
      </div>

      <article className="wpost__col" data-flight-paper="" data-astro-cid-7mn2gw7j="">
        <div className="wpost__claim" data-sheet-claim="" aria-hidden="true" data-astro-cid-7mn2gw7j="" />
        <p className="wpost__masthead text-label" aria-hidden="true" data-astro-cid-7mn2gw7j="">
          <span data-astro-cid-7mn2gw7j="">{POST.masthead}</span>
          <span data-astro-cid-7mn2gw7j="">{POST.num}</span>
        </p>
        <p className="wpost__date" data-astro-cid-7mn2gw7j="">
          <span aria-hidden="true" data-astro-cid-7mn2gw7j="">
            ::{' '}
          </span>
          {POST.date}
        </p>
        <h1 className="wpost__title" data-astro-cid-7mn2gw7j="">
          {POST.title}
        </h1>
        <aside className="wpost__tldr" aria-label="TL;DR" data-astro-cid-7mn2gw7j="">
          <p className="wpost__tldr-label text-label" data-astro-cid-7mn2gw7j="">
            TL;DR
          </p>
          <p className="wpost__tldr-text" data-astro-cid-7mn2gw7j="">
            {POST.tldr}
          </p>
        </aside>

        <div className="wpost__article" data-post-article="" data-astro-cid-7mn2gw7j="">
          <p>
            If you’re a web developer or software developer in today’s world, you’d be familiar with
            the terms templates, kits, starters, boilerplates, generators, stacks etc. From my
            understanding as a developer, all of this in its simplest form aims at helping developers
            with code they refuse to write twice and will reuse. This concept has existed from Rails
            generators through HTML5 Boilerplate, Yeoman, create-react-app to the Remix Stacks, the
            Epic Stack, create-t3-app, the shadcn registry model and the list goes on. I’d in fact
            argue that your CSS libraries &amp; frameworks, the likes of Bootstrap &amp; Tailwind,
            sneak their way into this category because in a way, those CSS libraries &amp; frameworks
            help you move fast with prewritten CSS styles.
          </p>
          <p>
            While I’m also a software developer, I’d prefer to keep this topic in the lens of a web
            developer. This is because I see how easy it is to mix up the product regime (SaaS-like
            starters) with what I’d call, for the sake of clarity in this writing, the “studio
            regime”, which focuses more on websites. A third piece, and it’s the subject of this
            post’s stance, is “the personal starter”, usually with an audience of one.
          </p>
          <p>
            I’m deliberately choosing to use the term “starter” among the others to categorize this,
            because I’d define a starter as an opinionated project folder with layers that could
            include the routes, controllers, utils and views you need etc.
          </p>

          <h2 id="product-vs-studio">Product vs studio</h2>
          <p>
            That definition is loose on purpose, because the layers change depending on who the
            starter is for. On the product side the layers you’d expect are auth, a database, email,
            payments, maybe analytics, and something like the{' '}
            <a href="https://github.com/epicweb-dev/epic-stack">Epic Stack</a> or{' '}
            <a href="https://create.t3.gg/en/introduction">create-t3-app</a> is a good picture of
            that. On the studio side none of that really shows up, instead it’s smooth scroll, page
            transitions, a WebGL layer that has to stay in sync with the page, a tune panel, a dev
            grid etc.
          </p>
          <p>
            Both get called starters and both are opinionated, but I’d argue they aren’t deep in the
            same way, and a lot of the “this starter is bloated” or “this starter does nothing” takes
            I see come from holding one up against the other’s checklist.
          </p>

          <h2 id="the-personal-starter">The personal starter</h2>
          <p>
            The personal starter is a bit of a strange one because the author is also the only user.
            There’s no adoption to worry about, no landing page to sell it and no team to onboard,
            which sounds freeing until you realize the only thing keeping it honest is your next
            project. If I clone it for a new site and the first thing I do is delete half of it, then
            that half belonged to the last project and I just got attached to it.
          </p>

          <h2 id="what-goes-in">What goes in</h2>
          <p>
            The way I’d decide what goes in is frequency. If something shows up in most of the sites
            I build it earns a place, and if it only showed up once, even if it was the best thing I
            made that year, it stays in that project. For the kind of sites I build that ends up
            being:
          </p>
          <ul>
            <li>
              The page lifecycle (what runs when a page mounts and what gets cleaned up when it
              leaves)
            </li>
            <li>The transition between pages</li>
            <li>Scroll</li>
            <li>The text reveals</li>
            <li>Type and spacing tokens</li>
            <li>The SEO head and the deploy setup</li>
          </ul>
          <p>The paper shader on my own site doesn’t make the list, as much as I like it.</p>

          <h2 id="shape-and-engines">Shape and engines</h2>
          <p>
            There’s another split I’d make. Some of this code is shape, like the folders, the tokens,
            the layouts and the config, and I want every project to own its own copy and bend it
            however it needs. Other parts, like the transition engine or the page lifecycle, have an
            actual API, and copying those from project to project means every site ends up with its
            own slightly different version of the same bug.
          </p>
          <p>
            For those I’d rather have small packages I can version and update, and let the starter
            just wire them up. In the Odyn Astro starter that wiring is one file,{' '}
            <code>src/app.ts</code>, and it mostly reads like a list of what’s plugged in:
          </p>

          <ExpressiveCodeBlock block={CODE_BLOCKS[0]} />

          <h2 id="keeping-projects-in-sync">Keeping projects in sync</h2>
          <p>
            This is also why I don’t try to keep projects in sync with the starter. It’s tempting,
            fix it once and every site gets the fix, but the moment a project starts it’s supposed to
            drift, that’s the whole point of it being mine to change. Most of the product starters
            say the same thing in their own way, the Epic Stack pretty much tells you{' '}
            <a href="https://github.com/epicweb-dev/epic-stack/blob/main/docs/managing-updates.md">
              the code is yours and there’s no update path
            </a>
            .
          </p>
          <p>
            What I do instead is stamp each project with the version of the starter it came from, so
            if I ever want to bring something across I can at least see what changed. It’s just a few
            lines in <code>package.json</code>:
          </p>

          <ExpressiveCodeBlock block={CODE_BLOCKS[1]} />

          <p>Anything that proves itself in a project goes back into the starter by hand.</p>

          <h2 id="why-small">Why small</h2>
          <p>
            I’d also argue smaller lasts longer. A big starter feels great the day you clone it and
            then slowly turns into something you’re scared to touch, while a small one you can read
            in one sitting and actually keep current. Anthony Fu’s tiny{' '}
            <a href="https://github.com/antfu/starter-ts">starter-ts</a> has outlived his much
            bigger <a href="https://github.com/antfu-collective/vitesse">Vitesse</a>, and Kent C.
            Dodds’ Epic Stack somehow got more opinionated while getting smaller, which is the
            direction I want mine going in.
          </p>

          <h2 id="odyn-astro-starter">Odyn Astro starter</h2>
          <p>
            All of this is what I tried to put into the{' '}
            <a href="https://github.com/CarterOgunsola/odyn-astro-starter">Odyn Astro starter</a>.
            It’s static Astro with vanilla TypeScript, SCSS and GSAP, deployed on Cloudflare, no
            React and no islands, because that’s how I build sites.
          </p>
          <p>
            The engines live in their own small packages, the rest is plain project code each new
            site owns, it runs from a fresh clone without needing an account or an API key (something
            I see people complain about on starter repos all the time), and there’s a written reason
            next to every decision so future me doesn’t have to guess why something is there.
          </p>
          <p>
            It’s still early though. The real test for a personal starter is the second project that
            comes out of it, and whatever that project deletes without thinking twice is probably
            what I got wrong, so I’ll likely write about that when it happens.
          </p>
        </div>

        <section className="wpost__credits" aria-label="Credits" data-astro-cid-7mn2gw7j="">
          <p className="wpost__credits-label text-label" data-astro-cid-7mn2gw7j="">
            Credits
          </p>
          <div className="wpost__credits-rule" aria-hidden="true" data-astro-cid-7mn2gw7j="" />
          <div className="wpost__credits-list" data-astro-cid-7mn2gw7j="">
            {CREDITS.map((credit, idx) => (
              <a
                key={credit.href}
                data-hover="true"
                href={credit.href}
                target="_blank"
                rel="noopener noreferrer"
                data-astro-cid-mgnwo4tu="true"
                className="refrow refrow--link refrow--stretch"
              >
                <span className="refrow__badge" data-astro-cid-mgnwo4tu="">
                  <svg
                    width="1em"
                    height="1em"
                    viewBox={idx === 0 ? undefined : '0 0 24 24'}
                    className="refrow__icon"
                    aria-hidden="true"
                    data-astro-cid-mgnwo4tu="true"
                    data-icon="globe"
                  >
                    {idx === 0 && (
                      <symbol id="ai:local:globe" viewBox="0 0 24 24">
                        <g
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="square"
                          strokeWidth="1.5"
                        >
                          <path d="M21.25 12a9.25 9.25 0 1 1-18.5 0 9.25 9.25 0 0 1 18.5 0Z" />
                          <path d="M12 21c-2.21 0-4-4.03-4-9s1.79-9 4-9 4 4.03 4 9-1.79 9-4 9Zm9-9H3" />
                        </g>
                      </symbol>
                    )}
                    <use href="#ai:local:globe" />
                  </svg>
                </span>
                <span className="refrow__label text-tag" data-astro-cid-mgnwo4tu="">
                  {credit.label}
                </span>
                <span className="refrow__ext" aria-hidden="true" data-astro-cid-mgnwo4tu="">
                  <span
                    className="arrow-roll arrow-roll--diagonal"
                    aria-hidden="true"
                    data-astro-cid-klkmuj5r=""
                  >
                    <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
                      <ArrowIcon />
                    </span>
                    <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
                      <ArrowIcon />
                    </span>
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div className="wpost__credits-rule" aria-hidden="true" data-astro-cid-7mn2gw7j="" />
        </section>

        <div className="wpost__signoff" data-astro-cid-7mn2gw7j="">
          <p data-astro-cid-7mn2gw7j="">Sincerely,</p>
          <span
            className="signature wpost__sig"
            data-signature=""
            data-sig-pts={SIGNATURE_PTS}
            data-astro-cid-hiiitl63=""
          >
            <svg
              className="signature__svg"
              role="img"
              aria-label="Carter Ogunsola signature"
              overflow="visible"
              viewBox="0 0 897 173"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              data-astro-cid-hiiitl63=""
            >
              <path
                className="signature__path"
                data-sig-path=""
                d={SIGNATURE_PATH}
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-astro-cid-hiiitl63=""
              />
            </svg>
          </span>
        </div>
      </article>
    </main>
  );
}
