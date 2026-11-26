// イメージキャラ「サビ猫」の SVG を生成する（React・アイコン生成スクリプトの両方から使う）。
// モデルの猫の特徴:
//  - 額の中央に黒い縦筋、向かって右の額〜眉間〜鼻すじにオレンジの流れ
//  - 鼻は黒。口元は向かって右が黒・左がキャラメル色
//  - 緑がかった黄色の大きな目、大きく立った耳（内側は暗い）
//  - 体はオレンジと黒の細かいまだら（ブリンドル）、胸に薄い縞
// 乱数はシード固定なので、毎回同じ模様になる。
// ※ このファイルは import を持たないこと（scripts/gen-cat-icons.mjs が Node で直接読む）

type Pt = [number, number];

const DARK = ["#1c130d", "#281a12", "#36251a"];
const BROWN = ["#4a3122", "#5b3c28", "#6a4630"];
const ORANGE = ["#b8702f", "#c9813c", "#d8924a", "#e3a35e"];
const CREAM = ["#d6a167", "#e4b87f", "#c9925a"];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inPoly([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inEllipse([x, y]: Pt, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

const pick = (arr: string[], r: number) => arr[Math.floor(r * arr.length) % arr.length];
const f = (n: number) => Math.round(n * 10) / 10;

/** 色ごとに 1 本の path にまとめた毛並みストローク */
function fur(opts: {
  seed: number;
  count: number;
  box: [number, number, number, number];
  inside: (p: Pt) => boolean;
  color: (p: Pt, r: number) => string;
  dir: (p: Pt) => number;
  len: [number, number];
  width: number;
}): string {
  const r = rng(opts.seed);
  const [x0, y0, x1, y1] = opts.box;
  const groups = new Map<string, string[]>();
  let made = 0;
  let guard = 0;
  while (made < opts.count && guard++ < opts.count * 20) {
    const p: Pt = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (!opts.inside(p)) continue;
    const c = opts.color(p, r());
    const a = opts.dir(p) + (r() - 0.5) * 0.7;
    const l = opts.len[0] + r() * (opts.len[1] - opts.len[0]);
    const seg = `M${f(p[0])} ${f(p[1])}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}`;
    const list = groups.get(c) ?? [];
    list.push(seg);
    groups.set(c, list);
    made++;
  }
  return [...groups.entries()]
    .map(
      ([c, segs]) =>
        `<path d="${segs.join("")}" stroke="${c}" stroke-width="${opts.width}" stroke-linecap="round" fill="none"/>`,
    )
    .join("");
}

// ---------------------------------------------------------------------
// 頭（viewBox 0 0 200 200 の座標系）
// ---------------------------------------------------------------------

const HEAD_PATH =
  "M100,174 C68,174 38,162 31,133 C25,108 37,82 58,70 C76,59 124,59 142,70 C163,82 175,108 169,133 C162,162 132,174 100,174Z";
const EAR_L = "M42,100 L47,24 Q50,15 58,19 L99,64 Z";
const EAR_R = "M158,100 L153,24 Q150,15 142,19 L101,64 Z";

const BLAZE: Pt[] = [
  [102, 60], [121, 61], [139, 71], [135, 86], [119, 99], [111, 111], [107, 134], [101, 134], [101, 92],
];
const STRIPE: Pt[] = [[91, 58], [103, 58], [102, 98], [99, 108], [95, 90]];
const NOSE_LEFT: Pt[] = [[92, 106], [101, 106], [101, 136], [90, 136]];

function headColor(p: Pt, r: number): string {
  if (inPoly(p, STRIPE) || inPoly(p, NOSE_LEFT) || inEllipse(p, 117, 149, 19, 14) || inEllipse(p, 108, 164, 17, 9)) {
    return r < 0.85 ? pick(DARK, r / 0.85) : pick(BROWN, (r - 0.85) / 0.15);
  }
  if (inPoly(p, BLAZE)) return r < 0.78 ? pick(ORANGE, r / 0.78) : r < 0.92 ? pick(BROWN, r) : pick(DARK, r);
  if (inEllipse(p, 86, 149, 15, 11)) return r < 0.7 ? pick(CREAM, r / 0.7) : pick(ORANGE, r);
  if (inEllipse(p, 62, 128, 28, 24) || inEllipse(p, 70, 88, 26, 17)) {
    return r < 0.55 ? pick(ORANGE, r / 0.55) : r < 0.8 ? pick(BROWN, r) : pick(DARK, r);
  }
  if (inEllipse(p, 140, 128, 28, 24)) return r < 0.6 ? pick(DARK, r / 0.6) : r < 0.82 ? pick(BROWN, r) : pick(ORANGE, r);
  return r < 0.45 ? pick(DARK, r / 0.45) : r < 0.75 ? pick(BROWN, r) : pick(ORANGE, r);
}

function eye(cx: number, cy: number, id: string): string {
  return `<g class="cat-eye">
<ellipse cx="${cx}" cy="${cy}" rx="15.5" ry="14.5" fill="url(#${id}-iris)" stroke="#140d09" stroke-width="2.4"/>
<g class="cat-pupils"><ellipse cx="${cx}" cy="${cy + 0.5}" rx="7.2" ry="10.5" fill="#120c08"/>
<circle cx="${cx - 4.5}" cy="${cy - 5.5}" r="3.4" fill="#fff" opacity=".9"/><circle cx="${cx + 4}" cy="${cy + 5}" r="1.4" fill="#fff" opacity=".6"/></g>
</g>`;
}

/** 頭部の SVG 要素（<svg> の中身）。id は 1 ページに複数置くとき重複しないように変える */
export function catHeadInner(id = "cat"): string {
  const earFur = (seed: number, path: Pt[], orangeBias: number) =>
    fur({
      seed,
      count: 110,
      box: [40, 14, 160, 100],
      inside: (p) => inPoly(p, path),
      color: (_p, r) => (r < orangeBias ? pick(ORANGE, r / orangeBias) : r < 0.85 ? pick(DARK, r) : pick(BROWN, r)),
      dir: () => -Math.PI / 2,
      len: [2.5, 4.5],
      width: 1.6,
    });
  const earL: Pt[] = [[42, 100], [47, 24], [58, 19], [99, 64]];
  const earR: Pt[] = [[158, 100], [153, 24], [142, 19], [101, 64]];

  return `<defs>
<radialGradient id="${id}-iris" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#d4d29a"/><stop offset=".55" stop-color="#a3a96b"/><stop offset="1" stop-color="#626d3f"/></radialGradient>
<linearGradient id="${id}-inear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2520"/><stop offset="1" stop-color="#8d5d52"/></linearGradient>
<clipPath id="${id}-head"><path d="${HEAD_PATH}"/></clipPath>
<clipPath id="${id}-earl"><path d="${EAR_L}"/></clipPath>
<clipPath id="${id}-earr"><path d="${EAR_R}"/></clipPath>
</defs>
<g class="cat-ear-l"><path d="${EAR_L}" fill="#2e1f16"/><g clip-path="url(#${id}-earl)">${earFur(11, earL, 0.35)}</g>
<path d="M52,88 L54,36 L88,68 Z" fill="url(#${id}-inear)"/>
<path d="M58,70 l-6,-10 M62,74 l-4,-12 M57,79 l-8,-8" stroke="#d9c3ad" stroke-width="1" opacity=".6"/></g>
<g class="cat-ear-r"><path d="${EAR_R}" fill="#261a12"/><g clip-path="url(#${id}-earr)">${earFur(12, earR, 0.15)}</g>
<path d="M148,88 L146,36 L112,68 Z" fill="url(#${id}-inear)"/>
<path d="M142,70 l6,-10 M138,74 l4,-12 M143,79 l8,-8" stroke="#d9c3ad" stroke-width="1" opacity=".6"/></g>
<path d="${HEAD_PATH}" fill="#4a3122"/>
<g clip-path="url(#${id}-head)">
<ellipse cx="62" cy="128" rx="28" ry="24" fill="#a8652f"/>
<ellipse cx="70" cy="88" rx="26" ry="17" fill="#8f5a30"/>
<ellipse cx="140" cy="128" rx="28" ry="24" fill="#2f2018"/>
<path d="M102,60 C118,59 134,64 140,72 C136,88 124,98 116,104 C111,114 108,124 107,134 L101,134 C100,118 100,100 101,80 Z" fill="#c27a38"/>
<path d="M91,58 L103,58 C102,75 101,90 99,106 C96,90 94,75 91,58Z" fill="#20160f"/>
<path d="M92,106 L101,106 L101,136 L90,136Z" fill="#2a1c14"/>
<ellipse cx="86" cy="150" rx="16" ry="12" fill="#c99460"/>
<ellipse cx="117" cy="149" rx="19" ry="14" fill="#1c130d"/>
<ellipse cx="108" cy="165" rx="18" ry="9" fill="#21160f"/>
${fur({
  seed: 7,
  count: 950,
  box: [28, 56, 172, 176],
  inside: (p) => inEllipse(p, 100, 117, 72, 60),
  color: headColor,
  dir: ([x, y]) => Math.atan2(y - 142, x - 101),
  len: [2.5, 5],
  width: 1.6,
})}
</g>
${eye(74, 111, id)}${eye(127, 111, id)}
<path d="M95,135 Q102,131.5 109,135 Q106,142 102,144 Q98,142 95,135Z" fill="#150e0a"/>
<path d="M102,144 L102,149 M102,149 Q96,154 90,151 M102,149 Q108,154 114,151" stroke="#0f0906" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<g stroke="#efe4d4" stroke-width=".9" opacity=".75" fill="none" stroke-linecap="round">
<path d="M82,147 Q60,142 38,145"/><path d="M82,151 Q60,152 40,158"/><path d="M84,155 Q66,160 48,170"/>
<path d="M121,147 Q143,142 164,145"/><path d="M121,151 Q143,152 162,158"/><path d="M119,155 Q137,160 154,170"/>
</g>`;
}

// ---------------------------------------------------------------------
// 座った全身（viewBox 0 0 240 300）
// ---------------------------------------------------------------------

const BODY_PATH = "M64,148 C42,188 34,250 46,292 Q120,302 194,292 C206,250 198,188 176,148 Z";

function bodyColor(p: Pt, r: number): string {
  // 向かって左の脇腹はオレンジ多め、右は黒多め（写真に合わせる）
  if (inEllipse(p, 66, 238, 30, 52)) return r < 0.65 ? pick(ORANGE, r / 0.65) : r < 0.85 ? pick(BROWN, r) : pick(DARK, r);
  if (inEllipse(p, 178, 232, 28, 52)) return r < 0.6 ? pick(DARK, r / 0.6) : r < 0.85 ? pick(BROWN, r) : pick(ORANGE, r);
  if (inEllipse(p, 120, 205, 34, 38)) return r < 0.45 ? pick(ORANGE, r / 0.45) : r < 0.75 ? pick(BROWN, r) : pick(DARK, r);
  return r < 0.4 ? pick(DARK, r / 0.4) : r < 0.7 ? pick(BROWN, r) : pick(ORANGE, r);
}

export function catSittingInner(id = "cats"): string {
  const pawPts = (cx: number): ((p: Pt) => boolean) => (p) => inEllipse(p, cx, 289, 18, 11);
  return `<defs><clipPath id="${id}-body"><path d="${BODY_PATH}"/></clipPath></defs>
<g class="cat-tail"><path d="M186,284 C232,292 242,250 226,222 C220,212 214,206 210,200" stroke="#2b1d15" stroke-width="17" fill="none" stroke-linecap="round"/>
<path d="M186,284 C232,292 242,250 226,222 C220,212 214,206 210,200" stroke="#c27a38" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="4 7 9 6 3 9" opacity=".9"/>
<path d="M190,286 C228,290 236,254 224,230" stroke="#4a3122" stroke-width="3" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/></g>
<g class="cat-breath">
<path d="${BODY_PATH}" fill="#4a3122"/>
<g clip-path="url(#${id}-body)">
<ellipse cx="66" cy="238" rx="30" ry="52" fill="#a8652f"/>
<ellipse cx="178" cy="232" rx="28" ry="52" fill="#2f2018"/>
<ellipse cx="120" cy="205" rx="34" ry="38" fill="#6a4630"/>
${fur({
  seed: 21,
  count: 1500,
  box: [34, 140, 206, 300],
  inside: (p) => inPoly(p, [[64, 148], [176, 148], [204, 250], [194, 296], [46, 296], [36, 250]]),
  color: bodyColor,
  dir: ([x]) => Math.PI / 2 + (x - 120) / 160,
  len: [3, 6.5],
  width: 1.9,
})}
<g stroke="#1c130d" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round">
<path d="M94,196 Q120,204 146,196"/><path d="M92,214 Q120,222 148,214"/><path d="M96,232 Q120,239 144,232"/>
</g>
</g>
<ellipse cx="100" cy="289" rx="18" ry="11" fill="#9a5c2c"/><ellipse cx="140" cy="289" rx="18" ry="11" fill="#5b3c28"/>
${fur({ seed: 31, count: 60, box: [80, 276, 120, 302], inside: pawPts(100), color: (_p, r) => (r < 0.7 ? pick(ORANGE, r / 0.7) : pick(BROWN, r)), dir: () => Math.PI / 2, len: [2.5, 4.5], width: 2 })}
${fur({ seed: 32, count: 60, box: [120, 276, 160, 302], inside: pawPts(140), color: (_p, r) => (r < 0.55 ? pick(DARK, r / 0.55) : pick(ORANGE, r)), dir: () => Math.PI / 2, len: [2.5, 4.5], width: 2 })}
<path d="M94,293 l0,5 M100,294 l0,5 M106,293 l0,5 M134,293 l0,5 M140,294 l0,5 M146,293 l0,5" stroke="#1c130d" stroke-width="1.3" opacity=".6"/>
</g>
<g class="cat-head" transform="translate(20 -6)">${catHeadInner(id)}</g>`;
}

/** アプリアイコン用（背景つき・正方形） */
export function catIconSvg(size = 512): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">
<rect width="200" height="200" rx="44" fill="#f5e9d8"/>
<g transform="translate(14 22) scale(.86)">${catHeadInner("icon")}</g>
</svg>`;
}

/** 頭だけ（背景なし） */
export function catHeadSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${catHeadInner("head")}</svg>`;
}
