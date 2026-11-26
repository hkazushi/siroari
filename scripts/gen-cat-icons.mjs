// サビ猫キャラのアイコンを生成する: node scripts/gen-cat-icons.mjs
// （src/lib/catArt.ts を変更したら実行。rsvg-convert が必要: brew install librsvg）
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { catHeadSvg, catIconSvg, catLayerSvgs, catSittingInner } from "../src/lib/catArt.ts";

const out = (p, s) => writeFileSync(new URL(`../public/${p}`, import.meta.url), s);
out("cat-icon.svg", catIconSvg(512));
out("cat-head.svg", catHeadSvg());
out(
  "cat-sitting.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">${catSittingInner("sit")}</svg>`,
);
// 画面用レイヤー（Cat.tsx の CatSitting が重ねて使う）
const layers = catLayerSvgs();
out("cat-layer-tail.svg", layers.tail);
out("cat-layer-body.svg", layers.body);
out("cat-layer-head.svg", layers.head);
for (const [name, size] of [["cat-icon-192.png", 192], ["cat-icon-512.png", 512], ["apple-touch-icon.png", 180], ["favicon-32.png", 32]]) {
  execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", `public/${name}`, "public/cat-icon.svg"]);
}
console.log("ok");
