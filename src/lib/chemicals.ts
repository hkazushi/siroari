import type { ChemicalPreset } from "@/types";

/**
 * 害虫駆除業界でよく使われる薬剤プリセット。
 * ※あくまで雛形。実運用では各社の在庫リストに置き換えてください。
 */
export const CHEMICAL_PRESETS: ChemicalPreset[] = [
  // 殺虫剤（一般）
  { name: "フェノトリン乳剤", activeIngredient: "フェノトリン", unit: "ml", defaultDilution: "200倍", target: "ゴキブリ・ハエ・蚊" },
  { name: "ペルメトリン乳剤", activeIngredient: "ペルメトリン", unit: "ml", defaultDilution: "100倍", target: "ゴキブリ・ダニ" },
  { name: "シフェノトリン", activeIngredient: "シフェノトリン", unit: "ml", defaultDilution: "100倍", target: "ハエ・蚊・ゴキブリ" },
  { name: "ピレスロイド系エアゾール", activeIngredient: "ピレスロイド", unit: "ml", target: "飛翔害虫全般" },
  // ベイト剤（餌剤）
  { name: "ホウ酸ベイト", activeIngredient: "ホウ酸", unit: "g", target: "ゴキブリ" },
  { name: "フィプロニルベイト", activeIngredient: "フィプロニル", unit: "g", target: "ゴキブリ" },
  { name: "ヒドラメチルノンベイト", activeIngredient: "ヒドラメチルノン", unit: "g", target: "ゴキブリ" },
  { name: "インドキサカルブベイト", activeIngredient: "インドキサカルブ", unit: "g", target: "ゴキブリ" },
  // 殺鼠剤
  { name: "ワルファリン製剤", activeIngredient: "ワルファリン", unit: "g", target: "ネズミ" },
  { name: "ジフェチアロール製剤", activeIngredient: "ジフェチアロール", unit: "g", target: "ネズミ" },
  // IGR（成長抑制）
  { name: "ピリプロキシフェン IGR", activeIngredient: "ピリプロキシフェン", unit: "ml", defaultDilution: "1000倍", target: "ゴキブリ幼虫・ハエ幼虫" },
  // シロアリ
  { name: "ビフェントリン土壌処理剤", activeIngredient: "ビフェントリン", unit: "ml", defaultDilution: "100倍", target: "シロアリ" },
  { name: "フィプロニル木部処理剤", activeIngredient: "フィプロニル", unit: "ml", target: "シロアリ・キクイムシ" },
  // 物理トラップ
  { name: "粘着シート（ゴキブリ）", activeIngredient: "—", unit: "枚", target: "ゴキブリ" },
  { name: "粘着シート（ネズミ）", activeIngredient: "—", unit: "枚", target: "ネズミ" },
  { name: "捕獲器（カゴ式）", activeIngredient: "—", unit: "枚", target: "ネズミ" },
  // 殺菌・防カビ
  { name: "防カビ剤", activeIngredient: "—", unit: "ml", target: "カビ" },
];

export const CHEMICAL_UNITS: Array<{ value: "ml" | "g" | "錠" | "枚"; label: string }> = [
  { value: "ml", label: "ml（液体）" },
  { value: "g", label: "g（粉剤・ベイト）" },
  { value: "錠", label: "錠（固形）" },
  { value: "枚", label: "枚（シート）" },
];
