// イメージキャラ「サビ猫」の SVG を生成する（React・アイコン生成スクリプトの両方から使う）。
// モデルの猫の特徴:
//  - 額の中央に黒い縦筋、向かって右の額〜眉間〜鼻すじにオレンジの流れ
//  - 鼻は黒。口元は向かって右が黒・左がキャラメル色
//  - 緑がかった黄色の大きな目、大きく立った耳（内側は暗い）
//  - 体はオレンジと黒の細かいまだら（ブリンドル）、胸に薄い縞
// 乱数はシード固定なので、毎回同じ模様になる。
// ※ このファイルは import を持たないこと（scripts/gen-cat-icons.mjs が Node で直接読む）

type Pt = [number, number];

// 顔用と体用で色を分ける（写真では体の方が赤みの強いオレンジ）
type Pal = { O: string[]; B: string[]; D: string[]; C: string[] };
const PALS: Record<"head" | "body", Pal> = {
  head: {
    O: ["#b06b37", "#c07a42", "#d08c52", "#dc9c64"],
    B: ["#5e4433", "#6e523d", "#7c5d44"],
    D: ["#201711", "#2c2119", "#3a2c22"],
    C: ["#d6a877", "#e0b98a", "#e9c79c"],
  },
  body: {
    O: ["#a35a28", "#b36631", "#c3753b", "#cf8446"],
    B: ["#5c3c25", "#6a4529", "#7a5131"],
    D: ["#201711", "#2c2119", "#3a2c22"],
    C: ["#c98d56", "#d69c64"],
  },
};

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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** 値ノイズ（0〜1）。柄の境目を不規則にするために使う */
function makeNoise(seed: number) {
  const h = (ix: number, iy: number) => {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const one = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy) + (h(ix + 1, iy) - h(ix, iy)) * sx;
    const b = h(ix, iy + 1) + (h(ix + 1, iy + 1) - h(ix, iy + 1)) * sx;
    return a + (b - a) * sy;
  };
  // 2 オクターブ
  return (x: number, y: number, scale: number) => one(x / scale, y / scale) * 0.65 + one((x * 2.1) / scale + 17, (y * 2.1) / scale + 9) * 0.35;
}

/** 楕円の中心からの距離に応じて 1→0 になる重み */
function softEllipse([x, y]: Pt, cx: number, cy: number, rx: number, ry: number, feather = 0.5): number {
  const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
  return 1 - smooth(1 - feather, 1 + feather * 0.4, d);
}

/** 黒さ D（0〜1）とクリーム量からまだらの割合を作る */
function mixFromDark(D: number, cream = 0, contrast = true): Mix {
  // コントラストをつけて「黒の塊」と「オレンジの塊」がはっきり出るようにする（境目はノイズで不規則）
  const d = contrast ? smooth(0.22, 0.78, D) : clamp01(D);
  const c = clamp01(cream);
  return [(1 - d) * 0.85 * (1 - c), 0.1 + 0.12 * (1 - Math.abs(d - 0.5) * 2), d * 0.88 * (1 - c * 0.7), c * 0.9];
}

/** 割合に従って色を選ぶ */
function sample(m: Mix, r: number, r2: number, pal: Pal): string {
  const total = m[0] + m[1] + m[2] + m[3];
  let t = r * total;
  const fams = [pal.O, pal.B, pal.D, pal.C];
  for (let i = 0; i < 4; i++) {
    if (t < m[i]) return pick(fams[i], r2);
    t -= m[i];
  }
  return pick(pal.B, r2);
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
  pal?: "head" | "body";
  opacity?: number;
}): string {
  const r = rng(opts.seed);
  const [x0, y0, x1, y1] = opts.box;
  const groups = new Map<string, string[]>();
  let made = 0;
  let guard = 0;
  while (made < opts.count && guard++ < opts.count * 20) {
    const p: Pt = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (!opts.inside(p)) continue;
    const c = sample(opts.mix(p), r(), r(), PALS[opts.pal ?? "head"]);
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
        `<path d="${segs.join("")}" stroke="${c}" stroke-width="${opts.width}" stroke-linecap="round" fill="none"${opts.opacity != null ? ` opacity="${opts.opacity}"` : ""}/>`,
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
  pal?: "head" | "body";
}): string {
  const r = rng(opts.seed);
  const [x0, y0, x1, y1] = opts.box;
  const groups = new Map<string, string[]>();
  let made = 0;
  let guard = 0;
  while (made < opts.count && guard++ < opts.count * 20) {
    const p: Pt = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (!opts.inside(p)) continue;
    const c = sample(opts.mix(p), r(), r(), PALS[opts.pal ?? "head"]);
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

// 柄は「黒さの場」で決める（図形で区切ると黒い部分が貼り付けたように分かれて見えるため）
const headNoise = makeNoise(3);

/** 額の黒い筋（頭頂〜眉間〜鼻すじの左）: 中心線からの距離で薄れる＋ノイズでにじむ */
function stripeField([x, y]: Pt, n: number): number {
  if (y < 50 || y > 140) return 0;
  const cx = 97 - Math.max(0, y - 100) * 0.12 + (n - 0.5) * 6;
  const width = 5 + (y < 70 ? 4 : 0) + n * 3;
  const along = smooth(50, 60, y) * (1 - smooth(128, 140, y));
  return (1 - smooth(width * 0.6, width * 1.6, Math.abs(x - cx))) * along;
}

/** 向かって右の額〜眉間〜鼻すじ右のオレンジ */
function blazeField([x, y]: Pt, n: number): number {
  if (y < 52 || y > 138) return 0;
  // 上は右の耳の付け根へ広がり、下は鼻すじに向かって細くなる
  const t = clamp01((y - 56) / 78);
  const left = 101 + (n - 0.5) * 4;
  const right = 140 - t * 30 + (n - 0.5) * 14;
  const inX = smooth(left - 1, left + 4, x) * (1 - smooth(right - 6, right + 6, x));
  return inX * (1 - smooth(126, 138, y));
}

function headDark(p: Pt): { D: number; cream: number } {
  const [x, y] = p;
  const n = headNoise(x, y, 14);
  const n2 = headNoise(x + 40, y - 30, 7);
  let D = 0.62 + (n - 0.5) * 0.75 + (n2 - 0.5) * 0.3; // 頭は全体に黒っぽく、まだら
  // 頭頂の「帽子」: 耳の間〜額の上が黒い。下の縁はノイズでガタつかせ、中央は少し下がる
  const capEdge = 85 + (n - 0.5) * 12 + (n2 - 0.5) * 6 + (1 - smooth(6, 26, Math.abs(x - 99))) * 6;
  const cap = 1 - smooth(capEdge - 7, capEdge + 5, y);
  D += cap * 1.6;
  D += stripeField(p, n2) * 1.3;
  D -= blazeField(p, n2) * 1.25 * (1 - cap * 0.85); // オレンジの流れは帽子の下から
  D -= softEllipse(p, 58, 128, 26, 24) * 0.3; // 左頬はオレンジ寄り
  D += softEllipse(p, 131, 128, 13, 9) * 0.25; // 右目の下は暗い
  D += softEllipse(p, 110, 152, 23, 15, 0.6) * 1.1; // 鼻の下〜口元右は黒
  D += softEllipse(p, 104, 166, 19, 10, 0.6) * 0.9; // あご
  const cream = softEllipse(p, 81, 150, 12, 10, 0.7) * 0.8 + softEllipse(p, 84, 167, 10, 6, 0.7) * 0.5;
  D -= cream * 0.8;
  return { D, cream };
}

function headMix(p: Pt): Mix {
  const { D, cream } = headDark(p);
  return mixFromDark(D, cream);
}

function eye(cx: number, cy: number, id: string): string {
  return `<g class="cat-eye">
<ellipse cx="${cx}" cy="${cy}" rx="15.5" ry="14.5" fill="url(#${id}-iris)" stroke="#120b07" stroke-width="2.6"/>
<g class="cat-pupils"><ellipse cx="${cx}" cy="${cy + 0.5}" rx="6.4" ry="10" fill="#100a06"/>
<circle cx="${cx - 4.5}" cy="${cy - 5.5}" r="3.4" fill="#fff" opacity=".9"/><circle cx="${cx + 4}" cy="${cy + 5}" r="1.4" fill="#fff" opacity=".6"/></g>
</g>`;
}

const insideHead = (p: Pt) => inEllipse(p, 100, 117, 72, 60);

/** 毛の流れ: 額は眉間から扇状に上へ、顔の下半分は鼻から外へ */
const headFurDir = ([x, y]: Pt) => (y < 108 ? Math.atan2(y - 122, x - 100) : Math.atan2(y - 142, x - 101));

/** 頭部の SVG 要素（<svg> の中身）。id は 1 ページに複数置くとき重複しないように変える */
export function catHeadInner(id = "cat", opts: { eyes?: boolean } = {}): string {
  const withEyes = opts.eyes !== false;
  // 左耳は付け根にオレンジ、右耳はほぼ黒
  // 耳は付け根で頭の柄とつながり、先に行くほど黒くなる
  const earMixL = (p: Pt): Mix => mixFromDark(0.85 + (headNoise(p[0], p[1], 10) - 0.5) * 0.6 - smooth(70, 100, p[1]) * 0.1);
  const earMixR = (p: Pt): Mix => mixFromDark(0.9 + (headNoise(p[0] + 50, p[1], 10) - 0.5) * 0.5 - smooth(70, 100, p[1]) * 0.08);
  const earFur = (seed: number, pts: Pt[], mix: (p: Pt) => Mix) =>
    fur({ seed, count: 520, box: [38, 12, 162, 104], inside: (p) => inPoly(p, pts), mix, dir: () => -Math.PI / 2, len: [2.5, 5.5], width: 0.85 });

  return `<defs>
<radialGradient id="${id}-iris" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#e0cd78"/><stop offset=".45" stop-color="#c4a84a"/><stop offset=".8" stop-color="#97802f"/><stop offset="1" stop-color="#5f5222"/></radialGradient>
<linearGradient id="${id}-inear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3530"/><stop offset=".6" stop-color="#8f6c66"/><stop offset="1" stop-color="#b08a82"/></linearGradient>
<clipPath id="${id}-head"><path d="${HEAD_PATH}"/></clipPath>
<filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter>
<clipPath id="${id}-earl"><path d="${EAR_L}"/></clipPath>
<clipPath id="${id}-earr"><path d="${EAR_R}"/></clipPath>
</defs>
<g class="cat-ear-l"><path d="${EAR_L}" fill="#3a2a20"/><g clip-path="url(#${id}-earl)">${earFur(11, EAR_L_PTS, earMixL)}</g>
<path d="M51,90 L53,33 L89,68 Z" fill="url(#${id}-inear)"/>
<path d="M58,72 l-6,-12 M62,76 l-4,-13 M56,81 l-8,-9 M66,79 l-2,-12" stroke="#e2d2c0" stroke-width=".9" opacity=".7"/></g>
<g class="cat-ear-r"><path d="${EAR_R}" fill="#33251c"/><g clip-path="url(#${id}-earr)">${earFur(12, EAR_R_PTS, earMixR)}</g>
<path d="M149,90 L147,33 L111,68 Z" fill="url(#${id}-inear)"/>
<path d="M142,72 l6,-12 M138,76 l4,-13 M144,81 l8,-9 M134,79 l2,-12" stroke="#e2d2c0" stroke-width=".9" opacity=".7"/></g>
<path d="${HEAD_PATH}" fill="#33261e"/>
<g clip-path="url(#${id}-head)">
<g filter="url(#${id}-soft)">
${blobs({ seed: 5, count: 420, box: [28, 50, 172, 176], inside: insideHead, mix: headMix, r: [3.5, 7] })}
</g>
${fur({
  seed: 7,
  count: 2600,
  box: [28, 56, 172, 176],
  inside: insideHead,
  mix: headMix,
  dir: headFurDir,
  len: [3, 6.5],
  width: 0.8,
})}
${fur({
  seed: 8,
  count: 320,
  box: [28, 56, 172, 120],
  inside: (p) => insideHead(p) && headDark(p).D > 0.45,
  mix: () => [0.75, 0.25, 0, 0],
  dir: headFurDir,
  len: [3.5, 7],
  width: 0.6,
  opacity: 0.55,
})}
<path d="M70,93 Q76,89 83,92 M119,92 Q126,89 132,93" stroke="#1d140e" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>
</g>
${withEyes ? `${eye(74, 111, id)}${eye(127, 111, id)}` : ""}
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

const BODY_PATH = "M62,148 C36,190 28,252 42,292 Q120,304 198,292 C212,252 204,190 178,148 Z";
const BODY_PTS: Pt[] = [[62, 148], [178, 148], [210, 250], [198, 300], [42, 300], [30, 250]];

const bodyNoise = makeNoise(9);

function bodyMix(p: Pt): Mix {
  const [x, y] = p;
  const n = bodyNoise(x, y, 18);
  const n2 = bodyNoise(x - 20, y + 30, 8);
  let D = 0.3 + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.35; // 赤みのオレンジに黒がにじむ
  D -= softEllipse(p, 66, 212, 34, 54) * 0.22; // 左肩〜脇は明るい
  D += softEllipse(p, 188, 228, 34, 64) * 0.25; // 右側・背中側は暗め
  D += (1 - smooth(150, 172, y)) * 0.15; // 首まわり
  // 体はコントラストを弱めにして、細かい霜降りに見せる（大きな黒い斑点にしない）
  const m = mixFromDark(0.2 + D * 0.6, 0, false);
  return [m[0] * 1.1, m[1], m[2], m[3]];
}

const LEG_L: Pt[] = [[84, 222], [116, 222], [118, 290], [82, 290]];
const LEG_R: Pt[] = [[124, 222], [156, 222], [158, 290], [122, 290]];
const legMix = (p: Pt): Mix => (p[0] < 120 ? [0.65, 0.22, 0.13, 0] : [0.5, 0.28, 0.22, 0]);

type Seg = [Pt, Pt, Pt, Pt];

function bez([a, b, c, d]: Seg, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

/**
 * 毛並みのあるしっぽ（付け根→先端）。体と同じ細かい毛・まだらで描き、しまは毛の中にぼかして入れる。
 * softFilter はぼかしフィルタの id。
 */
function furryTail(segs: Seg[], halfW: number, seed: number, stripes: number, softFilter: string): string {
  // 長さで正規化した位置 u（0=付け根, 1=先端）で点と向きを引けるようにする
  const pts: { p: Pt; len: number }[] = [];
  let total = 0;
  segs.forEach((sg, i) => {
    for (let k = i === 0 ? 0 : 1; k <= 40; k++) {
      const p = bez(sg, k / 40);
      if (pts.length) total += Math.hypot(p[0] - pts[pts.length - 1].p[0], p[1] - pts[pts.length - 1].p[1]);
      pts.push({ p, len: total });
    }
  });
  const at = (u: number) => {
    const L = u * total;
    let i = pts.findIndex((q) => q.len >= L);
    if (i <= 0) i = 1;
    const a = pts[i - 1];
    const b = pts[i];
    const t = b.len === a.len ? 0 : (L - a.len) / (b.len - a.len);
    const p: Pt = [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
    const ang = Math.atan2(b.p[1] - a.p[1], b.p[0] - a.p[0]);
    return { p, ang };
  };
  const width = (u: number) => halfW * (1 - 0.18 * u) * (u > 0.94 ? Math.sqrt(Math.max(0, (1 - u) / 0.06)) * 0.6 + 0.4 : 1);
  const noise = makeNoise(seed);
  const darkAt = (u: number, p: Pt) => {
    const band = 0.5 + 0.5 * Math.sin(2 * Math.PI * stripes * u - Math.PI / 2);
    let D = 0.15 + 0.75 * smooth(0.35, 0.68, band) + (noise(p[0], p[1], 6) - 0.5) * 0.35;
    D += smooth(0.86, 0.95, u) * 0.8; // 先端は黒
    return D;
  };
  const r = rng(seed);
  const blobGroups = new Map<string, string[]>();
  const furGroups = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, c: string, seg: string) => {
    const l = m.get(c) ?? [];
    l.push(seg);
    m.set(c, l);
  };
  // 下地のまだら（ぼかす）
  for (let i = 0; i < 110; i++) {
    const u = r();
    const { p, ang } = at(u);
    const off = (r() * 2 - 1) * width(u) * 0.7;
    const q: Pt = [p[0] - Math.sin(ang) * off, p[1] + Math.cos(ang) * off];
    const c = sample(mixFromDark(darkAt(u, q)), r(), r(), PALS.body);
    const rad = width(u) * (0.55 + r() * 0.4);
    push(blobGroups, c, `M${f(q[0] - rad)} ${f(q[1])}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0`);
  }
  // 毛（先端に向かって流れる）
  const count = Math.round(total * halfW * 0.75);
  for (let i = 0; i < count; i++) {
    const u = r();
    const { p, ang } = at(u);
    const off = (r() * 2 - 1) * width(u);
    const q: Pt = [p[0] - Math.sin(ang) * off, p[1] + Math.cos(ang) * off];
    const c = sample(mixFromDark(darkAt(u, q)), r(), r(), PALS.body);
    const a = ang + (r() - 0.5) * 0.5 + (off / halfW) * 0.25;
    const l = 2.5 + r() * 3.5;
    push(furGroups, c, `M${f(q[0])} ${f(q[1])}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}`);
  }
  const base = `M${segs[0][0].join(",")} ${segs.map((sg) => `C${sg[1].join(",")} ${sg[2].join(",")} ${sg[3].join(",")}`).join(" ")}`;
  const blobsSvg = [...blobGroups.entries()].map(([c, d]) => `<path d="${d.join("")}" fill="${c}"/>`).join("");
  const furSvg = [...furGroups.entries()]
    .map(([c, d]) => `<path d="${d.join("")}" stroke="${c}" stroke-width="0.9" stroke-linecap="round" fill="none"/>`)
    .join("");
  return `<path d="${base}" stroke="#7a5132" stroke-width="${halfW * 2 - 1}" stroke-linecap="round" fill="none"/>
<g filter="url(#${softFilter})">${blobsSvg}</g>${furSvg}`;
}

const SIT_TAIL: Seg[] = [
  [[176, 286], [232, 294], [242, 250], [226, 222]],
  [[226, 222], [220, 212], [214, 206], [210, 199]],
];
const WALK_TAIL_SEGS: Seg[] = [
  [[86, 100], [46, 92], [32, 64], [38, 36]],
  [[38, 36], [40, 26], [46, 18], [54, 13]],
];

function sittingParts(id: string) {
  const pawPts = (cx: number): ((p: Pt) => boolean) => (p) => inEllipse(p, cx, 289, 18, 11);
  const legBars = (x0: number) =>
    [232, 246, 260, 274]
      .map((y, i) => `M${x0 + 2},${y + (i % 2)} Q${x0 + 17},${y + 5} ${x0 + 32},${y - 1}`)
      .join(" ");
  return {
    defs: `<defs><clipPath id="${id}-body"><path d="${BODY_PATH}"/></clipPath>
<filter id="${id}-bsoft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="${id}-tsoft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter>
<radialGradient id="${id}-shade"><stop offset="0" stop-color="#1d140e" stop-opacity=".55"/><stop offset="1" stop-color="#1d140e" stop-opacity="0"/></radialGradient>
<clipPath id="${id}-legs"><path d="M84,222 C82,250 82,272 84,288 L116,288 C118,272 118,250 116,222Z M124,222 C122,250 122,272 124,288 L156,288 C158,272 158,250 156,222Z"/></clipPath></defs>`,
    tail: `<g class="cat-tail">${furryTail(SIT_TAIL, 8.5, 61, 5, `${id}-bsoft`)}</g>`,
    body: `<g class="cat-breath">
<path d="${BODY_PATH}" fill="#7a5132"/>
<g clip-path="url(#${id}-body)">
<g filter="url(#${id}-bsoft)">${blobs({
  seed: 19,
  count: 560,
  box: [28, 140, 212, 302],
  inside: (p) => inPoly(p, BODY_PTS),
  // 下地は黒を控えめにして斑点に見えないようにする（黒は毛並みで出す）
  mix: (p) => {
    const m = bodyMix(p);
    return [m[0], m[1] + m[2] * 0.7, m[2] * 0.3, m[3]];
  },
  r: [4, 7],
  pal: "body",
})}</g>
<ellipse cx="192" cy="218" rx="46" ry="84" fill="url(#${id}-shade)"/>
<ellipse cx="120" cy="150" rx="70" ry="20" fill="url(#${id}-shade)" opacity=".7"/>}
${fur({
  seed: 21,
  count: 3600,
  box: [28, 140, 212, 302],
  pal: "body",
  inside: (p) => inPoly(p, BODY_PTS),
  mix: bodyMix,
  dir: ([x]) => Math.PI / 2 + (x - 120) / 160,
  len: [3, 6],
  width: 0.9,
})}
<g stroke="#1f150e" stroke-width="3" fill="none" opacity=".3" stroke-linecap="round" filter="url(#${id}-bsoft)">
<path d="M94,184 Q120,191 146,184"/><path d="M92,199 Q120,207 148,199"/>
<path d="M48,214 Q60,206 74,212"/><path d="M44,232 Q58,224 72,230"/><path d="M168,212 Q182,206 194,214"/>
</g>
<g clip-path="url(#${id}-legs)">
${fur({ seed: 41, count: 640, box: [80, 220, 160, 292], inside: (p) => inPoly(p, LEG_L) || inPoly(p, LEG_R), mix: legMix, dir: () => Math.PI / 2, len: [2.5, 5], width: 0.9, pal: "body" })}
<path d="${legBars(84)} ${legBars(124)}" stroke="#20150e" stroke-width="2.4" fill="none" opacity=".22" stroke-linecap="round" filter="url(#${id}-bsoft)"/>
</g>
<path d="M118,236 C119,256 119,274 118,288 M122,236 C121,256 121,274 122,288" stroke="#2a1c13" stroke-width="2" opacity=".18" fill="none" filter="url(#${id}-bsoft)"/>
</g>
<g filter="url(#${id}-bsoft)"><ellipse cx="100" cy="289" rx="17" ry="10" fill="#b56e38"/><ellipse cx="140" cy="289" rx="17" ry="10" fill="#a0602f"/></g>
${fur({ seed: 31, count: 160, box: [80, 276, 120, 302], inside: pawPts(100), mix: () => [0.72, 0.2, 0.05, 0.03], dir: () => Math.PI / 2, len: [2, 3.8], width: 0.9, pal: "body" })}
${fur({ seed: 32, count: 160, box: [120, 276, 160, 302], inside: pawPts(140), mix: () => [0.58, 0.28, 0.14, 0], dir: () => Math.PI / 2, len: [2, 3.8], width: 0.9, pal: "body" })}
<path d="M94,293 l0,4 M100,294 l0,4 M106,293 l0,4 M134,293 l0,4 M140,294 l0,4 M146,293 l0,4" stroke="#1c130d" stroke-width="1.1" opacity=".35"/>
</g>`,
  };
}

/** 座った全身（1 枚の SVG。静的ファイル用） */
export function catSittingInner(id = "cats"): string {
  const p = sittingParts(id);
  return `${p.defs}${p.tail}${p.body}<g class="cat-head" transform="translate(20 -6)">${catHeadInner(id)}</g>`;
}

/**
 * 画面用のレイヤー（すべて viewBox 0 0 240 300 で重ねる）。
 * 毛の本数が多くインライン SVG で動かすと再描画が重いので、
 * 動かない部分は画像ファイルにして、CSS の transform（GPU）で動かす。
 */
export function catLayerSvgs(): Record<"tail" | "body" | "head", string> {
  const p = sittingParts("lay");
  const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">${inner}</svg>`;
  return {
    tail: wrap(`${p.defs}${p.tail.replace('class="cat-tail"', "")}`),
    body: wrap(`${p.defs}${p.body.replace('class="cat-breath"', "")}`),
    head: wrap(`<g transform="translate(20 -6)">${catHeadInner("layh", { eyes: false })}</g>`),
  };
}

/** 目だけ（全身の座標系）。まばたき・視線追従用にインラインで重ねる */
export function catSittingEyesInner(id: string): string {
  return `<defs><radialGradient id="${id}-iris" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#e0cd78"/><stop offset=".45" stop-color="#c4a84a"/><stop offset=".8" stop-color="#97802f"/><stop offset="1" stop-color="#5f5222"/></radialGradient></defs>
<g transform="translate(20 -6)">${eye(74, 111, id)}${eye(127, 111, id)}</g>`;
}

// ---------------------------------------------------------------------
// 歩く姿（横向き・右向き。viewBox 0 0 300 200）
// 顔は正面の頭（/cat-head.svg）を画面側で重ねる（柄を崩さないため）。脚は画面側でインライン描画。
// ---------------------------------------------------------------------

const WALK_BODY = "M72,98 C70,72 112,62 160,64 C204,66 236,74 242,98 C246,124 232,144 206,149 C170,156 130,156 100,149 C78,144 70,124 72,98Z";
const walkNoise = makeNoise(21);

function walkMix(p: Pt): Mix {
  const [x, y] = p;
  const n = walkNoise(x, y, 18);
  const n2 = walkNoise(x + 30, y - 10, 8);
  let D = 0.3 + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.35;
  D += (1 - smooth(70, 92, y)) * 0.35; // 背中は黒っぽい
  D -= smooth(118, 140, y) * 0.15; // お腹は明るめ
  const m = mixFromDark(0.2 + D * 0.6, smooth(128, 146, y) * 0.25, false);
  return [m[0] * 1.1, m[1], m[2], m[3]];
}

export function catWalkLayerSvgs(): Record<"body" | "tail", string> {
  const id = "walk";
  const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">${inner}</svg>`;
  const insideBody = (p: Pt) => inEllipse(p, 157, 106, 88, 44);
  const defs = `<defs><clipPath id="${id}-body"><path d="${WALK_BODY}"/></clipPath>
<filter id="${id}-soft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
<filter id="${id}-tsoft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter></defs>`;
  const body = `${defs}<path d="${WALK_BODY}" fill="#7a5132"/>
<g clip-path="url(#${id}-body)">
<g filter="url(#${id}-soft)">${blobs({ seed: 51, count: 420, box: [66, 60, 248, 150], inside: insideBody, mix: (p) => { const m = walkMix(p); return [m[0], m[1] + m[2] * 0.7, m[2] * 0.3, m[3]]; }, r: [4, 7], pal: "body" })}</g>
${fur({ seed: 52, count: 3000, box: [66, 60, 248, 150], inside: insideBody, mix: walkMix, dir: ([, y]) => Math.PI * 0.94 + ((y - 100) / 50) * 0.5, len: [3, 6.5], width: 0.9, pal: "body" })}
</g>`;
  const tail = `${defs}${furryTail(WALK_TAIL_SEGS, 7.5, 62, 5, `${id}-soft`)}`;
  return { body: wrap(body), tail: wrap(tail) };
}

/** 歩く脚（インライン用）。far = 奥の脚（暗め）。体と同じ毛並みで描く */
export function catWalkLegsInner(which: "far" | "near"): string {
  const legs = which === "far" ? [{ x: 114, ph: "a" }, { x: 194, ph: "b" }] : [{ x: 94, ph: "b" }, { x: 214, ph: "a" }];
  const baseD = which === "far" ? 0.62 : 0.32;
  const base = which === "far" ? "#4a3122" : "#9a5a2c";
  const pawFill = which === "far" ? "#5c3c25" : "#b8733a";
  const fid = `wl-${which}`;
  return (
    `<defs><filter id="${fid}" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="1.3"/></filter></defs>` +
    legs
      .map(({ x, ph }, i) => {
        const poly: Pt[] = [[x - 9, 110], [x + 9, 110], [x + 8, 177], [x + 1, 185], [x - 6, 177]];
        const shape = `M${x - 9},110 C${x - 9},140 ${x - 7},160 ${x - 6},176 Q${x + 1},186 ${x + 8},177 C${x + 8},160 ${x + 9},140 ${x + 9},110 Z`;
        const n = makeNoise(70 + i + (which === "far" ? 10 : 0));
        const mix = ([px, py]: Pt): Mix => {
          const band = 0.5 + 0.5 * Math.sin((py - 128) / 6.5);
          const D = baseD + 0.4 * smooth(0.55, 0.85, band) + (n(px, py, 7) - 0.5) * 0.4;
          return mixFromDark(D, 0, false);
        };
        return `<g class="cat-leg cat-leg-${ph}">
<path d="${shape}" fill="${base}"/>
<g filter="url(#${fid})">${blobs({ seed: 80 + i, count: 34, box: [x - 10, 108, x + 10, 186], inside: (p) => inPoly(p, poly), mix, r: [3, 5], pal: "body" })}</g>
${fur({ seed: 90 + i, count: 230, box: [x - 10, 108, x + 10, 186], inside: (p) => inPoly(p, poly), mix, dir: () => Math.PI / 2, len: [2.5, 4.5], width: 0.85, pal: "body" })}
<g filter="url(#${fid})"><ellipse cx="${x + 1}" cy="180" rx="10" ry="5.5" fill="${pawFill}"/></g>
${fur({ seed: 95 + i, count: 40, box: [x - 9, 174, x + 11, 186], inside: (p) => inEllipse(p, x + 1, 180, 10, 5.5), mix: () => (which === "far" ? [0.3, 0.4, 0.3, 0] : [0.7, 0.22, 0.05, 0.03]), dir: () => 0, len: [1.5, 3], width: 0.8, pal: "body" })}
</g>`;
      })
      .join("")
  );
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
