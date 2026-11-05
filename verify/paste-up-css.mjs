/**
 * Phase 5F CSS audit (scratch, not shipped).
 *
 *   CARTER_REF=/tmp/carter node verify/paste-up-css.mjs
 *
 * Extracts the inline `<style data-lab-style="paste-up">` block from Carter's
 * original engine and compares it, rule by rule and declaration by declaration,
 * with the ported `src/carter/pages/lab/paste-up.css`. The only permitted
 * difference is the `:where(.carter) ` scope prefix the integration requires.
 */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const CARTER_REF = process.env.CARTER_REF;
if (!CARTER_REF) throw new Error('CARTER_REF must point at the read-only Carter checkout');

const source = fs.readFileSync(path.join(CARTER_REF, 'app/lib/experiments/paste-up.js'), 'utf8');
const start = source.indexOf('h=`');
const end = source.indexOf('`,g=!1;', start);
const inline = source
  .slice(start + 3, end)
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"');
const ported = fs.readFileSync('src/carter/pages/lab/paste-up.css', 'utf8');

const SCOPE = ':where(.carter) ';

function flatten(css) {
  const root = postcss.parse(css);
  const rules = [];
  root.walkRules((rule) => {
    rules.push({
      selector: rule.selector.trim(),
      declarations: rule.nodes
        .filter((node) => node.type === 'decl')
        .map((decl) => `${decl.prop}:${decl.value}`),
    });
  });
  return rules;
}

const a = flatten(inline);
const b = flatten(ported);

const failures = [];
if (a.length !== b.length) failures.push(`rule count ${a.length} vs ${b.length}`);

a.forEach((rule, index) => {
  const other = b[index];
  if (!other) return;
  if (other.selector !== `${SCOPE}${rule.selector}`) {
    failures.push(`selector ${index}: "${rule.selector}" vs "${other.selector}"`);
  }
  const same =
    rule.declarations.length === other.declarations.length &&
    rule.declarations.every((decl, i) => decl === other.declarations[i]);
  if (!same) {
    failures.push(
      `declarations ${index} (${rule.selector}): ${rule.declarations.join(' | ')} vs ${other.declarations.join(' | ')}`,
    );
  }
});

// integration rules: everything scoped, nothing global, no rem left in declarations
const unscoped = b.filter((rule) => !rule.selector.split(',').every((part) => part.trim().startsWith(':where(.carter)')));
const remDecls = b.flatMap((rule) =>
  rule.declarations.filter((decl) => !decl.startsWith('--') && /(^|[^a-z-])\d*\.?\d+rem\b/.test(decl)),
);
const keyframes = /@keyframes/.test(ported);
const customProps = b.flatMap((rule) => rule.declarations.filter((d) => d.startsWith('--pu-')));

console.log(`Carter rules: ${a.length}   ported rules: ${b.length}`);
console.log(`unscoped selectors: ${unscoped.length}`);
console.log(`rem declarations in the stylesheet: ${remDecls.length}`);
console.log(`keyframes declared: ${keyframes}`);
console.log(`source-custom properties: ${customProps.length} (--pu-n / --pu-rail are set from JS)`);
if (failures.length) {
  console.log('DIFFERENCES:');
  for (const failure of failures) console.log(' -', failure);
  process.exitCode = 1;
} else {
  console.log('OK: every selector and declaration matches Carter, plus the frame scope');
}
void remDecls;
