
export interface Point {
  x: number;
  y: number;
}

export interface PinDefinition {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export type ShapeType = 'line' | 'rect' | 'circle' | 'text';

export interface ShapeConfig {
  type: ShapeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  align?: string;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: string;
  width: number;
  height: number;
  pins: PinDefinition[];
  shapes: ShapeConfig[];
  defaultProperties: Record<string, string>;
  template: string; // SPICE template
}

export interface ComponentInstance {
  id: string;
  type: string; // Refers to ComponentDefinition.type
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  mirrored: boolean; // Horizontal mirror
  properties: Record<string, string>;
}

export interface WireSegment {
  id: string;
  points: number[]; // [x1, y1, x2, y2, ...] flattened
  netName?: string;
}

export type ToolMode = 'select' | 'wire' | 'pan' | 'place';

export interface EditorStateSnapshot {
  components: ComponentInstance[];
  wires: WireSegment[];
}

export type SnapType = 'pin' | 'wire' | 'grid' | 'junction';

export interface SnapTarget {
    type: SnapType;
    x: number;
    y: number;
    targetId?: string; // Component ID or Wire ID
    subId?: string; // Pin ID
}

export interface EditorState {
  scale: number;
  position: Point;
  components: ComponentInstance[];
  wires: WireSegment[];
  selectedIds: string[];
  toolMode: ToolMode;
  
  // Placement
  activeLibraryId: string | null; // Component type being placed
  
  // Wiring
  drawingWire: WireSegment | null; 
  
  // Wire Editing
  draggingSegment: {
    wireId: string;
    index: number; // Index in points array (start of segment)
    isHorizontal: boolean;
    startPos: Point; // Mouse pos when drag started
    originalLineConstant: number;
  } | null;

  // History
  history: {
    past: EditorStateSnapshot[];
    future: EditorStateSnapshot[];
  };
  
  // Clipboard
  clipboard: ComponentInstance[];

  gridSize: number;
  
  // Selection Box
  selectionBox: { start: Point; current: Point } | null;

  // Wire End Dragging
  draggingWireEnd: {
      wireId: string;
      pointIndex: number; 
  } | null;
}
