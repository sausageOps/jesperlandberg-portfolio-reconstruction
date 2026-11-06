/*
 * Carter Writing data, recovered verbatim from the captured original pages
 * (`pages/writing.html` and `pages/writing_the-personal-starter.html`) and
 * `app/data/writing.ts` + `app/data/writing-code.ts` in
 * `sausageOps/carterogunsola-reconstruction` (read-only reference).
 *
 * `FOLDERS` is the byte-for-byte `application/json[data-folders-data]` payload
 * embedded in both `/writing` and `/writing/the-personal-starter`.
 */

export const FOLDERS = [
  {
    title: 'The personal starter',
    href: '/writing/the-personal-starter',
    date: 'SEP 16 2026',
    cat: 'web',
    num: 1,
    tone: null,
    stock: null,
    cover: 'index',
    summary:
      "Templates, kits, starters, boilerplates etc. What I'd call a personal starter, what I'd keep in one, and the one I use for my own sites.",
    tldr: 'A personal starter has an audience of one, so what goes in is whatever keeps showing up in the sites I build, and whatever my next project deletes never belonged there. I keep the engines in small packages and let every project own and drift from the rest, because the smaller a starter stays, the longer it lasts.',
    longDate: 'Sep, 16, 2026',
    excerpt:
      'If you\'re a web developer or software developer in today\'s world, you\'d be familiar with the terms templates, kits, starters, boilerplates, generators, stacks etc. From my understanding as a developer, all of this in its simplest form aims at helping developers with code they refuse to write twice and will reuse. This concept has existed from Rails generators through HTML5 Boilerplate, Yeoman, create-react-app to the Remix Stacks, the Epic Stack, create-t3-app, the shadcn registry model and the list goes on. I\'d in fact argue that your CSS libraries & frameworks, the likes of Bootstrap & Tailwind, sneak their way into this category because in a way, those CSS libraries & frameworks help you move fast with prewritten CSS styles. While I\'m also a software developer, I\'d prefer to keep this topic in the lens of a web developer. This is because I see how easy it is to mix up the product regime (SaaS-like starters) with what I\'d call, for the sake of clarity in this writing, the "studio regime", which focuses more on websites. A third piece, and it\'s the subject of this post\'s stance, is ',
  },
];

export const FOLDERS_JSON = JSON.stringify(FOLDERS).replace(/</g, '\\u003c');

export const WRITING_INDEX = {
  title: 'Writing',
  description:
    'Notes on design, development, motion, tools, creativity, and sometimes life outside of work.',
  ogImage: '/og/section/writing.jpg',
  intro: [
    'Here’s my corner of the internet where I get to think out loud, explore ideas, and share what I’m learning along the way. I write about whatever I’m curious about — design, development, motion, tools, creativity, and sometimes life outside of work too.',
    'I write to provide value, but also because teaching and documenting is one of the best ways to learn. So while you take something away from these pieces, I’m growing through them as well.',
    'The goal is simple: help you think differently, build better, and keep creating cool things on the web and beyond.',
  ],
  archiveLabel: '2026',
  filters: ['all', 'web', 'design', 'motion', 'tools', 'life'],
  empty: 'Nothing filed here yet',
};

export const POST = {
  slug: 'the-personal-starter',
  title: 'The personal starter',
  pageTitle: 'The personal starter :: Writing',
  description:
    "Templates, kits, starters, boilerplates etc. What I'd call a personal starter, what I'd keep in one, and the one I use for my own sites.",
  ogImage: '/og/writing/the-personal-starter.jpg',
  num: 'N°01',
  masthead: 'Carter Ogunsola:: Writing',
  date: 'Sep, 16, 2026',
  tldr: FOLDERS[0].tldr,
  folder: FOLDERS[0],
};

export const ROW_TAGS = {
  'the-personal-starter': { date: 'Sep 16', year: '2026' },
};

export const TOC = [
  { id: 'product-vs-studio', label: 'Product vs studio' },
  { id: 'the-personal-starter', label: 'The personal starter' },
  { id: 'what-goes-in', label: 'What goes in' },
  { id: 'shape-and-engines', label: 'Shape and engines' },
  { id: 'keeping-projects-in-sync', label: 'Keeping projects in sync' },
  { id: 'why-small', label: 'Why small' },
  { id: 'odyn-astro-starter', label: 'Odyn Astro starter' },
];

export const CREDITS = [
  {
    label: 'CarterOgunsola / odyn-astro-starter',
    href: 'https://github.com/CarterOgunsola/odyn-astro-starter',
  },
  {
    label: 'Epic Stack :: managing updates',
    href: 'https://github.com/epicweb-dev/epic-stack/blob/main/docs/managing-updates.md',
  },
  {
    label: 'Epic Stack :: decisions',
    href: 'https://github.com/epicweb-dev/epic-stack/tree/main/docs/decisions',
  },
  {
    label: 'create-t3-app :: introduction',
    href: 'https://create.t3.gg/en/introduction',
  },
  {
    label: 'antfu / starter-ts',
    href: 'https://github.com/antfu/starter-ts',
  },
  {
    label: 'antfu-collective / vitesse',
    href: 'https://github.com/antfu-collective/vitesse',
  },
];

export const CODE_BLOCKS = [
  {
    language: 'ts',
    maxLine: '57ch',
    lines: [
      {
        html: '<span style="--0:#2F5885;--1:#A6CBEE">import</span><span style="--0:#1E1E1E;--1:#F7F7F7"> { createApp, safe } </span><span style="--0:#2F5885;--1:#A6CBEE">from</span><span style="--0:#1E1E1E;--1:#F7F7F7"> </span><span style="--0:#43601F;--1:#C3D6AD">"@odyn/lifecycle"</span><span style="--0:#1E1E1E;--1:#F7F7F7">;</span>',
        indent: '2ch',
      },
      {
        html: '<span style="--0:#2F5885;--1:#A6CBEE">import</span><span style="--0:#1E1E1E;--1:#F7F7F7"> { Conductor, wipeLeg } </span><span style="--0:#2F5885;--1:#A6CBEE">from</span><span style="--0:#1E1E1E;--1:#F7F7F7"> </span><span style="--0:#43601F;--1:#C3D6AD">"@odyn/conductor"</span><span style="--0:#1E1E1E;--1:#F7F7F7">;</span>',
        indent: '2ch',
      },
      {
        html: '<span style="--0:#2F5885;--1:#A6CBEE">import</span><span style="--0:#1E1E1E;--1:#F7F7F7"> { Reveal } </span><span style="--0:#2F5885;--1:#A6CBEE">from</span><span style="--0:#1E1E1E;--1:#F7F7F7"> </span><span style="--0:#43601F;--1:#C3D6AD">"@odyn/reveal"</span><span style="--0:#1E1E1E;--1:#F7F7F7">;</span>',
        indent: '2ch',
      },
      {
        html: '<span style="--0:#2F5885;--1:#A6CBEE">import</span><span style="--0:#1E1E1E;--1:#F7F7F7"> { createEngines, mediaHold } </span><span style="--0:#2F5885;--1:#A6CBEE">from</span><span style="--0:#1E1E1E;--1:#F7F7F7"> </span><span style="--0:#43601F;--1:#C3D6AD">"@odyn/engines"</span><span style="--0:#1E1E1E;--1:#F7F7F7">;</span>',
        indent: '2ch',
      },
    ],
    code: 'import { createApp, safe } from "@odyn/lifecycle";\nimport { Conductor, wipeLeg } from "@odyn/conductor";\nimport { Reveal } from "@odyn/reveal";\nimport { createEngines, mediaHold } from "@odyn/engines";',
  },
  {
    language: 'json',
    maxLine: '31ch',
    lines: [
      {
        html: '<span style="--0:#43601F;--1:#C3D6AD">"starter"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: {</span>',
        indent: '2ch',
      },
      {
        html: '<span class="indent">  </span><span style="--0:#37607E;--1:#B0CEE6">"name"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: </span><span style="--0:#43601F;--1:#C3D6AD">"odyn-astro-starter"</span><span style="--0:#1E1E1E;--1:#F7F7F7">,</span>',
        indent: '4ch',
      },
      {
        html: '<span class="indent">  </span><span style="--0:#37607E;--1:#B0CEE6">"initialised"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: </span><span style="--0:#7A4A1C;--1:#E6C79C">false</span><span style="--0:#1E1E1E;--1:#F7F7F7">,</span>',
        indent: '4ch',
      },
      {
        html: '<span class="indent">  </span><span style="--0:#37607E;--1:#B0CEE6">"ref"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: </span><span style="--0:#43601F;--1:#C3D6AD">"v1.0.0"</span><span style="--0:#1E1E1E;--1:#F7F7F7">,</span>',
        indent: '4ch',
      },
      {
        html: '<span class="indent">  </span><span style="--0:#37607E;--1:#B0CEE6">"head"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: </span><span style="--0:#7A4A1C;--1:#E6C79C">null</span><span style="--0:#1E1E1E;--1:#F7F7F7">,</span>',
        indent: '4ch',
      },
      {
        html: '<span class="indent">  </span><span style="--0:#37607E;--1:#B0CEE6">"date"</span><span style="--0:#1E1E1E;--1:#F7F7F7">: </span><span style="--0:#43601F;--1:#C3D6AD">"2026-09-04"</span>',
        indent: '4ch',
      },
      {
        html: '<span style="--0:#1E1E1E;--1:#F7F7F7">}</span>',
        indent: '2ch',
      },
    ],
    code: '"starter": {\n  "name": "odyn-astro-starter",\n  "initialised": false,\n  "ref": "v1.0.0",\n  "head": null,\n  "date": "2026-09-04"\n}',
  },
];

export const SIGNATURE_PTS =
  '[2,88.95,15.34,85.96,28.7,83.1,42.07,80.28,55.45,77.48,68.83,74.68,82.2,71.87,95.57,69.04,108.93,66.18,122.29,63.28,135.63,60.33,148.97,57.33,162.29,54.26,175.59,51.13,188.87,47.91,202.13,44.6,215.36,41.19,228.56,37.65,241.72,33.96,254.83,30.1,267.88,26.03,280.84,21.7,293.7,17.06,306.33,11.86,317.15,4.21,304.18,2.06,290.55,3.04,276.97,4.61,263.44,6.48,249.93,8.54,236.45,10.82,223.07,13.6,209.81,16.89,196.66,20.63,183.65,24.79,170.76,29.34,158.01,34.25,145.4,39.53,132.95,45.16,120.66,51.15,108.56,57.5,96.67,64.23,85.03,71.39,73.68,79.01,62.73,87.17,52.3,96,42.68,105.7,34.49,116.61,29.53,129.25,31.36,142.5,42.07,150.53,55.43,153.21,69.08,153.41,82.7,152.29,96.22,150.31,109.64,147.74,122.97,144.73,136.22,141.37,149.38,137.7,162.47,133.77,175.49,129.61,188.44,125.25,201.32,120.68,214.13,115.91,226.86,110.94,239.5,105.74,252.02,100.26,264.36,94.39,276.26,87.68,272.83,82.88,259.36,85.14,246.17,88.7,233.27,93.22,220.74,98.67,208.87,105.41,200.71,115.65,212.28,121.6,225.85,123.04,239.47,122.11,252.79,119.1,265.53,114.19,277.32,107.31,287.38,98.11,293,105.01,286.58,116.96,276.52,126.15,264.53,132.66,251.55,136.87,238.08,139.18,224.45,139.98,233.2,136.1,246.23,131.97,259.21,127.7,272.14,123.25,285.03,118.72,297.91,114.16,310.81,109.63,323.73,105.18,336.69,100.84,349.71,96.69,362.8,92.78,375.99,89.2,371.81,92.51,359.23,97.86,346.66,103.23,334.15,108.73,321.73,114.42,309.44,120.4,297.41,126.88,285.99,134.37,280.86,145.21,293.89,148.67,307.54,148.69,321.06,146.78,334.42,143.9,347.65,140.46,360.78,136.67,373.83,132.61,386.82,128.36,399.75,123.94,412.64,119.4,425.49,114.76,438.32,110.04,451.13,105.29,464.01,100.71,453.56,106.39,441.19,112.21,428.8,117.97,416.99,124.78,418.82,134.44,432.19,137.11,445.83,138.05,459.49,138.26,473.15,138.01,486.81,137.42,500.44,136.53,514.06,135.35,527.64,133.86,541.18,131.98,554.61,129.45,567.8,125.91,580.83,121.77,593.69,117.14,606.39,112.11,618.94,106.7,631.34,100.94,643.57,94.84,655.61,88.39,667.44,81.55,679,74.25,690.16,66.38,700.67,57.65,709.57,47.33,708.94,35.11,696.27,30.27,682.69,28.94,669.03,29.21,655.42,30.44,641.88,32.31,628.43,34.69,615.04,37.46,601.73,40.56,588.5,43.96,575.33,47.63,562.24,51.54,549.21,55.68,536.26,60.05,523.4,64.65,510.62,69.49,497.93,74.58,485.36,79.93,472.91,85.57,460.62,91.55,448.54,97.93,436.72,104.79,425.3,112.3,414.53,120.7,405.11,130.57,399.44,142.82,403.96,155.2,416.18,160.85,429.79,161.75,443.41,160.65,456.89,158.42,470.23,155.46,483.44,151.95,496.53,148.03,509.51,143.77,522.39,139.2,535.17,134.35,547.85,129.24,560.41,123.87,572.86,118.23,585.17,112.29,597.29,105.97,609.13,99.15,620.43,91.48,628.38,81.03,619.94,70.52,607.32,65.61,593.7,65.56,580.37,68.48,567.62,73.36,555.56,79.78,544.36,87.6,534.42,96.96,527,108.35,526.9,121.57,537.25,130.07,550.3,134.04,563.85,135.76,577.51,135.78,591.11,134.51,604.58,132.24,617.89,129.15,631.03,125.39,644,121.07,656.78,116.24,669.38,110.94,681.77,105.17,693.89,98.86,705.41,91.54,695.82,93.15,683.38,98.8,671.11,104.82,658.94,111.04,646.85,117.42,634.83,123.92,622.86,130.5,610.91,137.14,598.98,143.81,587.07,150.51,575.18,157.24,563.3,164,552.16,170.96,564.57,165.25,576.85,159.25,589.12,153.24,601.41,147.26,613.73,141.34,626.1,135.53,638.56,129.91,651.22,124.76,664.28,120.75,677.48,117.22,690.82,114.27,704.31,112.06,717.91,110.78,731.57,110.57,745.21,111.37,758.79,112.88,772.34,114.65,785.91,116.29,799.52,117.56,813.16,118.38,826.82,118.72,840.49,118.63,854.14,118.15,867.79,117.32,881.41,116.19,895,114.8]';

export const SIGNATURE_PATH =
  'M2 88.9456C55.784 76.5215 191.196 51.7674 274.826 23.7476C334.221 3.84742 337.508 -5.77007 243.577 9.56486C149.646 24.8998 37.9703 88.5267 29.722 127.977C13.4431 205.837 316.853 80.9592 276.575 82.6084C244.834 83.9081 180.958 112.5 206.563 120.165C237.48 129.42 272.863 114.718 285.462 100.025C300.893 82.0273 301.127 140.001 222.664 140.001C220.987 140.001 225.74 138.422 243.579 132.817C282.011 120.744 333.646 99.8913 376.974 88.9455C406.796 81.4117 217.494 148 301.127 148.962C355.109 149.583 542.975 64.9965 428.679 118.029C366.194 147.021 515.241 139.258 556.329 129.041C628.401 111.119 731.609 50.6349 708.58 34.8267C662.174 2.97263 360.921 106.976 403.403 154.658C432.562 187.387 636.491 97.9544 628.26 80.5907C605.432 32.4348 486.945 110.13 538.165 130.476C618.254 162.288 790.777 42.4844 658.137 111.452C632.25 124.912 590.416 148.592 568.46 161.052C508.857 194.877 627.218 132.266 653.385 124.03C757.953 91.1157 752.806 130.719 895 114.799';
