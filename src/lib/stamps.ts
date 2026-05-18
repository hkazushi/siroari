import type { StampType } from "@/types";

export type StampDef = {
  type: StampType;
  label: string;
  category: "害虫" | "施工" | "建具" | "水回り" | "家具" | "家電" | "その他";
  defaultWidth: number; // mm
  defaultHeight: number; // mm
};

export const STAMP_LIBRARY: StampDef[] = [
  // 害虫発見
  { type: "pestRoach", label: "ゴキブリ", category: "害虫", defaultWidth: 500, defaultHeight: 500 },
  { type: "pestAnt", label: "アリ", category: "害虫", defaultWidth: 500, defaultHeight: 500 },
  { type: "pestRodent", label: "ネズミ", category: "害虫", defaultWidth: 500, defaultHeight: 500 },
  { type: "pestTermite", label: "シロアリ", category: "害虫", defaultWidth: 500, defaultHeight: 500 },
  { type: "pestFly", label: "ハエ・蚊", category: "害虫", defaultWidth: 500, defaultHeight: 500 },
  // 施工
  { type: "baitStation", label: "毒餌", category: "施工", defaultWidth: 400, defaultHeight: 400 },
  { type: "trapMouse", label: "捕獲器", category: "施工", defaultWidth: 400, defaultHeight: 400 },
  { type: "trapGlue", label: "粘着シート", category: "施工", defaultWidth: 400, defaultHeight: 400 },
  { type: "sprayZone", label: "薬剤散布", category: "施工", defaultWidth: 1200, defaultHeight: 1200 },
  { type: "entryPoint", label: "侵入経路", category: "施工", defaultWidth: 500, defaultHeight: 500 },
  { type: "crack", label: "クラック", category: "施工", defaultWidth: 600, defaultHeight: 100 },
  { type: "nest", label: "巣・営巣", category: "施工", defaultWidth: 600, defaultHeight: 600 },
  { type: "moisture", label: "水濡れ", category: "施工", defaultWidth: 500, defaultHeight: 500 },
  // 建具
  { type: "door", label: "ドア", category: "建具", defaultWidth: 800, defaultHeight: 50 },
  { type: "doorSliding", label: "引き戸", category: "建具", defaultWidth: 1700, defaultHeight: 50 },
  { type: "window", label: "窓", category: "建具", defaultWidth: 1700, defaultHeight: 50 },
  { type: "stairs", label: "階段", category: "建具", defaultWidth: 900, defaultHeight: 2700 },
  // 水回り
  { type: "toilet", label: "トイレ", category: "水回り", defaultWidth: 450, defaultHeight: 700 },
  { type: "bath", label: "浴槽", category: "水回り", defaultWidth: 1600, defaultHeight: 800 },
  { type: "sink", label: "洗面台", category: "水回り", defaultWidth: 750, defaultHeight: 500 },
  { type: "kitchen", label: "キッチン", category: "水回り", defaultWidth: 2550, defaultHeight: 650 },
  { type: "washer", label: "洗濯機", category: "水回り", defaultWidth: 650, defaultHeight: 650 },
  // 家具
  { type: "bed", label: "ベッドS", category: "家具", defaultWidth: 1000, defaultHeight: 2000 },
  { type: "bedDouble", label: "ベッドD", category: "家具", defaultWidth: 1400, defaultHeight: 2000 },
  { type: "sofa", label: "ソファ", category: "家具", defaultWidth: 1800, defaultHeight: 850 },
  { type: "table", label: "テーブル", category: "家具", defaultWidth: 1400, defaultHeight: 800 },
  { type: "desk", label: "デスク", category: "家具", defaultWidth: 1200, defaultHeight: 600 },
  { type: "chair", label: "椅子", category: "家具", defaultWidth: 450, defaultHeight: 450 },
  { type: "closet", label: "クローゼット", category: "家具", defaultWidth: 1800, defaultHeight: 600 },
  // 家電
  { type: "tv", label: "TV", category: "家電", defaultWidth: 1200, defaultHeight: 300 },
  { type: "fridge", label: "冷蔵庫", category: "家電", defaultWidth: 700, defaultHeight: 700 },
];

export function stampDefOf(t: StampType): StampDef {
  return STAMP_LIBRARY.find((s) => s.type === t) ?? STAMP_LIBRARY[0];
}
