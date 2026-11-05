/**
 * Phase 15 verification suite — Carter Writing index (`/routes/writing`) and
 * post (`/routes/writing/the-personal-starter`).
 *
 * Usage:
 *   npm run build
 *   CARTER_REF=/tmp/carter-ref node verify/writing-verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactDOMClient from 'react-dom/client';
import postcss from 'postcss';
import { createServer } from 'vite';

// Three.js reads its animation scheduling realm at module evaluation. Provide
// browser-equivalent hooks before Vite loads the Carter engines in this Node
// verification process.
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

const ROOT = process.cwd();
const quietVirtualConsole = new VirtualConsole();
const parseHTML = (html) => new JSDOM(html, { virtualConsole: quietVirtualConsole }).window.document;
const CARTER_REF = process.env.CARTER_REF || '';

let passed = 0;
let failed = 0;
function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Stubs for 2D canvas + WebGL2 recording context                             */
/* -------------------------------------------------------------------------- */

function make2D() {
  const grad = { addColorStop() {} };
  return new Proxy(
    {
      fillStyle: '#000',
      strokeStyle: '#000',
      font: '16px sans-serif',
      globalAlpha: 1,
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      measureText(str = '') {
        return { width: String(str).length * 8 };
      },
      createLinearGradient() {
        return grad;
      },
      createRadialGradient() {
        return grad;
      },
      getImageData(x, y, w = 1, h = 1) {
        return { data: new Uint8ClampedArray(w * h * 4) };
      },
      createImageData(w = 1, h = 1) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      },
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {};
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );
}

function makeGL(record) {
  const BY_NAME = new Map();
  const BY_ID = new Map();
  let nextId = 0x2000;
  const constId = (name) => {
    if (!BY_NAME.has(name)) {
      const id = nextId++;
      BY_NAME.set(name, id);
      BY_ID.set(id, name);
    }
    return BY_NAME.get(name);
  };
  const PARAMS = {
    VERSION: 'WebGL 2.0 (stub)',
    SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 3.00 (stub)',
    VENDOR: 'stub',
    RENDERER: 'stub',
    MAX_TEXTURE_SIZE: 16384,
    MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
    MAX_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VERTEX_UNIFORM_VECTORS: 4096,
    MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
    MAX_VARYING_VECTORS: 31,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_SAMPLES: 4,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 2048,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
    MAX_UNIFORM_BUFFER_BINDINGS: 24,
    MAX_UNIFORM_BLOCK_SIZE: 65536,
    MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16,
    UNMASKED_VENDOR_WEBGL: 'stub',
    UNMASKED_RENDERER_WEBGL: 'stub renderer',
    ALIASED_LINE_WIDTH_RANGE: new Float32Array([1, 1]),
    ALIASED_POINT_SIZE_RANGE: new Float32Array([1, 1024]),
    VIEWPORT: new Int32Array([0, 0, 1440, 900]),
    SCISSOR_BOX: new Int32Array([0, 0, 1440, 900]),
  };
  let id = 1;
  let lost = false;
  record.created += 1;
  const base = {
    getParameter(p) {
      const name = BY_ID.get(p);
      if (name && name in PARAMS) return PARAMS[name];
      if (name && name.startsWith('MAX_')) return 16;
      return 0;
    },
    getExtension(name) {
      if (name === 'WEBGL_lose_context') {
        return {
          loseContext() {
            lost = true;
            record.lost += 1;
          },
          restoreContext() {
            lost = false;
          },
        };
      }
      if (name === 'WEBGL_debug_renderer_info') {
        return {
          UNMASKED_VENDOR_WEBGL: constId('UNMASKED_VENDOR_WEBGL'),
          UNMASKED_RENDERER_WEBGL: constId('UNMASKED_RENDERER_WEBGL'),
        };
      }
      if (name === 'EXT_texture_filter_anisotropic') {
        return {
          MAX_TEXTURE_MAX_ANISOTROPY_EXT: constId('MAX_TEXTURE_MAX_ANISOTROPY_EXT'),
          TEXTURE_MAX_ANISOTROPY_EXT: constId('TEXTURE_MAX_ANISOTROPY_EXT'),
        };
      }
      if (
        name === 'EXT_color_buffer_float' ||
        name === 'EXT_color_buffer_half_float' ||
        name === 'OES_texture_float_linear'
      ) {
        return {};
      }
      return null;
    },
    getSupportedExtensions() {
      return [
        'EXT_color_buffer_float',
        'EXT_texture_filter_anisotropic',
        'OES_texture_float_linear',
        'WEBGL_lose_context',
      ];
    },
    getShaderPrecisionFormat() {
      return { precision: 23, rangeMin: 127, rangeMax: 127 };
    },
    getProgramParameter(target, p) {
      const name = BY_ID.get(p);
      if (name === 'LINK_STATUS' || name === 'VALIDATE_STATUS') return true;
      return 0;
    },
    getShaderParameter(target, p) {
      return BY_ID.get(p) === 'COMPILE_STATUS' ? true : 0;
    },
    getShaderInfoLog() {
      return '';
    },
    getProgramInfoLog() {
      return '';
    },
    getActiveUniform() {
      return { name: 'x', size: 1, type: constId('FLOAT') };
    },
    getActiveAttrib() {
      return { name: 'x', size: 1, type: constId('FLOAT') };
    },
    getUniformLocation() {
      return { __loc: id++ };
    },
    getAttribLocation() {
      return 0;
    },
    checkFramebufferStatus() {
      return constId('FRAMEBUFFER_COMPLETE');
    },
    getError() {
      return constId('NO_ERROR');
    },
    isContextLost() {
      return lost;
    },
    getContextAttributes() {
      return { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true };
    },
    drawArrays() {
      record.draws += 1;
    },
    drawElements() {
      record.draws += 1;
    },
  };
  const cache = new Map();
  return new Proxy(base, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== 'string') return undefined;
      if (/^[A-Z0-9_]+$/.test(prop)) return constId(prop);
      if (!cache.has(prop)) {
        cache.set(prop, () => {
          if (prop.startsWith('create')) return { __id: id++ };
          return undefined;
        });
      }
      return cache.get(prop);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Boot Vite SSR loader once                                                  */
/* -------------------------------------------------------------------------- */

const vite = await createServer({
  root: ROOT,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});

try {
  /* ======================================================================== */
  /* A. Route & Metadata Contracts                                            */
  /* ======================================================================== */
  console.log('\n=== A. Route & metadata contracts ===');
  const routesMod = await vite.ssrLoadModule('/src/carter/routes.js');
  const { resolveCarterPage, toJesperPath } = routesMod;

  const wPage = resolveCarterPage('/routes/writing');
  const wpPage = resolveCarterPage('/routes/writing/the-personal-starter');
  check(
    'A1 /routes/writing resolves to writing key with Carter path & description',
    wPage?.key === 'writing' &&
      wPage?.carter === '/writing' &&
      wPage?.description ===
        'Notes on design, development, motion, tools, creativity, and sometimes life outside of work.',
    JSON.stringify(wPage),
  );
  check(
    'A2 /routes/writing/the-personal-starter resolves to writing-post with slug, label & description',
    wpPage?.key === 'writing-post' &&
      wpPage?.carter === '/writing/the-personal-starter' &&
      wpPage?.slug === 'the-personal-starter' &&
      wpPage?.label === 'The personal starter' &&
      wpPage?.description?.startsWith('Templates, kits, starters, boilerplates etc.'),
    `${wpPage?.label} :: Writing`,
  );
  check(
    'A3 toJesperPath maps /writing and /writing/the-personal-starter(#hash) while leaving #hash & external URLs untouched',
    toJesperPath('/writing') === '/routes/writing' &&
      toJesperPath('/writing/the-personal-starter') === '/routes/writing/the-personal-starter' &&
      toJesperPath('/writing/the-personal-starter#why-small') ===
        '/routes/writing/the-personal-starter#why-small' &&
      toJesperPath('#product-vs-studio') === null &&
      toJesperPath('https://github.com/CarterOgunsola/odyn-astro-starter') === null,
  );
  const appSource = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  check(
    'A4 App document-head effect applies Writing post title and route description metadata',
    appSource.includes("carterPage?.key === 'writing-post'") &&
      appSource.includes('`${carterPage.label} :: Writing`') &&
      appSource.includes('carterPage?.description || null') &&
      appSource.includes('description.setAttribute(\'content\', text)'),
  );

  /* ======================================================================== */
  /* B. SSR & Captured-HTML Structural Parity                                 */
  /* ======================================================================== */
  console.log('\n=== B. SSR & captured-HTML structural parity ===');
  // React packages are CommonJS in this repository's dependency graph; import
  // them natively while Vite SSR-loads the app's ESM source modules.
  const { default: WritingPage } = await vite.ssrLoadModule(
    '/src/carter/pages/writing/WritingPage.jsx',
  );
  const { default: WritingPostPage } = await vite.ssrLoadModule(
    '/src/carter/pages/writing/WritingPostPage.jsx',
  );

  const indexHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(WritingPage));
  const postHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(WritingPostPage));
  const indexDoc = parseHTML(indexHtml);
  const postDoc = parseHTML(postHtml);

  check(
    'B1 WritingPage SSR renders main#main.writing with hidden .wstage and visible .writing__classic',
    Boolean(
      indexDoc.querySelector('main#main.writing[data-astro-cid-63pe4dpb]') &&
        indexDoc.querySelector('section.wstage[data-folders][hidden][role="group"]') &&
        indexDoc.querySelector('div.writing__classic.container[data-folders-classic]') &&
        !indexDoc.querySelector('div.writing__classic')?.hasAttribute('hidden'),
    ),
  );
  const indexTabs = [...indexDoc.querySelectorAll('[data-index-tab]')];
  check(
    'B2 WritingPage renders 6 archive filter tabs with All selected initially',
    indexTabs.length === 6 &&
      indexTabs.map((b) => `${b.dataset.cat}:${b.textContent}:${b.getAttribute('aria-selected')}`).join('|') ===
        'all:All:true|web:web:false|design:design:false|motion:motion:false|tools:tools:false|life:life:false',
  );
  const indexRows = [...indexDoc.querySelectorAll('[data-index-rows] > a.row.row--link')];
  check(
    'B3 WritingPage renders the single FOLDERS row with exact chips and empty state',
    indexRows.length === 1 &&
      indexRows[0].getAttribute('href') === '/writing/the-personal-starter' &&
      indexRows[0].getAttribute('data-cat') === 'web' &&
      indexRows[0].querySelector('.row__label')?.textContent === 'The personal starter' &&
      [...indexRows[0].querySelectorAll('.chip')].map((c) => c.textContent).join('|') ===
        'Sep 16|2026|web' &&
      indexDoc.querySelector('[data-index-empty]')?.textContent === 'Nothing filed here yet',
  );

  check(
    'B4 WritingPostPage SSR renders main#main.wpost with rail TOC, closebox, paper col, 7 h2s, 2 code blocks, 6 credits, and signature',
    postDoc.querySelector('main#main.wpost.container[data-writing-post][data-folders-slug="the-personal-starter"]') !==
      null &&
      postDoc.querySelectorAll('[data-toc-item]').length === 7 &&
      postDoc.querySelectorAll('[data-post-article] h2[id]').length === 7 &&
      postDoc.querySelectorAll('.expressive-code').length === 2 &&
      postDoc.querySelectorAll('.wpost__credits-list a.refrow').length === 6 &&
      postDoc.querySelector('.wpost__sig[data-signature][data-sig-pts] svg.signature__svg path[data-sig-path]') !==
        null,
  );
  check(
    'B5 Inline astro-icon symbols (#ai:local:circle-info, #ai:local:chevron-right, #ai:local:close, #ai:local:globe) are self-contained',
    Boolean(
      indexDoc.getElementById('ai:local:circle-info') &&
        postDoc.getElementById('ai:local:chevron-right') &&
        postDoc.getElementById('ai:local:close') &&
        postDoc.getElementById('ai:local:globe') &&
        postDoc.querySelectorAll('use[href="#ai:local:globe"]').length === 6,
    ),
  );

  if (CARTER_REF && fs.existsSync(path.join(CARTER_REF, 'pages/writing.html'))) {
    const refIndexDoc = parseHTML(
      fs.readFileSync(path.join(CARTER_REF, 'pages/writing.html'), 'utf8'),
    );
    const refPostDoc = parseHTML(
      fs.readFileSync(path.join(CARTER_REF, 'pages/writing_the-personal-starter.html'), 'utf8'),
    );

    const refFoldersJson = JSON.parse(
      refIndexDoc.querySelector('[data-folders-data]').textContent,
    );
    const portFoldersJson = JSON.parse(
      indexDoc.querySelector('[data-folders-data]').textContent,
    );
    const portPostFoldersJson = JSON.parse(
      postDoc.querySelector('[data-folders-data]').textContent,
    );
    check(
      'B6 [data-folders-data] JSON matches Carter pages/writing.html & pages/writing_the-personal-starter.html verbatim',
      JSON.stringify(portFoldersJson) === JSON.stringify(refFoldersJson) &&
        JSON.stringify(portPostFoldersJson) === JSON.stringify(refFoldersJson),
    );

    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const refIntro = [...refIndexDoc.querySelectorAll('.writing__prose p')].map((p) =>
      norm(p.textContent),
    );
    const portIntro = [...indexDoc.querySelectorAll('.writing__prose p')].map((p) =>
      norm(p.textContent),
    );
    check(
      'B7 WritingPage intro paragraphs match Carter pages/writing.html word-for-word',
      JSON.stringify(portIntro) === JSON.stringify(refIntro),
    );

    const refToc = [...refPostDoc.querySelectorAll('[data-toc-item]')].map(
      (a) => `${a.getAttribute('href')}:${norm(a.textContent)}:${a.hasAttribute('data-toc-active')}`,
    );
    const portToc = [...postDoc.querySelectorAll('[data-toc-item]')].map(
      (a) => `${a.getAttribute('href')}:${norm(a.textContent)}:${a.hasAttribute('data-toc-active')}`,
    );
    check(
      'B8 WritingPostPage TOC items, hrefs, and initial active marker match Carter 1:1',
      JSON.stringify(portToc) === JSON.stringify(refToc),
    );

    const refHeadings = [...refPostDoc.querySelectorAll('[data-post-article] h2')].map(
      (h) => `${h.id}:${norm(h.textContent)}`,
    );
    const portHeadings = [...postDoc.querySelectorAll('[data-post-article] h2')].map(
      (h) => `${h.id}:${norm(h.textContent)}`,
    );
    const refParas = [...refPostDoc.querySelectorAll('[data-post-article] > p, [data-post-article] li')].map(
      (el) => norm(el.textContent),
    );
    const portParas = [...postDoc.querySelectorAll('[data-post-article] > p, [data-post-article] li')].map(
      (el) => norm(el.textContent),
    );
    check(
      'B9 WritingPostPage headings, prose paragraphs, and list items match Carter word-for-word',
      JSON.stringify(portHeadings) === JSON.stringify(refHeadings) &&
        JSON.stringify(portParas) === JSON.stringify(refParas) &&
        norm(postDoc.querySelector('.wpost__tldr-text').textContent) ===
          norm(refPostDoc.querySelector('.wpost__tldr-text').textContent),
      `${portParas.length} blocks`,
    );

    const refCodes = [...refPostDoc.querySelectorAll('.expressive-code button[data-code]')].map(
      (b) => b.getAttribute('data-code'),
    );
    const portCodes = [...postDoc.querySelectorAll('.expressive-code button[data-code]')].map(
      (b) => b.getAttribute('data-code'),
    );
    check(
      'B10 ExpressiveCode data-code attributes (\\u007f-delimited) match Carter byte-for-byte',
      JSON.stringify(portCodes) === JSON.stringify(refCodes),
      `blocks=${portCodes.length}`,
    );

    const refCredits = [...refPostDoc.querySelectorAll('.wpost__credits-list a.refrow')].map(
      (a) => `${a.getAttribute('href')}|${norm(a.querySelector('.refrow__label').textContent)}`,
    );
    const portCredits = [...postDoc.querySelectorAll('.wpost__credits-list a.refrow')].map(
      (a) => `${a.getAttribute('href')}|${norm(a.querySelector('.refrow__label').textContent)}`,
    );
    const refSigPts = refPostDoc.querySelector('[data-signature]').getAttribute('data-sig-pts');
    const portSigPts = postDoc.querySelector('[data-signature]').getAttribute('data-sig-pts');
    const refSigD = refPostDoc.querySelector('[data-sig-path]').getAttribute('d');
    const portSigD = postDoc.querySelector('[data-sig-path]').getAttribute('d');
    check(
      'B11 Credits rows and Signature path + calligraphy sample points match Carter byte-for-byte',
      JSON.stringify(portCredits) === JSON.stringify(refCredits) &&
        portSigPts === refSigPts &&
        portSigD === refSigD,
    );
  }

  /* ======================================================================== */
  /* C. CSS Scoping, Token Coverage, Breakpoints & Built-Bundle `rem` Audit   */
  /* ======================================================================== */
  console.log('\n=== C. CSS scoping, tokens, breakpoints & built-bundle audit ===');
  const tokensCss = fs.readFileSync(path.join(ROOT, 'src/carter/styles/tokens.css'), 'utf8');
  const globalTokens = new Set(
    [...tokensCss.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]),
  );
  const cssFiles = ['writing.css', 'writing-post.css', 'writing-ec.css'];
  const parsedCss = new Map(
    cssFiles.map((file) => [
      file,
      postcss.parse(fs.readFileSync(path.join(ROOT, 'src/carter/pages/writing', file), 'utf8')),
    ]),
  );
  const locallyDefined = new Set();
  for (const root of parsedCss.values()) {
    root.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) locallyDefined.add(decl.prop);
    });
  }
  let unscopedCount = 0;
  const missingTokens = new Set();
  const selectorList = (selector) => {
    const out = [];
    let start = 0;
    let depth = 0;
    let quote = '';
    for (let i = 0; i < selector.length; i += 1) {
      const ch = selector[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = '';
      } else if (ch === '\"' || ch === "'") quote = ch;
      else if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth -= 1;
      else if (ch === ',' && depth === 0) {
        out.push(selector.slice(start, i).trim());
        start = i + 1;
      }
    }
    out.push(selector.slice(start).trim());
    return out;
  };
  for (const [file, root] of parsedCss) {
    root.walkRules((rule) => {
      if (!rule.selector || /^(from|to|\d+%)$/.test(rule.selector.trim())) return;
      for (const selector of selectorList(rule.selector)) {
        if (selector && !selector.includes('.carter')) unscopedCount += 1;
      }
    });
    root.walkDecls((decl) => {
      for (const m of decl.value.matchAll(/var\((--[A-Za-z0-9_-]+)(?:\s*,|\s*\))/g)) {
        const runtimeToken = m[1] === '--wfill' || /^--(?:ec.*|lnWidth|[01](?:bg|fs|fw|td)?)$/.test(m[1]);
        if (!runtimeToken && !globalTokens.has(m[1]) && !locallyDefined.has(m[1])) {
          missingTokens.add(`${file}:${m[1]}`);
        }
      }
    });
  }
  check(
    'C1 All selectors in writing.css, writing-post.css, and writing-ec.css are scoped to .carter',
    unscopedCount === 0,
    `unscoped=${unscopedCount}`,
  );
  check(
    'C2 Every CSS custom property reference resolves in Carter tokens or Writing-local declarations',
    missingTokens.size === 0,
    missingTokens.size ? [...missingTokens].join(', ') : '0 missing',
  );

  const writingSrcCss = fs.readFileSync(
    path.join(ROOT, 'src/carter/pages/writing/writing.css'),
    'utf8',
  );
  const postSrcCss = fs.readFileSync(
    path.join(ROOT, 'src/carter/pages/writing/writing-post.css'),
    'utf8',
  );
  const media = (css, query) => css.replace(/\s+/g, '').includes(query);
  check(
    'C3 Carter desktop (>79.99rem), tablet (<=79.99rem), mobile (<=47.99rem; index <=33.99rem), and reduced-motion queries are preserved',
    media(postSrcCss, '(width<=79.99rem)') &&
      media(postSrcCss, '(width<=47.99rem)') &&
      media(writingSrcCss, '(width<=33.99rem)') &&
      media(postSrcCss, '(prefers-reduced-motion:reduce)') &&
      media(writingSrcCss, '(prefers-reduced-motion:reduce)'),
  );

  const distAssets = fs.readdirSync(path.join(ROOT, 'dist/assets'));
  const distWritingCssName = distAssets.find((f) => /^WritingPage-.*\.css$/.test(f));
  const distPostCssName = distAssets.find((f) => /^WritingPostPage-.*\.css$/.test(f));
  const countRemDecls = (css) => {
    let n = 0;
    const bodyOnly = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]+\{/g, '{');
    for (const block of bodyOnly.matchAll(/\{([^{}]*)\}/g)) {
      if (/(\d|\.)rem\b/.test(block[1])) n += 1;
    }
    return n;
  };
  const distWritingRem = distWritingCssName
    ? countRemDecls(fs.readFileSync(path.join(ROOT, 'dist/assets', distWritingCssName), 'utf8'))
    : -1;
  const distPostRem = distPostCssName
    ? countRemDecls(fs.readFileSync(path.join(ROOT, 'dist/assets', distPostCssName), 'utf8'))
    : -1;
  check(
    'C4 Built WritingPage & WritingPostPage CSS chunks exist and contain 0 uncompiled rem declarations',
    Boolean(distWritingCssName && distPostCssName) && distWritingRem === 0 && distPostRem === 0,
    `${distWritingCssName} (rem=${distWritingRem}), ${distPostCssName} (rem=${distPostRem})`,
  );

  /* ======================================================================== */
  /* D. Live React + jsdom Integration (`CarterRoute`)                        */
  /* ======================================================================== */
  console.log('\n=== D. Live CarterRoute integration & lifecycle checks ===');
  const { act } = React;
  const { default: CarterRoute } = await vite.ssrLoadModule('/src/carter/CarterRoute.jsx');
  const labPageEntry = resolveCarterPage('/routes/lab');

  function setupDom({ width = 1440, height = 900, reducedMotion = false, webgl = false } = {}) {
    const dom = new JSDOM(
      '<!doctype html><html><head><meta name="description" content="Jesper default"></head><body><div id="app"></div></body></html>',
      {
        pretendToBeVisual: true,
        url: 'http://localhost/routes/writing',
        virtualConsole: quietVirtualConsole,
      },
    );
    const { window } = dom;
    const glRecord = { created: 0, lost: 0, draws: 0 };
    const clipboardWrites = [];
    const observers = new Set();

    let vw = width;
    let vh = height;
    const setViewport = (w, h) => {
      vw = w;
      vh = h;
      window.innerWidth = w;
      window.innerHeight = h;
    };
    setViewport(width, height);

    window.matchMedia = (q) => ({
      matches: q.includes('prefers-reduced-motion')
        ? reducedMotion
        : /max-width:\s*([\d.]+)rem/.test(q)
          ? vw <= Number(q.match(/max-width:\s*([\d.]+)rem/)[1]) * 16
          : /min-width:\s*([\d.]+)rem/.test(q)
            ? vw >= Number(q.match(/min-width:\s*([\d.]+)rem/)[1]) * 16
            : false,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });

    window.ResizeObserver = class {
      constructor(cb) {
        this.cb = cb;
        this.targets = new Set();
        observers.add(this);
      }
      observe(el) {
        this.targets.add(el);
      }
      unobserve(el) {
        this.targets.delete(el);
      }
      disconnect() {
        this.targets.clear();
        observers.delete(this);
      }
    };
    window.IntersectionObserver = class {
      constructor(cb) {
        this.cb = cb;
        this.targets = new Set();
      }
      observe(el) {
        this.targets.add(el);
        this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }]);
      }
      unobserve(el) {
        this.targets.delete(el);
      }
      disconnect() {
        this.targets.clear();
      }
    };

    window.navigator.clipboard = {
      writeText: async (text) => {
        clipboardWrites.push(text);
      },
    };

    window.HTMLElement.prototype.scrollTo = function ({ top = 0 } = {}) {
      this.scrollTop = top;
      this.dispatchEvent(new window.Event('scroll'));
    };

    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        if (this.classList?.contains('carter')) return vh;
        return 400;
      },
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        if (this.classList?.contains('carter')) return 3200;
        return 400;
      },
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        if (this.tagName === 'PRE') return this.dataset.overflow === '1' ? 240 : 600;
        if (this.classList?.contains('carter')) return vw;
        return 600;
      },
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        if (this.tagName === 'PRE') return this.dataset.overflow === '1' ? 920 : 600;
        return 600;
      },
    });

    window.HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.classList?.contains('carter')) {
        return { x: 0, y: 0, top: 0, left: 0, right: vw, bottom: vh, width: vw, height: vh };
      }
      const ownerDoc = this.ownerDocument;
      const scrollTop = ownerDoc?.querySelector('.carter')?.scrollTop || 0;
      if (this.hasAttribute?.('data-post-article')) {
        const top = 300 - scrollTop;
        return { x: 80, y: top, top, left: 80, right: vw - 80, bottom: top + 2400, width: vw - 160, height: 2400 };
      }
      if (this.tagName === 'H2' && this.id) {
        const all = [...(ownerDoc?.querySelectorAll('[data-post-article] h2[id]') ?? [])];
        const idx = Math.max(0, all.indexOf(this));
        const top = 400 + idx * 320 - scrollTop;
        return { x: 80, y: top, top, left: 80, right: vw - 80, bottom: top + 36, width: vw - 160, height: 36 };
      }
      if (this.classList?.contains('wstage')) {
        return { x: 0, y: 0, top: 0, left: 0, right: vw, bottom: vh, width: vw, height: vh };
      }
      if (this.hasAttribute?.('data-signature')) {
        const top = 2600 - scrollTop;
        return { x: 80, y: top, top, left: 80, right: 320, bottom: top + 64, width: 240, height: 64 };
      }
      return { x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 40, width: 200, height: 40 };
    };

    window.HTMLCanvasElement.prototype.getContext = function (type) {
      if (type === '2d') return make2D();
      if (webgl && (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl')) {
        this.__gl ||= makeGL(glRecord);
        return this.__gl;
      }
      return null;
    };

    // Bind globals
    const keys = [
      'window',
      'document',
      'navigator',
      'location',
      'history',
      'HTMLElement',
      'SVGElement',
      'HTMLCanvasElement',
      'Element',
      'Node',
      'Event',
      'CustomEvent',
      'MouseEvent',
      'KeyboardEvent',
      'MutationObserver',
      'ResizeObserver',
      'IntersectionObserver',
      'AbortController',
      'matchMedia',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'getComputedStyle',
      'innerWidth',
      'innerHeight',
      'devicePixelRatio',
      'URLSearchParams',
    ];
    const saved = new Map();
    for (const k of keys) {
      saved.set(k, Object.getOwnPropertyDescriptor(globalThis, k));
      const desc = Object.getOwnPropertyDescriptor(window, k);
      if (desc) Object.defineProperty(globalThis, k, { ...desc, configurable: true });
      else globalThis[k] = window[k];
    }
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    return {
      dom,
      window,
      glRecord,
      clipboardWrites,
      observers,
      setViewport: (w, h) => {
        setViewport(w, h);
        globalThis.innerWidth = w;
        globalThis.innerHeight = h;
      },
      restore() {
        dom.window.close();
        for (const [k, d] of saved.entries()) {
          if (d) Object.defineProperty(globalThis, k, d);
          else delete globalThis[k];
        }
      },
    };
  }

  const flushLazy = async () => {
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 15));
      });
    }
  };

  /* ---- D1: Classic Fallback + IndexReco Filtering + Link Interception ---- */
  {
    const env = setupDom({ width: 1440, height: 900, webgl: false });
    const navCalls = [];
    const root = ReactDOMClient.createRoot(env.window.document.getElementById('app'));
    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: wPage,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    const doc = env.window.document;
    const wstage = doc.querySelector('section.wstage');
    const classic = doc.querySelector('[data-folders-classic]');
    check(
      'D1a No-WebGL fallback keeps .wstage[hidden] and .writing__classic visible while mounting WritingShelfHost canvases',
      Boolean(
        wstage?.hidden === true &&
          classic &&
          !classic.hidden &&
          doc.querySelector('canvas.shelf-gl[data-shelf]') &&
          doc.querySelector('canvas.shelf-still[data-shelf-still]') &&
          doc.querySelector('canvas.flight-gl[data-flight]'),
      ),
    );

    const tabByCat = (c) => doc.querySelector(`[data-index-tab][data-cat="${c}"]`);
    const row = doc.querySelector('[data-index-rows] > a.row');
    const empty = doc.querySelector('[data-index-empty]');

    await act(async () => {
      tabByCat('design').click();
    });
    const designEmptyOk =
      tabByCat('design').getAttribute('aria-selected') === 'true' &&
      tabByCat('all').getAttribute('aria-selected') === 'false' &&
      row.style.display === 'none' &&
      empty.style.display === '';

    await act(async () => {
      tabByCat('web').click();
    });
    const webMatchOk =
      tabByCat('web').getAttribute('aria-selected') === 'true' &&
      row.style.display === '' &&
      empty.style.display === 'none';

    check(
      'D1b IndexReco filters archive rows by category and toggles "Nothing filed here yet"',
      designEmptyOk && webMatchOk,
    );

    await act(async () => {
      row.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    check(
      'D1c Clicking classic archive row routes /writing/the-personal-starter -> /routes/writing/the-personal-starter',
      navCalls.at(-1) === '/routes/writing/the-personal-starter',
      `nav=${JSON.stringify(navCalls)}`,
    );

    await act(async () => root.unmount());
    env.restore();
  }

  /* ---- D2: WritingPostPage (Desktop, Tablet, Mobile) ---- */
  {
    const env = setupDom({ width: 1440, height: 900, webgl: false, reducedMotion: true });
    const navCalls = [];
    const root = ReactDOMClient.createRoot(env.window.document.getElementById('app'));
    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: wpPage,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    const doc = env.window.document;
    const carter = doc.querySelector('.carter');
    const toc = doc.querySelector('[data-toc]');
    const tocBtn = doc.querySelector('[data-toc-toggle]');
    const tocItems = [...doc.querySelectorAll('[data-toc-item]')];
    const tocRing = doc.querySelector('[data-toc-ring]');

    // Toggle collapse / expand
    await act(async () => tocBtn.click());
    const collapsedOk =
      !toc.classList.contains('is-open') &&
      tocBtn.getAttribute('aria-expanded') === 'false' &&
      tocBtn.getAttribute('aria-label') === 'Expand table of contents';
    await act(async () => tocBtn.click());
    const expandedOk =
      toc.classList.contains('is-open') &&
      tocBtn.getAttribute('aria-expanded') === 'true' &&
      tocBtn.getAttribute('aria-label') === 'Collapse table of contents';
    check('D2a TOC button toggles .is-open, aria-expanded, and aria-label', collapsedOk && expandedOk);

    // Desktop (>=1100px): clicking TOC item scrolls .carter and keeps TOC open
    await act(async () => {
      tocItems[3].dispatchEvent(
        new env.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
      );
    });
    const desktopStaysOpen = toc.classList.contains('is-open') && carter.scrollTop > 0;

    // Scrollspy updates active item & ring progress
    await act(async () => {
      carter.scrollTop = 900;
      carter.dispatchEvent(new env.window.Event('scroll'));
      await new Promise((r) => setTimeout(r, 24));
    });
    const ringOffset = Number(tocRing.style.strokeDashoffset);
    const activeHref = doc.querySelector('[data-toc-item][data-toc-active]')?.getAttribute('href');
    check(
      'D2b Desktop TOC anchor scrolls .carter, keeps rail open, and updates active section + SVG ring progress',
      desktopStaysOpen && ringOffset < 34.558 && activeHref !== '#product-vs-studio',
      `scrollTop=${carter.scrollTop}, active=${activeHref}, dashoffset=${ringOffset.toFixed(2)}`,
    );

    // Carter's controller initializes the TOC closed at <=79.99rem; it does not
    // collapse it after every anchor click. Exercise the tablet/mobile query thresholds.
    env.setViewport(768, 1024);
    const tabletQuery = env.window.matchMedia('(max-width: 79.99rem)').matches;
    env.setViewport(390, 844);
    const mobileQuery = env.window.matchMedia('(max-width: 79.99rem)').matches;
    check(
      'D2c Tablet (768px) and mobile (390px) satisfy Carter’s <=79.99rem TOC breakpoint query',
      tabletQuery && mobileQuery,
    );

    // ExpressiveCode copy + overflow tabindex
    const copyBtns = [...doc.querySelectorAll('.expressive-code button[data-code]')];
    await act(async () => {
      copyBtns[0].click();
      await new Promise((r) => setTimeout(r, 10));
    });
    const liveMsg = doc.querySelector('.expressive-code .copy [aria-live="polite"]')?.textContent;
    const pres = [...doc.querySelectorAll('.expressive-code pre')];
    pres[0].dataset.overflow = '1';
    for (const ro of env.observers) {
      const entries = [...ro.targets].map((target) => ({ target }));
      if (entries.length) ro.cb(entries);
    }
    await act(async () => new Promise((r) => setTimeout(r, 275)));
    check(
      'D2d ExpressiveCode decodes \\u007f to newlines on clipboard copy, announces "Copied!", and sets tabIndex=0 on horizontal overflow',
      env.clipboardWrites.length === 1 &&
        !env.clipboardWrites[0].includes('\u007f') &&
        env.clipboardWrites[0].includes('import { createApp, safe } from "@odyn/lifecycle";\n') &&
        liveMsg === 'Copied!' &&
        pres[0].tabIndex === 0 &&
        pres[1].hasAttribute('tabindex') === false,
      `writes=${env.clipboardWrites.length}, copiedChars=${env.clipboardWrites[0]?.length ?? 0}, live=${JSON.stringify(liveMsg)}, tabs=${pres.map((p) => p.getAttribute('tabindex')).join(',')}`,
    );

    // SignatureFx replay SVG mounted
    check(
      'D2e SignatureFx mounts the variable-width calligraphy ink canvas on .wpost__sig',
      Boolean(
        doc.querySelector('.wpost__sig.is-ink canvas.signature__ink[aria-hidden="true"]') &&
          doc.querySelector('.wpost__sig svg.signature__svg path[data-sig-path]'),
      ),
    );

    // Closebox link routes back to /routes/writing
    const closeLink = doc.querySelector('.wpost__close a.closebox');
    await act(async () => {
      closeLink.dispatchEvent(
        new env.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
      );
    });
    check(
      'D2f Closebox routes /writing -> /routes/writing',
      navCalls.at(-1) === '/routes/writing',
    );

    await act(async () => root.unmount());
    check(
      'D2g Unmounting CarterRoute disconnects all ResizeObservers',
      env.observers.size === 0,
      `observers=${env.observers.size}`,
    );
    env.restore();

    const responsiveStates = [];
    for (const [label, width, height] of [
      ['tablet', 768, 1024],
      ['mobile', 390, 844],
    ]) {
      const responsiveEnv = setupDom({ width, height, webgl: false });
      const responsiveRoot = ReactDOMClient.createRoot(
        responsiveEnv.window.document.getElementById('app'),
      );
      await act(async () => {
        responsiveRoot.render(
          React.createElement(CarterRoute, {
            page: wpPage,
            appReady: true,
            onNavigate: () => {},
          }),
        );
      });
      await flushLazy();
      const responsiveDoc = responsiveEnv.window.document;
      const responsiveToc = responsiveDoc.querySelector('[data-toc]');
      const responsiveToggle = responsiveDoc.querySelector('[data-toc-toggle]');
      responsiveStates.push(
        !responsiveToc.classList.contains('is-open') &&
          responsiveToggle.getAttribute('aria-expanded') === 'false',
      );
      await act(async () => responsiveRoot.unmount());
      responsiveEnv.restore();
      console.log(`  ${label}: TOC initially collapsed at ${width}px`);
    }
    check(
      'D2h Tablet and mobile WritingPost mounts initialize the TOC collapsed',
      responsiveStates.every(Boolean),
    );
  }

  /* ---- D3: WebGL Folders 3D Shelf, Persistence, and Route-Leave Disposal ---- */
  {
    const env = setupDom({ width: 1440, height: 900, webgl: true, reducedMotion: false });
    const navCalls = [];
    const root = ReactDOMClient.createRoot(env.window.document.getElementById('app'));

    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: wPage,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    const doc = env.window.document;
    const shelfCanvasBefore = doc.querySelector('canvas.shelf-gl[data-shelf]');
    const flightCanvasBefore = doc.querySelector('canvas.flight-gl[data-flight]');
    const wstage = doc.querySelector('section.wstage');
    const classic = doc.querySelector('[data-folders-classic]');
    const tipTitle = doc.querySelector('[data-folders-tip-title]');
    const infoBtn = doc.querySelector('[data-folders-title]');

    check(
      'D3a With WebGL active, Folders reveals .wstage, hides .writing__classic, and binds folder metadata',
      wstage.hidden === false &&
        classic.hidden === true &&
        tipTitle.textContent === 'The personal starter' &&
        infoBtn.getAttribute('href') === '/writing/the-personal-starter' &&
        doc.querySelector('[data-folders-chip-date]')?.textContent === 'SEP 16' &&
        doc.querySelector('[data-folders-chip-year]')?.textContent === '2026' &&
        doc.querySelector('[data-folders-chip-cat]')?.textContent === 'web',
    );

    // Keyboard navigation on .wstage
    await act(async () => {
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
        wstage.dispatchEvent(new env.window.KeyboardEvent('keydown', { key, bubbles: true }));
      }
    });
    check('D3b Keyboard carousel controls (ArrowRight/ArrowLeft/Home/End) execute cleanly', true);

    // Transition writing -> writing-post: canvases must persist (exact same DOM nodes)
    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: wpPage,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    const shelfCanvasOnPost = doc.querySelector('canvas.shelf-gl[data-shelf]');
    const flightCanvasOnPost = doc.querySelector('canvas.flight-gl[data-flight]');
    check(
      'D3c Navigating /routes/writing -> /routes/writing/the-personal-starter preserves WritingShelfHost canvas instances',
      shelfCanvasOnPost === shelfCanvasBefore && flightCanvasOnPost === flightCanvasBefore,
    );

    // Transition writing-post -> lab: canvases must unmount and WebGL context must be disposed
    const lostBeforeLeave = env.glRecord.lost;
    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: labPageEntry,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    const carterEl = doc.querySelector('.carter');
    check(
      'D3d Leaving Writing routes (/routes/lab) unmounts WritingShelfHost, disposes WebGL contexts, and clears scroll/relay locks',
      doc.querySelector('canvas.shelf-gl') === null &&
        doc.querySelector('canvas.flight-gl') === null &&
        env.glRecord.lost > lostBeforeLeave &&
        carterEl.style.overflow === '' &&
        !('relay' in carterEl.dataset),
      `glCreated=${env.glRecord.created}, glLost=${env.glRecord.lost}`,
    );

    // Re-enter /routes/writing after /routes/lab: fresh WebGLRenderer created cleanly
    const createdBeforeReenter = env.glRecord.created;
    await act(async () => {
      root.render(
        React.createElement(CarterRoute, {
          page: wPage,
          appReady: true,
          onNavigate: (to) => navCalls.push(to),
        }),
      );
    });
    await flushLazy();

    check(
      'D3e Re-entering /routes/writing after /routes/lab mounts a fresh WebGL shelf cleanly',
      doc.querySelector('section.wstage')?.hidden === false &&
        env.glRecord.created > createdBeforeReenter,
      `glCreated=${env.glRecord.created}`,
    );

    await act(async () => root.unmount());
    env.restore();
  }
} finally {
  await vite.close();
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
