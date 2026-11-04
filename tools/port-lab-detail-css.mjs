#!/usr/bin/env node
/**
 * Regenerates src/carter/pages/lab/lab-detail.css and lab-detail-ec.css from
 * Carter's read-only sources. Phase 4B, same scoping rules as Phase 4A's
 * lab.css and Phase 2's shared styles:
 *
 *   - every lab-detail.css selector is prefixed with `:where(.carter)`,
 *   - the Record-only chrome (`html[data-bare*]`, a stage-nesting change the
 *     labd board never applies to this port) is dropped, with `:where(.carter)`
 *   - the Expressive Code stylesheet keeps its class selectors but has its two
 *     theme roots (:root / [data-theme]) rebased onto the Carter scope, which
 *     also fixes its light/dark pairing.
 *
 * Usage: node tools/port-lab-detail-css.mjs <carter-checkout>
 */
import fs from 'node:fs';
import path from 'node:path';

const ref = process.argv[2];
if (!ref) {
  console.error('usage: port-lab-detail-css.mjs <carter-checkout>');
  process.exit(1);
}
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src/carter/pages/lab');

const comment = `/*
 * Carter Lab detail (document) styles from app/styles/lab-detail.css at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249.
 * Astro scope attributes, declaration order and the source's late overrides are
 * preserved; every selector is scoped to the .carter integration (the same rule
 * Phase 4A used). The RefRow block at the end of the file belongs to the Notes
 * refs list and is kept verbatim.
 *
 * Not ported (see README.md): Carter's html[data-bare*] rules, which belong to
 * /record's bare iframe staging and cannot match inside .carter.
 */\n`;

const source = fs.readFileSync(path.join(ref, 'app/styles/lab-detail.css'), 'utf8');

/** Drop Carter's /record bare-mode rules: they only ever target html[data-bare*]. */
const withoutBare = source.replace(/html\[data-bare[^{]*\{[^}]*\}\n?/g, '');

// At-rules whose bodies are declaration blocks (never nested rules).
const DECLARATION_AT_RULES = ['@keyframes', '@font-face'];

/** Prefix one selector list, leaving at-rules and html-scoped special cases alone. */
const scopeSelector = (selectorList) =>
  selectorList
    .split(',')
    .map((selector) => {
      const clean = selector.trim();
      if (!clean) return clean;
      if (clean.startsWith(':where(.carter)')) return clean;
      return `:where(.carter) ${clean}`;
    })
    .join(',');

/** Walk top-level and nested blocks, prefixing style rules only. */
function scopeCss(css) {
  let result = '';
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open < 0) {
      result += css.slice(index);
      break;
    }
    const prelude = css.slice(index, open);
    // Find the matching brace for this block.
    let depth = 0;
    let close = -1;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) throw new Error('Unbalanced braces');
    const body = css.slice(open + 1, close);
    // Comments between rules belong to the rule that follows them, so keep them
    // outside the scoped selector.
    const leading = prelude.match(/^(\s*(?:\/\*[\s\S]*?\*\/\s*)*)/)[1];
    const selector = prelude.slice(leading.length).trim();
    const isAtRule = selector.startsWith('@');

    if (DECLARATION_AT_RULES.some((keyword) => selector.startsWith(keyword))) {
      // @keyframes / @font-face bodies are declaration blocks, not rules.
      result += `${leading}${selector}{${body}}`;
    } else if (isAtRule) {
      const nested = body.includes('{');
      result += `${leading}${selector}{${nested ? scopeCss(body) : body}}`;
    } else {
      result += `${leading}${scopeSelector(selector)}{${body}}`;
    }
    index = close + 1;
  }
  return result;
}

const scoped = scopeCss(withoutBare)
  // Keep the source's own comment blocks readable.
  .replace(/\}\s*(\.|@)/g, '}\n\n$1');
fs.writeFileSync(path.join(out, 'lab-detail.css'), `${comment}${scoped}\n`);

/* ------------------------------------------------------------------ ec ---- */

const ecComment = `/*
 * Expressive Code runtime stylesheet (app/public/_astro/ec.2v5bd.css), restored
 * to the Lab Notes pane only. Carter's lab-detail.css styles the code frame but
 * the base line/scroll/syntax plumbing lives in this separate stylesheet, which
 * the original pages linked from inside the first code block of each pane.
 *
 * Two edits only: the theme roots (:root and [data-theme="dark"|"light"]) are
 * rebased onto the Carter scope so its variables cannot leak into Jesper's
 * document, and the bare *-selector reset stays inside .expressive-code as in
 * the source. Class selectors are unchanged, so Carter's own overrides in
 * lab-detail.css still win where they did.
 */\n`;

const ecSource = fs.readFileSync(path.join(ref, 'app/public/_astro/ec.2v5bd.css'), 'utf8');
const ecScoped = ecSource
  // `:root,:root:not([data-theme="light"]) .expressive-code[data-theme="light"]`
  .replace(/:root:not\(\[data-theme="light"\]\)/g, '.carter[data-theme]:not([data-theme="light"])')
  .replace(/:root\[data-theme="dark"\]/g, '.carter[data-theme="dark"]')
  .replace(/:root/g, '.carter');
fs.writeFileSync(path.join(out, 'lab-detail-ec.css'), `${ecComment}${ecScoped}\n`);

console.log('lab-detail.css', scoped.length, 'lab-detail-ec.css', ecScoped.length);
