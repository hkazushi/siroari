export type Point = { x: number; y: number };

export type ElementBase = {
  id: string;
  locked?: boolean;
};

export type Wall = ElementBase & {
  type: "wall";
  start: Point;
  end: Point;
  thickness: number; // mm
};

export type Room = ElementBase & {
  type: "room";
  points: Point[]; // polygon vertices, mm
  label?: string;
  color: string;
  showArea: boolean;
};

export type StampType =
  | "door"
  | "doorSliding"
  | "window"
  | "stairs"
  | "bed"
  | "bedDouble"
  | "toilet"
  | "bath"
  | "sink"
  | "kitchen"
  | "table"
  | "sofa"
  | "desk"
  | "chair"
  | "tv"
  | "fridge"
  | "washer"
  | "closet"
  // Pest control specific
  | "pestRoach"
  | "pestAnt"
  | "pestRodent"
  | "pestTermite"
  | "pestFly"
  | "baitStation"
  | "trapMouse"
  | "trapGlue"
  | "sprayZone"
  | "entryPoint"
  | "crack"
  | "nest"
  | "moisture";

export type StampPhoto = {
  id: string;
  data: string; // base64 data URL
  caption?: string;
  takenAt: number;
};

export type Stamp = ElementBase & {
  type: "stamp";
  stampType: StampType;
  position: Point; // center, mm
  rotation: number; // deg
  width: number; // mm
  height: number; // mm
  note?: string; // 個別メモ
  photos?: StampPhoto[]; // この箇所の写真
};

export type TextLabel = ElementBase & {
  type: "text";
  position: Point;
  text: string;
  fontSize: number; // mm-equivalent
  rotation: number;
};

export type Dimension = ElementBase & {
  type: "dimension";
  start: Point;
  end: Point;
  offset: number; // perpendicular offset in mm
};

export type AnyElement = Wall | Room | Stamp | TextLabel | Dimension;

/** 薬剤使用記録（建築物衛生法・PRTR法対応） */
export type ChemicalUse = {
  id: string;
  name: string; // 薬剤名: フェノトリン、ピリプロキシフェン など
  activeIngredient?: string; // 有効成分
  amount: number; // 使用量
  unit: "ml" | "g" | "錠" | "枚";
  dilution?: string; // 希釈倍率: "200倍" / "1:50" など
  location?: string; // 使用箇所
  manufacturer?: string;
};

/** 顧客（個人または法人） */
export type Customer = {
  id: string;
  name: string;
  kana?: string;
  type: "residential" | "commercial"; // 個人住宅 / 法人・店舗
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contractType?: "spot" | "monthly" | "quarterly" | "annual";
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

/** 現場（顧客に紐づく物件単位） */
export type Site = {
  id: string;
  customerId: string;
  name: string; // ○○ビル 1F など
  address?: string;
  buildingType?: string; // 住宅 / 飲食店 / 倉庫 / オフィス / 病院 etc
  floorArea?: number; // ㎡
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Visit（旧 FloorPlan）。
 * 後方互換のため projects テーブルにそのまま保存される。
 * customerId / siteId は新フローで利用、未指定でもスタンドアロン保存可。
 */
export type Visit = {
  id: string;
  name: string;
  // 階層リンク（任意）
  customerId?: string;
  siteId?: string;
  visitNumber?: number; // 第何回施工
  visitDate?: number; // 施工日 timestamp
  nextVisitDate?: number; // 次回予定 timestamp
  // 担当者
  technicianName?: string;
  technicianLicense?: string;
  // マップ要素
  elements: AnyElement[];
  gridSize: number; // mm
  paperSize: { width: number; height: number }; // mm
  // 法令対応
  chemicals?: ChemicalUse[];
  // メモ
  generalNotes?: string;
  // 署名（base64 PNG）
  customerSignature?: string;
  technicianSignature?: string;
  // メタ
  createdAt: number;
  updatedAt: number;
};

/** 後方互換のため FloorPlan も残す（Visit のエイリアス） */
export type FloorPlan = Visit;

export type ToolType =
  | "select"
  | "pan"
  | "wall"
  | "room"
  | "stamp"
  | "text"
  | "dimension"
  | "eraser";

/** よく使う薬剤プリセット（業界一般的なもの） */
export type ChemicalPreset = {
  name: string;
  activeIngredient: string;
  unit: ChemicalUse["unit"];
  defaultDilution?: string;
  target: string; // 主な対象害虫
};
