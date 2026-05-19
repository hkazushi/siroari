import type { StampType } from "@/types";

export type StampCategory =
  | "害虫"
  | "害獣"
  | "害鳥"
  | "施工"
  | "建具"
  | "水回り"
  | "家具"
  | "家電"
  | "その他";

export type StampDef = {
  type: StampType;
  label: string;
  category: StampCategory;
  /** AI が認識するための同義語・別名 */
  aliases?: string[];
  defaultWidth: number; // mm
  defaultHeight: number; // mm
};

export const STAMP_LIBRARY: StampDef[] = [
  // ============ 害虫（昆虫・節足動物）============
  { type: "pestRoach", label: "ゴキブリ", category: "害虫", aliases: ["G", "ごき", "チャバネ", "クロゴキブリ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestAnt", label: "アリ", category: "害虫", aliases: ["蟻", "クロアリ", "ヒアリ", "アルゼンチンアリ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestTermite", label: "シロアリ", category: "害虫", aliases: ["白蟻", "termite"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestFly", label: "ハエ", category: "害虫", aliases: ["蝿", "fly"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestMosquito", label: "蚊", category: "害虫", aliases: ["か", "mosquito", "ヒトスジシマカ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestBee", label: "ハチ", category: "害虫", aliases: ["蜂", "スズメバチ", "アシナガバチ", "ミツバチ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestSpider", label: "クモ", category: "害虫", aliases: ["蜘蛛", "セアカゴケグモ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestCentipede", label: "ムカデ", category: "害虫", aliases: ["百足"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestMillipede", label: "ヤスデ", category: "害虫", aliases: ["馬陸"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestHouseCentipede", label: "ゲジゲジ", category: "害虫", aliases: ["蚰蜒"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestBedbug", label: "トコジラミ", category: "害虫", aliases: ["南京虫", "ナンキンムシ", "bedbug"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestMite", label: "ダニ", category: "害虫", aliases: ["壁蝨", "ヒョウヒダニ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestFlea", label: "ノミ", category: "害虫", aliases: ["蚤", "flea"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestSilverfish", label: "シミ", category: "害虫", aliases: ["紙魚", "silverfish"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestStinkbug", label: "カメムシ", category: "害虫", aliases: ["亀虫"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestMoth", label: "ガ", category: "害虫", aliases: ["蛾", "イガ", "moth"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestDrainFly", label: "チョウバエ", category: "害虫", aliases: ["蝶蝿"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestEarwig", label: "ハサミムシ", category: "害虫", aliases: ["鋏虫"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestWeevil", label: "コクゾウ", category: "害虫", aliases: ["穀象", "コクゾウムシ", "weevil"], defaultWidth: 500, defaultHeight: 500 },

  // ============ 害獣（哺乳類・爬虫類）============
  { type: "pestRodent", label: "ネズミ", category: "害獣", aliases: ["鼠"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestRat", label: "ドブネズミ", category: "害獣", aliases: ["土鼠", "ラット"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestMouse", label: "ハツカネズミ", category: "害獣", aliases: ["二十日鼠", "マウス"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestWeasel", label: "イタチ", category: "害獣", aliases: ["鼬", "weasel"], defaultWidth: 600, defaultHeight: 500 },
  { type: "pestCivet", label: "ハクビシン", category: "害獣", aliases: ["白鼻芯"], defaultWidth: 600, defaultHeight: 500 },
  { type: "pestRaccoon", label: "アライグマ", category: "害獣", aliases: ["洗熊", "raccoon"], defaultWidth: 700, defaultHeight: 500 },
  { type: "pestRaccoonDog", label: "タヌキ", category: "害獣", aliases: ["狸"], defaultWidth: 700, defaultHeight: 500 },
  { type: "pestBat", label: "コウモリ", category: "害獣", aliases: ["蝙蝠", "bat"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestSnake", label: "ヘビ", category: "害獣", aliases: ["蛇", "snake", "マムシ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestStrayCat", label: "野良猫", category: "害獣", aliases: ["猫", "stray cat"], defaultWidth: 500, defaultHeight: 500 },

  // ============ 害鳥 ============
  { type: "pestPigeon", label: "ハト", category: "害鳥", aliases: ["鳩", "pigeon"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestSparrow", label: "スズメ", category: "害鳥", aliases: ["雀", "sparrow"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestCrow", label: "カラス", category: "害鳥", aliases: ["烏", "crow"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestStarling", label: "ムクドリ", category: "害鳥", aliases: ["椋鳥"], defaultWidth: 500, defaultHeight: 500 },
  { type: "pestSwallow", label: "ツバメ", category: "害鳥", aliases: ["燕", "swallow"], defaultWidth: 500, defaultHeight: 500 },

  // ============ 施工 ============
  { type: "baitStation", label: "毒餌", category: "施工", aliases: ["ベイト", "餌剤"], defaultWidth: 400, defaultHeight: 400 },
  { type: "trapMouse", label: "捕獲器", category: "施工", aliases: ["カゴ罠", "ねずみ捕り"], defaultWidth: 400, defaultHeight: 400 },
  { type: "trapGlue", label: "粘着シート", category: "施工", aliases: ["粘着トラップ", "シート"], defaultWidth: 400, defaultHeight: 400 },
  { type: "sprayZone", label: "薬剤散布", category: "施工", aliases: ["薬剤", "散布範囲"], defaultWidth: 1200, defaultHeight: 1200 },
  { type: "entryPoint", label: "侵入経路", category: "施工", aliases: ["侵入口", "穴"], defaultWidth: 500, defaultHeight: 500 },
  { type: "crack", label: "クラック", category: "施工", aliases: ["ひび", "亀裂"], defaultWidth: 600, defaultHeight: 100 },
  { type: "nest", label: "巣・営巣", category: "施工", aliases: ["巣", "コロニー"], defaultWidth: 600, defaultHeight: 600 },
  { type: "moisture", label: "水濡れ", category: "施工", aliases: ["湿気", "水漏れ"], defaultWidth: 500, defaultHeight: 500 },
  { type: "fumigation", label: "燻煙処理", category: "施工", aliases: ["燻蒸", "ヒューミネーション"], defaultWidth: 1500, defaultHeight: 1500 },
  { type: "uvTrap", label: "UV 捕虫器", category: "施工", aliases: ["UV", "誘虫灯"], defaultWidth: 500, defaultHeight: 500 },
  { type: "ultrasonic", label: "超音波装置", category: "施工", aliases: ["超音波", "忌避装置"], defaultWidth: 500, defaultHeight: 500 },

  // ============ 建具 ============
  { type: "door", label: "ドア", category: "建具", defaultWidth: 800, defaultHeight: 50 },
  { type: "doorSliding", label: "引き戸", category: "建具", defaultWidth: 1700, defaultHeight: 50 },
  { type: "window", label: "窓", category: "建具", defaultWidth: 1700, defaultHeight: 50 },
  { type: "stairs", label: "階段", category: "建具", defaultWidth: 900, defaultHeight: 2700 },
  // ============ 水回り ============
  { type: "toilet", label: "トイレ", category: "水回り", defaultWidth: 450, defaultHeight: 700 },
  { type: "bath", label: "浴槽", category: "水回り", defaultWidth: 1600, defaultHeight: 800 },
  { type: "sink", label: "洗面台", category: "水回り", defaultWidth: 750, defaultHeight: 500 },
  { type: "kitchen", label: "キッチン", category: "水回り", defaultWidth: 2550, defaultHeight: 650 },
  { type: "washer", label: "洗濯機", category: "水回り", defaultWidth: 650, defaultHeight: 650 },
  // ============ 家具 ============
  { type: "bed", label: "ベッドS", category: "家具", defaultWidth: 1000, defaultHeight: 2000 },
  { type: "bedDouble", label: "ベッドD", category: "家具", defaultWidth: 1400, defaultHeight: 2000 },
  { type: "sofa", label: "ソファ", category: "家具", defaultWidth: 1800, defaultHeight: 850 },
  { type: "table", label: "テーブル", category: "家具", defaultWidth: 1400, defaultHeight: 800 },
  { type: "desk", label: "デスク", category: "家具", defaultWidth: 1200, defaultHeight: 600 },
  { type: "chair", label: "椅子", category: "家具", defaultWidth: 450, defaultHeight: 450 },
  { type: "closet", label: "クローゼット", category: "家具", defaultWidth: 1800, defaultHeight: 600 },
  // ============ 家電 ============
  { type: "tv", label: "TV", category: "家電", defaultWidth: 1200, defaultHeight: 300 },
  { type: "fridge", label: "冷蔵庫", category: "家電", defaultWidth: 700, defaultHeight: 700 },
];

export function stampDefOf(t: StampType): StampDef {
  return STAMP_LIBRARY.find((s) => s.type === t) ?? STAMP_LIBRARY[0];
}

/** 害虫系のスタンプ種別すべて（ヒートマップ用） */
export const PEST_STAMP_TYPES: StampType[] = STAMP_LIBRARY
  .filter((s) => s.category === "害虫" || s.category === "害獣" || s.category === "害鳥")
  .map((s) => s.type);

/** カテゴリの順序（StampLibrary 表示順） */
export const CATEGORY_ORDER: StampCategory[] = [
  "害虫",
  "害獣",
  "害鳥",
  "施工",
  "建具",
  "水回り",
  "家具",
  "家電",
  "その他",
];
