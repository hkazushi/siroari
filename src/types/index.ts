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

export type Stamp = ElementBase & {
  type: "stamp";
  stampType: StampType;
  position: Point; // center, mm
  rotation: number; // deg
  width: number; // mm
  height: number; // mm
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

export type FloorPlan = {
  id: string;
  name: string;
  elements: AnyElement[];
  gridSize: number; // mm
  paperSize: { width: number; height: number }; // mm (drawable area)
  createdAt: number;
  updatedAt: number;
};

export type ToolType =
  | "select"
  | "pan"
  | "wall"
  | "room"
  | "stamp"
  | "text"
  | "dimension"
  | "eraser";
