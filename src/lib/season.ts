// 季節の演出（背景に舞うもの・あかちゃんの小物・あいさつ）
// 日付はローカル（日本時間）で判定する。

export type Season = "newyear" | "snow" | "sakura" | "halloween" | "autumn";

export const SEASONS: Season[] = ["newyear", "snow", "sakura", "halloween", "autumn"];

export function seasonOf(d: Date): Season | null {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 1 && day <= 7) return "newyear";
  if (m === 12 || m === 1 || m === 2) return "snow";
  if ((m === 3 && day >= 15) || (m === 4 && day <= 15)) return "sakura";
  if (m === 10 && day >= 15) return "halloween";
  if (m === 11) return "autumn";
  return null;
}

/** URL の ?season=xxx で試し表示できる（none で非表示） */
export function currentSeason(): Season | null {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("season");
    if (q === "none") return null;
    if (q && (SEASONS as string[]).includes(q)) return q as Season;
  }
  return seasonOf(new Date());
}

export const SEASON_GREETING: Record<Season, string[]> = {
  newyear: ["あけましておめでとう！今年もよろしくね", "お正月だね。今年も帳簿をコツコツつけよう"],
  snow: ["雪だ！寒いからあったかくしてね", "冬は確定申告の準備の季節だよ"],
  sakura: ["桜がきれいだね", "新年度だね。領収書の整理はできてる？"],
  halloween: ["トリック・オア・トリート！", "かぼちゃの季節だね"],
  autumn: ["紅葉がきれいだね", "秋だね。年末に向けて帳簿を見直そう"],
};

// ---- あかちゃんの遊び道具（落ちてくるもの）: 小さな SVG（viewBox -10 -10 20 20） ----
export const SEASON_TOY_SVG: Record<Season, string> = {
  newyear: `<g>${[0, 72, 144, 216, 288]
    .map((a) => `<circle cx="${(Math.cos(((a - 90) * Math.PI) / 180) * 4.6).toFixed(2)}" cy="${(Math.sin(((a - 90) * Math.PI) / 180) * 4.6).toFixed(2)}" r="4" fill="#e0475b"/>`)
    .join("")}<circle r="2.6" fill="#f6d36b"/></g>`,
  snow: `<g stroke="#9fb3c8" stroke-width="1.4" stroke-linecap="round">${[0, 60, 120]
    .map((a) => `<line x1="${(Math.cos((a * Math.PI) / 180) * -8).toFixed(2)}" y1="${(Math.sin((a * Math.PI) / 180) * -8).toFixed(2)}" x2="${(Math.cos((a * Math.PI) / 180) * 8).toFixed(2)}" y2="${(Math.sin((a * Math.PI) / 180) * 8).toFixed(2)}"/>`)
    .join("")}</g><circle r="2.2" fill="#dbe7f3"/>`,
  sakura: `<path d="M0,9 C-4.5,5.5 -5.5,-2.5 -3.4,-7.6 C-2.2,-9.4 -0.8,-8.8 0,-6.6 C0.8,-8.8 2.2,-9.4 3.4,-7.6 C5.5,-2.5 4.5,5.5 0,9Z" fill="#f6b5c6" stroke="#e892a8" stroke-width=".6"/><path d="M0,7 L0,-3" stroke="#e892a8" stroke-width=".5" opacity=".6"/>`,
  halloween: `<g><ellipse rx="8" ry="6.5" fill="#f08a24"/><path d="M-3,-6 C-4,0 -4,4 -2.5,6.3 M3,-6 C4,0 4,4 2.5,6.3" stroke="#c96a12" stroke-width=".9" fill="none"/><path d="M-0.8,-6.2 L-0.2,-9.5 L1.6,-9" stroke="#4b7a32" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-4.2,-1.2 l1.6,-1.8 l1.6,1.8z M1,-1.2 l1.6,-1.8 l1.6,1.8z M-3.6,2 q3.6,2.6 7.2,0 q-3.6,1 -7.2,0z" fill="#3b2108"/></g>`,
  autumn: `<path d="${mapleLeafPath(8.5)}" fill="#d9452b" stroke="#a8321d" stroke-width=".5"/>`,
};

/** もみじの形（中心 0,0 / 半径 r） */
export function mapleLeafPath(r: number): string {
  const pts: string[] = [];
  // 5 つの葉先＋その間のくびれ
  const lobes = [-90, -30, 30, 150, 210];
  const all: { a: number; rad: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const a = lobes[i];
    const next = lobes[(i + 1) % 5] + (i === 4 ? 360 : 0);
    all.push({ a: a - 12, rad: 0.72 }, { a, rad: i === 0 ? 1 : i === 1 || i === 4 ? 0.95 : 0.78 }, { a: a + 12, rad: 0.72 });
    all.push({ a: (a + next) / 2, rad: i === 2 ? 0.25 : 0.38 });
  }
  for (const { a, rad } of all) {
    const t = (a * Math.PI) / 180;
    pts.push(`${(Math.cos(t) * r * rad).toFixed(2)},${(Math.sin(t) * r * rad).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z M0,${(r * 0.25).toFixed(2)} L0,${(r * 1.05).toFixed(2)}`;
}

// ---- 座っているあかちゃんの横に置く小物（viewBox 0 0 60 60、下端が地面） ----
export const SEASON_PROP_SVG: Record<Season, string> = {
  // 鏡餅
  newyear: `<rect x="10" y="48" width="40" height="10" rx="2" fill="#c8323a"/><rect x="12" y="46" width="36" height="4" fill="#f4e3c3"/>
<ellipse cx="30" cy="40" rx="18" ry="8" fill="#fbf8f1" stroke="#d9d2c3" stroke-width="1"/>
<ellipse cx="30" cy="30" rx="13" ry="6.5" fill="#fffdf8" stroke="#d9d2c3" stroke-width="1"/>
<circle cx="30" cy="20" r="5.5" fill="#f39a1e"/><path d="M30,14.5 l2.5,-2.5" stroke="#4b7a32" stroke-width="2" stroke-linecap="round"/>`,
  // 雪だるま
  snow: `<circle cx="30" cy="44" r="14" fill="#fbfdff" stroke="#c4d2e0" stroke-width="1.2"/>
<circle cx="30" cy="22" r="10" fill="#fbfdff" stroke="#c4d2e0" stroke-width="1.2"/>
<path d="M21,29 q9,5 18,0 l0,3.5 q-9,5 -18,0z" fill="#d23c3c"/><rect x="34" y="31" width="4" height="9" rx="1.5" fill="#d23c3c"/>
<circle cx="26.5" cy="20" r="1.4" fill="#2b2b2b"/><circle cx="33.5" cy="20" r="1.4" fill="#2b2b2b"/>
<path d="M30,23 l7,1.5 l-7,1.2z" fill="#f08a24"/><circle cx="30" cy="40" r="1.3" fill="#2b2b2b"/><circle cx="30" cy="46" r="1.3" fill="#2b2b2b"/>`,
  // 花見団子
  sakura: `<path d="M30,8 L30,58" stroke="#b98a5a" stroke-width="2" stroke-linecap="round"/>
<circle cx="30" cy="17" r="8" fill="#f6b5c6"/><circle cx="30" cy="31" r="8" fill="#fbf8f1" stroke="#e5dccb" stroke-width=".8"/><circle cx="30" cy="45" r="8" fill="#9cc77a"/>
<path d="M45,52 C41,49 41,45 44,43 C45,42.5 46,43.5 46.3,44.5 C46.6,43.5 47.6,42.5 48.6,43 C51.6,45 51.6,49 47.6,52Z" fill="#f6b5c6"/>`,
  // ジャック・オー・ランタン
  halloween: `<ellipse cx="30" cy="42" rx="22" ry="16" fill="#f08a24"/>
<path d="M22,27 C18,36 18,50 23,57 M38,27 C42,36 42,50 37,57 M30,26 L30,58" stroke="#c96a12" stroke-width="1.6" fill="none"/>
<path d="M28,27 L27,18 L33,17" stroke="#4b7a32" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M19,38 l5,-6 l5,6z M31,38 l5,-6 l5,6z" fill="#3b2108"/><path d="M18,45 q12,10 24,0 l-3,1 l-2,3 l-3,-2 l-3,3 l-3,-3 l-3,2 l-2,-3z" fill="#3b2108"/>`,
  // 落ち葉の山
  autumn: `<g transform="translate(18 50) rotate(-20)"><path d="${mapleLeafPath(11)}" fill="#e8742a" stroke="#b5561c" stroke-width=".8"/></g>
<g transform="translate(40 50) rotate(25)"><path d="${mapleLeafPath(11)}" fill="#e9a23b" stroke="#b97c22" stroke-width=".8"/></g>
<g transform="translate(29 44) rotate(5)"><path d="${mapleLeafPath(12)}" fill="#d9452b" stroke="#a8321d" stroke-width=".8"/></g>`,
};
