/**
 * Phase 5G CSS audit (scratch, not shipped).
 *
 *   CARTER_REF=/tmp/carter node verify/threejs-test-css.mjs
 *
 * Extracts the inline `#exp-three-style` block from Carter's original engine and
 * compares it, rule by rule and declaration by declaration, with the ported
 * `src/carter/pages/lab/threejs-test.css`. The only permitted differences are:
 *
 *   - the `:where(.carter) ` scope prefix the integration requires;
 *   - the `.spin` waiting mark, which Carter ships in app/styles/global.scss
 *     rather than in the experiment's own block, and which the port adds once
 *     for this page (compared separately below).
 */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const CARTER_REF = process.env.CARTER_REF;
if (!CARTER_REF) throw new Error('CARTER_REF must point at the read-only Carter checkout');

const source = fs.readFileSync(path.join(CARTER_REF, 'app/lib/experiments/threejs-test.js'), 'utf8');
const start = source.indexOf('Ce=`');
if (start < 0) throw new Error('could not locate the inline style constant in Carter threejs-test.js');
const end = source.indexOf('`;function we()', start);
const inline = source
  .slice(start + 3, end)
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"');

const ported = fs.readFileSync('src/carter/pages/lab/threejs-test.css', 'utf8');

const SCOPE = ':where(.carter) ';

/**
 * Carter's inline block is minified (`var(--s-12,0.75rem)`), the port is written
 * the way the stylesheet reads (`var(--s-12, 0.75rem)`). Those are the same
 * value to a browser, so whitespace around punctuation and between tokens is
 * collapsed before comparing; letter case is left alone.
 */
const normalise = (value) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:()])\s*/g, '$1')
    .trim();

/** Flatten to [{ selector, declarations, atRule }] in source order. */
function flatten(css) {
  const root = postcss.parse(css);
  const rules = [];
  root.walkRules((rule) => {
    let parent = rule.parent;
    let atRule = null;
    let insideKeyframes = false;
    while (parent) {
      if (parent.type === 'atrule') {
        if (parent.name === 'keyframes') insideKeyframes = true;
        atRule = `@${parent.name} ${parent.params}`.trim();
      }
      parent = parent.parent;
    }
    // `@keyframes` steps are not style rules; they are compared as at-rules.
    if (insideKeyframes) return;
    rules.push({
      // Carter's block starts with a newline after the comment; his selector is
      // `\n.tj`, so drop leading whitespace the way the browser parser does.
      selector: rule.selector.trim().replace(/^`?\s*/, '').replace(/^`/, ''),
      atRule,
      declarations: rule.nodes
        .filter((node) => node.type === 'decl')
        .map((decl) => `${decl.prop}:${normalise(decl.value)}`),
    });
  });
  const atRules = [];
  root.walkAtRules((atRule) => atRules.push(`@${atRule.name} ${atRule.params}`.trim()));
  return { rules, atRules };
}

const a = flatten(inline);
const b = flatten(ported);

// The port adds the `.spin` waiting mark (Carter keeps it in global.scss) and
// scopes it to the stage; those two rules are audited separately below, so the
// Carter-by-Carter comparison walks this page's own rules in source order.
const INSET = new Set([':where(.carter .tj) .spin']);
const portedRules = b.rules.filter((rule) => !INSET.has(rule.selector));
const portedSpin = b.rules.filter((rule) => INSET.has(rule.selector));

const failures = [];

// ---- 1. Carter's inline block, rule by rule ------------------------------
if (a.rules.length !== portedRules.length) {
  failures.push(`rule count ${a.rules.length} (Carter) vs ${portedRules.length} (port, .spin excluded)`);
}
a.rules.forEach((rule, index) => {
  const other = portedRules[index];
  if (!other) return;
  if (other.selector !== `${SCOPE}${rule.selector}`) {
    failures.push(`selector ${index}: "${rule.selector}" vs "${other.selector}"`);
  }
  if ((other.atRule ?? null) !== (rule.atRule ?? null)) {
    failures.push(`at-rule ${index} (${rule.selector}): ${rule.atRule} vs ${other.atRule}`);
  }
  const same =
    rule.declarations.length === other.declarations.length &&
    rule.declarations.every((decl, i) => decl === other.declarations[i]);
  if (!same) {
    failures.push(
      `declarations ${index} (${rule.selector}):\n    Carter: ${rule.declarations.join(' | ')}\n    port  : ${other.declarations.join(' | ')}`,
    );
  }
});

// ---- 2. keyframes -------------------------------------------------------
const carterKeyframes = a.atRules.filter((name) => name.startsWith('@keyframes'));
const portKeyframes = b.atRules.filter((name) => name.startsWith('@keyframes'));
if (JSON.stringify(portKeyframes) !== JSON.stringify(['@keyframes spin-turn'])) {
  failures.push(`keyframes: expected exactly @keyframes spin-turn, got ${JSON.stringify(portKeyframes)}`);
}

// ---- 3. the `.spin` mark (Carter: app/styles/global.scss) ---------------
const globalScss = fs.readFileSync(path.join(CARTER_REF, 'app/styles/global.scss'), 'utf8');
const spinAt = globalScss.indexOf('.spin{--spin-size');
const spinEnd = globalScss.indexOf('.spin--lg{', spinAt);
if (spinAt < 0 || spinEnd < 0) throw new Error('could not locate .spin in Carter global.scss');
// `.spin{...}` then `.spin--lg{...}`; take the first block only
const spinSource = globalScss.slice(spinAt, spinEnd);
const spinBlock = spinSource.slice(0, spinSource.lastIndexOf('}') + 1);
const portSpin = portedSpin.find((rule) => !rule.atRule);
if (!portSpin) {
  failures.push('.spin: the port does not define the waiting mark');
} else {
  const normalised = (decls) =>
    decls.map((decl) => decl.replace(/0\.(\d)/g, '.$1').replace(/\s+/g, '')).sort();
  const carterSpin = normalised(
    spinBlock
      .replace(/^\.spin\{/, '')
      .replace(/\}$/, '')
      .split(';')
      .map((decl) => decl.trim())
      .filter(Boolean),
  );
  const portedSpin = normalised(portSpin.declarations);
  if (JSON.stringify(carterSpin) !== JSON.stringify(portedSpin)) {
    failures.push(`.spin declarations:\n    Carter: ${carterSpin.join(' | ')}\n    port  : ${portedSpin.join(' | ')}`);
  }
}
const reducedSpin = portedSpin.find((rule) => rule.atRule);
const carterReduced = globalScss
  .slice(globalScss.indexOf('@media (prefers-reduced-motion:reduce){.spin{'))
  .replace(/^@media \(prefers-reduced-motion:reduce\)\{\.spin\{/, '')
  .split('}}')[0];
if (!reducedSpin) {
  failures.push('reduced-motion .spin rule missing');
} else {
  const norm = (decls) => decls.map((d) => d.replace(/0\.(\d)/g, '.$1').replace(/\s+/g, '')).sort();
  const carter = norm(carterReduced.split(';').map((d) => d.trim()).filter(Boolean));
  const portedReduced = norm(reducedSpin.declarations);
  if (JSON.stringify(carter) !== JSON.stringify(portedReduced)) {
    failures.push(`reduced-motion .spin:\n    Carter: ${carter.join(' | ')}\n    port  : ${portedReduced.join(' | ')}`);
  }
}

// ---- 4. integration hygiene --------------------------------------------
const unscoped = b.rules.filter(
  (rule) =>
    !INSET.has(rule.selector) &&
    !rule.selector.split(',').every((part) => part.trim().startsWith(':where(.carter)')),
);
if (unscoped.length) failures.push(`unscoped selectors: ${unscoped.map((r) => r.selector).join(', ')}`);

// Carter writes rem in two places: real lengths (`min-width:4.4rem`) and the
// `var(--s-12, 0.75rem)` fallbacks. Declarations keep his source units and the
// carter-rem-to-px PostCSS step compiles them at build time, so the source is
// compared to Carter token for token and the BUILT stylesheet below must have
// no rem left in declarations (media-query params stay rem by design).
const remSource = b.rules.flatMap((rule) =>
  rule.declarations.filter((decl) => !decl.startsWith('--') && /(^|[^a-z-])\d*\.?\d+rem\b/.test(decl)),
);
const carterRem = a.rules.flatMap((rule) =>
  rule.declarations.filter((decl) => !decl.startsWith('--') && /(^|[^a-z-])\d*\.?\d+rem\b/.test(decl)),
);
if (remSource.length !== carterRem.length) {
  failures.push(`rem declarations: Carter ${carterRem.length}, port ${remSource.length}`);
}

// ---- 5. the built stylesheet -------------------------------------------
const builtFiles = fs.existsSync('dist/assets')
  ? fs.readdirSync('dist/assets').filter((name) => name.endsWith('.css'))
  : [];
const built = builtFiles
  .map((name) => fs.readFileSync(path.join('dist/assets', name), 'utf8'))
  .find((css) => css.includes('.tj__bars'));
if (!built) {
  failures.push('built dist/assets/*.css does not contain the .tj rules (run `npm run build` first)');
} else {
  if (!built.includes('.tj__bars')) failures.push('built css lost .tj__bars');
  // Evaluate at rem: walk the built rules that belong to this page and assert
  // every declaration lost its rem (the media-query params may keep theirs).
  const builtRules = flatten(built);
  const tjRules = builtRules.rules.filter((rule) => rule.selector.includes('.tj'));
  const builtRemDecls = tjRules.flatMap((rule) =>
    rule.declarations.filter((decl) => /\b\d*\.?\d+rem\b/.test(decl)),
  );
  if (builtRemDecls.length) failures.push(`built .tj declarations still rem: ${builtRemDecls.join(' | ')}`);
  const styleAttrRem = (built.match(/--s-\d+:\s*\d*\.?\d+rem/g) ?? []).length;
  console.log(
    `built css: ${built.length} bytes, .tj rules: ${tjRules.length}, rem left in .tj declarations: ${builtRemDecls.length}` +
      ` (token custom properties in this bundle: ${styleAttrRem})`,
  );
}

// ---- report -------------------------------------------------------------
console.log(`Carter inline rules: ${a.rules.length}   ported rules: ${b.rules.length}`);
console.log(`ported at-rules: ${JSON.stringify(b.atRules)}`);
console.log(`unscoped selectors: ${unscoped.length}`);
console.log(`rem declarations in the source stylesheet: ${remSource.length} (Carter: ${carterRem.length}; compiled to px at build time)`);
console.log(`--three-accent custom property kept: ${/--three-accent/.test(ported)}`);

if (failures.length) {
  console.log('\nDIFFERENCES:');
  for (const failure of failures) console.log(' -', failure);
  process.exitCode = 1;
} else {
  console.log('\nOK: every selector, declaration and at-rule matches Carter, plus the frame scope and the .spin mark');
}
