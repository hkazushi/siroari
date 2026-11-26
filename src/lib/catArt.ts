// イメージキャラ「サビ猫」の SVG を生成する（React・アイコン生成スクリプトの両方から使う）。
// モデルの猫の特徴:
//  - 額の中央に黒い縦筋、向かって右の額〜眉間〜鼻すじにオレンジの流れ
//  - 鼻は黒。口元は向かって右が黒・左がキャラメル色
//  - 緑がかった黄色の大きな目、大きく立った耳（内側は暗い）
//  - 体はオレンジと黒の細かいまだら（ブリンドル）、胸に薄い縞
// 乱数はシード固定なので、毎回同じ模様になる。
// ※ このファイルは import を持たないこと（scripts/gen-cat-icons.mjs が Node で直接読む）

type Pt = [number, number];

const DARK = ["#211812", "#2d221a", "#3b2e24"];
const BROWN = ["#5c4636", "#6c5442", "#7b604a"];
const ORANGE = ["#a8693a", "#b07343", "#c0824c", "#cf9358"];
const CREAM = ["#cfa77a", "#dcb88c", "#e4c59c"];

/** [オレンジ, 茶, 黒, クリーム] の割合 */
type Mix = [number, number, number, number];

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

/** 割合に従って色を選ぶ */
function sample(m: Mix, r: number, r2: number): string {
  const total = m[0] + m[1] + m[2] + m[3];
  let t = r * total;
  const fams = [ORANGE, BROWN, DARK, CREAM];
  for (let i = 0; i < 4; i++) {
    if (t < m[i]) return pick(fams[i], r2);
    t -= m[i];
  }
  return pick(BROWN, r2);
}

/** 色ごとに 1 本の path にまとめた毛並みストローク */
function fur(opts: {
  seed: number;
  count: number;
  box: [number, number, number, number];
  inside: (p: Pt) => boolean;
  mix: (p: Pt) => Mix;
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
    const c = sample(opts.mix(p), r(), r());
    const a = opts.dir(p) + (r() - 0.5) * 0.6;
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

/** 下地のまだら（小さな円を敷き詰める） */
function blobs(opts: {
  seed: number;
  count: number;
  box: [number, number, number, number];
  inside: (p: Pt) => boolean;
  mix: (p: Pt) => Mix;
  r: [number, number];
}): string {
  const r = rng(opts.seed);
  const [x0, y0, x1, y1] = opts.box;
  const groups = new Map<string, string[]>();
  let made = 0;
  let guard = 0;
  while (made < opts.count && guard++ < opts.count * 20) {
    const p: Pt = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (!opts.inside(p)) continue;
    const c = sample(opts.mix(p), r(), r());
    const rad = opts.r[0] + r() * (opts.r[1] - opts.r[0]);
    // 円を path で表現（M x-r y a r r 0 1 0 2r 0 a r r 0 1 0 -2r 0）
    const seg = `M${f(p[0] - rad)} ${f(p[1])}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0`;
    const list = groups.get(c) ?? [];
    list.push(seg);
    groups.set(c, list);
    made++;
  }
  return [...groups.entries()].map(([c, segs]) => `<path d="${segs.join("")}" fill="${c}"/>`).join("");
}

// ---------------------------------------------------------------------
// 頭（viewBox 0 0 200 200 の座標系）。左右は「見る人から見て」。
// ---------------------------------------------------------------------

const HEAD_PATH =
  "M100,174 C70,174 40,163 32,135 C26,110 37,83 58,70 C76,59 124,59 142,70 C163,83 174,110 168,135 C160,163 130,174 100,174Z";
const EAR_L = "M40,102 L46,22 Q49,13 57,17 L100,64 Z";
const EAR_R = "M160,102 L154,22 Q151,13 143,17 L100,64 Z";
const EAR_L_PTS: Pt[] = [[40, 102], [46, 22], [57, 17], [100, 64]];
const EAR_R_PTS: Pt[] = [[160, 102], [154, 22], [143, 17], [100, 64]];

// 額の黒い縦筋（頭頂〜眉間〜鼻すじの左側）
const STRIPE: Pt[] = [[92, 56], [103, 56], [102, 84], [100, 104], [99, 120], [93, 136], [90, 134], [94, 112], [95, 90]];
// 向かって右の額〜眉間〜鼻すじ右のオレンジ
const BLAZE: Pt[] = [
  [103, 56], [118, 57], [133, 63], [141, 72], [136, 84], [124, 94], [114, 104], [110, 116], [108, 134], [101, 134], [100, 112], [102, 84],
];
const STRIPE_D =
  "M92,56 L103,56 C103,68 102,84 100,104 C99,114 97,126 93,136 L90,134 C92,124 94,112 95,98 C95,84 94,68 92,56Z";
const BLAZE_D =
  "M103,56 C114,56 128,59 138,67 L141,72 C138,82 128,91 118,99 C112,106 110,118 108,134 L101,134 C100,118 100,104 101,92 C102,80 103,68 103,56Z";

function headMix(p: Pt): Mix {
  const [x, y] = p;
  if (inPoly(p, STRIPE)) return [0.05, 0.12, 0.83, 0];
  if (inPoly(p, BLAZE)) return [0.82, 0.08, 0.04, 0.06];
  if (inEllipse(p, 110, 151, 22, 14)) return [0.02, 0.08, 0.9, 0]; // 鼻の下〜口元右: 黒
  if (inEllipse(p, 104, 165, 18, 9)) return [0.02, 0.13, 0.85, 0]; // あご: 黒
  if (inEllipse(p, 81, 150, 12, 10)) return [0.3, 0.08, 0.02, 0.6]; // 口元左: 明るい茶
  if (inEllipse(p, 84, 166, 10, 6)) return [0.2, 0.25, 0.1, 0.45]; // あご左: ベージュ
  if (inEllipse(p, 131, 128, 12, 8)) return [0.1, 0.3, 0.6, 0]; // 右目の下: 暗い
  if (inEllipse(p, 58, 128, 26, 24)) return [0.55, 0.22, 0.1, 0.13]; // 左頬: 金色っぽい茶
  if (inEllipse(p, 72, 86, 24, 16)) return [0.45, 0.33, 0.22, 0]; // 左の額
  if (inEllipse(p, 148, 128, 22, 24)) return [0.35, 0.4, 0.25, 0]; // 右頬: 茶とオレンジのまだら
  if (x > 132 && y < 104) return [0.4, 0.35, 0.25, 0]; // 右目の上〜外側
  if (y < 72) return [0.15, 0.35, 0.5, 0]; // 頭頂
  return [0.3, 0.4, 0.3, 0];
}

function eye(cx: number, cy: number, id: string): string {
  return `<g class="cat-eye">
<ellipse cx="${cx}" cy="${cy}" rx="15.5" ry="14.5" fill="url(#${id}-iris)" stroke="#120b07" stroke-width="2.6"/>
<g class="cat-pupils"><ellipse cx="${cx}" cy="${cy + 0.5}" rx="7.6" ry="10.8" fill="#100a06"/>
<circle cx="${cx - 4.5}" cy="${cy - 5.5}" r="3.4" fill="#fff" opacity=".9"/><circle cx="${cx + 4}" cy="${cy + 5}" r="1.4" fill="#fff" opacity=".6"/></g>
</g>`;
}

const insideHead = (p: Pt) => inEllipse(p, 100, 117, 72, 60);

/** 頭部の SVG 要素（<svg> の中身）。id は 1 ページに複数置くとき重複しないように変える */
export function catHeadInner(id = "cat"): string {
  // 左耳は付け根にオレンジ、右耳はほぼ黒
  const earMixL = (p: Pt): Mix => (p[1] > 70 ? [0.55, 0.25, 0.2, 0] : [0.2, 0.3, 0.5, 0]);
  const earMixR = (p: Pt): Mix => (p[1] > 80 ? [0.3, 0.35, 0.35, 0] : [0.08, 0.3, 0.62, 0]);
  const earFur = (seed: number, pts: Pt[], mix: (p: Pt) => Mix) =>
    fur({ seed, count: 170, box: [38, 12, 162, 104], inside: (p) => inPoly(p, pts), mix, dir: () => -Math.PI / 2, len: [2, 4], width: 1.3 });

  return `<defs>
<radialGradient id="${id}-iris" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#d2d4a8"/><stop offset=".5" stop-color="#a3a97f"/><stop offset="1" stop-color="#636c4c"/></radialGradient>
<linearGradient id="${id}-inear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2621"/><stop offset=".7" stop-color="#7a4f45"/><stop offset="1" stop-color="#9a6a5c"/></linearGradient>
<clipPath id="${id}-head"><path d="${HEAD_PATH}"/></clipPath>
<clipPath id="${id}-earl"><path d="${EAR_L}"/></clipPath>
<clipPath id="${id}-earr"><path d="${EAR_R}"/></clipPath>
</defs>
<g class="cat-ear-l"><path d="${EAR_L}" fill="#3b2e24"/><g clip-path="url(#${id}-earl)">${earFur(11, EAR_L_PTS, earMixL)}</g>
<path d="M51,90 L53,33 L89,68 Z" fill="url(#${id}-inear)"/>
<path d="M58,72 l-6,-12 M62,76 l-4,-13 M56,81 l-8,-9 M66,79 l-2,-12" stroke="#e2d2c0" stroke-width=".9" opacity=".7"/></g>
<g class="cat-ear-r"><path d="${EAR_R}" fill="#2a2019"/><g clip-path="url(#${id}-earr)">${earFur(12, EAR_R_PTS, earMixR)}</g>
<path d="M149,90 L147,33 L111,68 Z" fill="url(#${id}-inear)"/>
<path d="M142,72 l6,-12 M138,76 l4,-13 M144,81 l8,-9 M134,79 l2,-12" stroke="#e2d2c0" stroke-width=".9" opacity=".7"/></g>
<path d="${HEAD_PATH}" fill="#66503d"/>
<g clip-path="url(#${id}-head)">
${blobs({ seed: 5, count: 230, box: [28, 56, 172, 176], inside: insideHead, mix: headMix, r: [4, 8] })}
<path d="${BLAZE_D}" fill="#c3854b"/>
<path d="${STRIPE_D}" fill="#231a13"/>
<ellipse cx="110" cy="151" rx="21" ry="13" fill="#1f1610"/>
<ellipse cx="104" cy="165" rx="17" ry="8" fill="#241a13"/>
<ellipse cx="81" cy="151" rx="11" ry="9" fill="#d4a97a"/>
${fur({
  seed: 7,
  count: 1500,
  box: [28, 56, 172, 176],
  inside: insideHead,
  mix: headMix,
  dir: ([x, y]) => Math.atan2(y - 142, x - 101),
  len: [2, 4.2],
  width: 1.3,
})}
<path d="M70,93 Q76,89 83,92 M119,92 Q126,89 132,93" stroke="#1d140e" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>
</g>
${eye(74, 111, id)}${eye(127, 111, id)}
<path d="M95,135 Q102,131.5 109,135 Q106,142 102,144 Q98,142 95,135Z" fill="#120b08"/>
<path d="M102,144 L102,149 M102,149 Q96,154 90,151 M102,149 Q108,154 114,151" stroke="#0d0805" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<g fill="#2a1c13" opacity=".55"><circle cx="83" cy="146" r=".9"/><circle cx="80" cy="150" r=".9"/><circle cx="84" cy="153" r=".9"/></g>
<g stroke="#f2e8da" stroke-width=".85" opacity=".8" fill="none" stroke-linecap="round">
<path d="M82,147 Q60,142 37,145"/><path d="M82,151 Q60,152 39,158"/><path d="M84,155 Q66,160 47,170"/>
<path d="M121,147 Q143,142 165,145"/><path d="M121,151 Q143,152 163,158"/><path d="M119,155 Q137,160 155,170"/>
</g>`;
}

// ---------------------------------------------------------------------
// 座った全身（viewBox 0 0 240 300）
// ---------------------------------------------------------------------

const BODY_PATH = "M64,148 C42,188 34,250 46,292 Q120,302 194,292 C206,250 198,188 176,148 Z";
const BODY_PTS: Pt[] = [[64, 148], [176, 148], [204, 250], [194, 298], [46, 298], [36, 250]];

function bodyMix(p: Pt): Mix {
  if (inEllipse(p, 120, 158, 30, 14)) return [0.4, 0.38, 0.14, 0.08]; // のど
  if (inEllipse(p, 68, 212, 32, 52)) return [0.66, 0.2, 0.14, 0]; // 左肩〜脇: 明るいオレンジ
  if (inEllipse(p, 62, 272, 26, 24)) return [0.5, 0.15, 0.35, 0]; // 左下: オレンジに黒
  if (inEllipse(p, 180, 232, 28, 56)) return [0.18, 0.37, 0.45, 0]; // 右側: 暗め
  if (inEllipse(p, 120, 205, 34, 40)) return [0.34, 0.44, 0.22, 0]; // 胸: キャラメル
  return [0.35, 0.4, 0.25, 0];
}

const LEG_L: Pt[] = [[84, 222], [116, 222], [118, 290], [82, 290]];
const LEG_R: Pt[] = [[124, 222], [156, 222], [158, 290], [122, 290]];
const legMix = (p: Pt): Mix => (p[0] < 120 ? [0.58, 0.28, 0.14, 0] : [0.45, 0.33, 0.22, 0]);

export function catSittingInner(id = "cats"): string {
  const pawPts = (cx: number): ((p: Pt) => boolean) => (p) => inEllipse(p, cx, 289, 18, 11);
  const legBars = (x0: number) =>
    [232, 246, 260, 274]
      .map((y, i) => `M${x0 + 2},${y + (i % 2)} Q${x0 + 17},${y + 5} ${x0 + 32},${y - 1}`)
      .join(" ");
  return `<defs><clipPath id="${id}-body"><path d="${BODY_PATH}"/></clipPath>
<clipPath id="${id}-legs"><path d="M84,222 C82,250 82,272 84,288 L116,288 C118,272 118,250 116,222Z M124,222 C122,250 122,272 124,288 L156,288 C158,272 158,250 156,222Z"/></clipPath></defs>
<g class="cat-tail"><path d="M186,284 C232,292 242,250 226,222 C220,212 214,206 210,200" stroke="#2d221a" stroke-width="17" fill="none" stroke-linecap="round"/>
<path d="M186,284 C232,292 242,250 226,222 C220,212 214,206 210,200" stroke="#bf834c" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="4 7 9 6 3 9" opacity=".9"/>
<path d="M190,286 C228,290 236,254 224,230" stroke="#6c5442" stroke-width="3" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/></g>
<g class="cat-breath">
<path d="${BODY_PATH}" fill="#66503d"/>
<g clip-path="url(#${id}-body)">
${blobs({ seed: 19, count: 520, box: [34, 140, 206, 300], inside: (p) => inPoly(p, BODY_PTS), mix: bodyMix, r: [4, 7] })}
${fur({
  seed: 21,
  count: 2300,
  box: [34, 140, 206, 300],
  inside: (p) => inPoly(p, BODY_PTS),
  mix: bodyMix,
  dir: ([x]) => Math.PI / 2 + (x - 120) / 160,
  len: [2.5, 5],
  width: 1.4,
})}
<g stroke="#1f150e" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round">
<path d="M94,184 Q120,191 146,184"/><path d="M92,199 Q120,207 148,199"/>
<path d="M48,214 Q60,206 74,212"/><path d="M44,232 Q58,224 72,230"/><path d="M168,212 Q182,206 194,214"/>
</g>
<g clip-path="url(#${id}-legs)">
<path d="M84,222 C82,250 82,272 84,288 L116,288 C118,272 118,250 116,222Z" fill="#a8714a"/>
<path d="M124,222 C122,250 122,272 124,288 L156,288 C158,272 158,250 156,222Z" fill="#7b604a"/>
${fur({ seed: 41, count: 380, box: [80, 220, 160, 292], inside: (p) => inPoly(p, LEG_L) || inPoly(p, LEG_R), mix: legMix, dir: () => Math.PI / 2, len: [2, 4], width: 1.3 })}
<path d="${legBars(84)} ${legBars(124)}" stroke="#20150e" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>
</g>
<path d="M117,232 C118,254 118,272 117,288 M123,232 C122,254 122,272 123,288" stroke="#2a1c13" stroke-width="1.2" opacity=".3" fill="none"/>
</g>
<ellipse cx="100" cy="289" rx="18" ry="11" fill="#b98250"/><ellipse cx="140" cy="289" rx="18" ry="11" fill="#9d6c45"/>
${fur({ seed: 31, count: 110, box: [80, 276, 120, 302], inside: pawPts(100), mix: () => [0.75, 0.2, 0.02, 0.03], dir: () => Math.PI / 2, len: [2, 3.5], width: 1.3 })}
${fur({ seed: 32, count: 110, box: [120, 276, 160, 302], inside: pawPts(140), mix: () => [0.6, 0.3, 0.1, 0], dir: () => Math.PI / 2, len: [2, 3.5], width: 1.3 })}
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
