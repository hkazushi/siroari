import type { AnyElement } from "@/types";
import { nanoid } from "nanoid";

/**
 * 建物テンプレ — 一から描かなくていいスタートポイント。
 * 単位は mm（ストアのワールド座標と同じ）。
 */
export type BuildingTemplate = {
  id: string;
  name: string;
  description: string;
  category: "住宅" | "店舗" | "オフィス" | "倉庫" | "その他";
  buildElements: () => AnyElement[];
};

function room(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: string,
): AnyElement {
  return {
    id: nanoid(8),
    type: "room",
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    label,
    color,
    showArea: true,
  };
}

function wall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): AnyElement {
  return {
    id: nanoid(8),
    type: "wall",
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 120,
  };
}

export const BUILDING_TEMPLATES: BuildingTemplate[] = [
  {
    id: "house-2ldk",
    name: "一般住宅 2LDK",
    description: "玄関・LDK・寝室・洋室・水回り",
    category: "住宅",
    buildElements: () => [
      room(0, 0, 5460, 3640, "LDK", "#fef3c7"),
      room(5460, 0, 3640, 3640, "寝室", "#dbeafe"),
      room(0, 3640, 2730, 2730, "洋室", "#e0e7ff"),
      room(2730, 3640, 1820, 2730, "浴室", "#cffafe"),
      room(4550, 3640, 1820, 1820, "脱衣所", "#f1f5f9"),
      room(4550, 5460, 1820, 910, "トイレ", "#f1f5f9"),
      room(6370, 3640, 2730, 2730, "玄関・廊下", "#f8fafc"),
      // 外周壁
      wall(0, 0, 9100, 0),
      wall(9100, 0, 9100, 6370),
      wall(9100, 6370, 0, 6370),
      wall(0, 6370, 0, 0),
    ],
  },
  {
    id: "shop-restaurant",
    name: "飲食店（小規模）",
    description: "客席・厨房・バックヤード・トイレ",
    category: "店舗",
    buildElements: () => [
      room(0, 0, 7280, 5460, "客席フロア", "#dcfce7"),
      room(7280, 0, 3640, 3640, "厨房", "#fef3c7"),
      room(7280, 3640, 1820, 1820, "バックヤード", "#dbeafe"),
      room(9100, 3640, 1820, 910, "トイレ", "#f1f5f9"),
      room(9100, 4550, 1820, 910, "更衣室", "#e0e7ff"),
      wall(0, 0, 10920, 0),
      wall(10920, 0, 10920, 5460),
      wall(10920, 5460, 0, 5460),
      wall(0, 5460, 0, 0),
    ],
  },
  {
    id: "office-small",
    name: "オフィス（小規模）",
    description: "執務室・会議室・給湯室・トイレ",
    category: "オフィス",
    buildElements: () => [
      room(0, 0, 7280, 4550, "執務室", "#f8fafc"),
      room(7280, 0, 2730, 2730, "会議室", "#dbeafe"),
      room(7280, 2730, 2730, 1820, "給湯室", "#fef3c7"),
      room(0, 4550, 4550, 1820, "受付・廊下", "#f1f5f9"),
      room(4550, 4550, 2730, 1820, "応接室", "#e0e7ff"),
      room(7280, 4550, 2730, 910, "トイレ", "#f1f5f9"),
      room(7280, 5460, 2730, 910, "倉庫", "#fef9c3"),
      wall(0, 0, 10010, 0),
      wall(10010, 0, 10010, 6370),
      wall(10010, 6370, 0, 6370),
      wall(0, 6370, 0, 0),
    ],
  },
  {
    id: "warehouse",
    name: "倉庫",
    description: "保管エリア + 事務所",
    category: "倉庫",
    buildElements: () => [
      room(0, 0, 12740, 9100, "保管エリア", "#f8fafc"),
      room(12740, 0, 3640, 4550, "事務所", "#dbeafe"),
      room(12740, 4550, 3640, 2730, "更衣室", "#e0e7ff"),
      room(12740, 7280, 3640, 1820, "トイレ", "#f1f5f9"),
      wall(0, 0, 16380, 0),
      wall(16380, 0, 16380, 9100),
      wall(16380, 9100, 0, 9100),
      wall(0, 9100, 0, 0),
    ],
  },
  {
    id: "blank-grid-only",
    name: "白紙（グリッドのみ）",
    description: "ゼロから描き始める",
    category: "その他",
    buildElements: () => [],
  },
];
