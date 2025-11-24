
import { create } from 'zustand';
import { ComponentInstance, WireSegment, ToolMode, Point, EditorStateSnapshot, ComponentDefinition, SnapTarget } from './types';
import { COMPONENT_LIBRARY, GRID_SIZE } from './constants';
import { v4 as uuidv4 } from 'uuid';

interface EditorStore {
  scale: number;
  position: Point;
  components: ComponentInstance[];
  wires: WireSegment[];
  selectedIds: string[];
  toolMode: ToolMode;
  activeLibraryId: string | null;
  drawingWire: WireSegment | null;
  draggingSegment: {
    wireId: string;
    index: number;
    isHorizontal: boolean;
    startPos: Point;
    originalLineConstant: number; 
  } | null;
  history: {
    past: EditorStateSnapshot[];
    future: EditorStateSnapshot[];
  };
  clipboard: ComponentInstance[];
  selectionBox: { start: Point; current: Point } | null;
  draggingWireEnd: {
      wireId: string;
      pointIndex: number; 
  } | null;

  // Logic Helpers
  getSnapTarget: (pos: Point) => SnapTarget;

  // Actions
  setToolMode: (mode: ToolMode) => void;
  setScale: (scale: number) => void;
  setPosition: (pos: Point) => void;
  
  setPlacementMode: (type: string) => void;
  placeComponent: (pos: Point) => void;
  handleComponentDragStart: (id: string) => void; // For Auto-Wiring
  updateComponent: (id: string, updates: Partial<ComponentInstance>) => void;
  deleteSelection: () => void;
  selectItem: (id: string | null, multi?: boolean) => void;
  setSelectionBox: (box: { start: Point; current: Point } | null) => void;
  rotateSelection: () => void;
  mirrorSelection: (axis: 'H' | 'V') => void;
  
  startWire: (pos: Point) => void;
  updateDrawingWire: (pos: Point) => void;
  addWirePoint: (pos: Point) => void;
  finishWire: () => void;
  cancelWire: () => void;
  
  startWireEndDrag: (wireId: string, index: number) => void;
  updateWireEndDrag: (pos: Point) => void;
  endWireEndDrag: () => void;

  startSegmentDrag: (wireId: string, index: number, pos: Point) => void;
  updateSegmentDrag: (pos: Point) => void;
  endSegmentDrag: () => void;

  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;

  pushHistory: () => void;
}

const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

// --- GEOMETRY HELPERS ---

export const getPinAbsolutePosition = (comp: ComponentInstance, pinId: string): Point => {
    const def = COMPONENT_LIBRARY[comp.type];
    if (!def) return { x: comp.x, y: comp.y };

    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return { x: comp.x, y: comp.y };

    const cx = def.width / 2;
    const cy = def.height / 2;
    const rad = (comp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const scaleX = comp.mirrored ? -1 : 1;

    const px = (pin.x - cx) * scaleX;
    const py = pin.y - cy;

    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;

    return {
        x: comp.x + cx + rx,
        y: comp.y + cy + ry
    };
};

// Check if point C is on segment A-B
const isPointOnSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean => {
    const minX = Math.min(x1, x2) - 1;
    const maxX = Math.max(x1, x2) + 1;
    const minY = Math.min(y1, y2) - 1;
    const maxY = Math.max(y1, y2) + 1;
    
    if (px < minX || px > maxX || py < minY || py > maxY) return false;
    return Math.abs((y2 - y1) * (px - x1) - (x2 - x1) * (py - y1)) < 1;
};

// --- STORE IMPLEMENTATION ---

export const useEditorStore = create<EditorStore>((set, get) => ({
  scale: 1,
  position: { x: 0, y: 0 },
  components: [],
  wires: [],
  selectedIds: [],
  toolMode: 'select',
  activeLibraryId: null,
  drawingWire: null,
  draggingSegment: null,
  selectionBox: null,
  draggingWireEnd: null,
  history: { past: [], future: [] },
  clipboard: [],

  pushHistory: () => {
    set((state) => {
      const snapshot: EditorStateSnapshot = { components: state.components, wires: state.wires };
      return { history: { past: [...state.history.past, snapshot].slice(-20), future: [] } };
    });
  },

  // --- SMART SNAPPING ---
  getSnapTarget: (pos: Point): SnapTarget => {
      const { components, wires } = get();
      const SNAP_DIST = 10;
      
      // 1. Check Pins (Highest Priority)
      for(const comp of components) {
          const def = COMPONENT_LIBRARY[comp.type];
          for(const pin of def.pins) {
              const absPos = getPinAbsolutePosition(comp, pin.id);
              if (Math.abs(pos.x - absPos.x) < SNAP_DIST && Math.abs(pos.y - absPos.y) < SNAP_DIST) {
                  return { type: 'pin', x: absPos.x, y: absPos.y, targetId: comp.id, subId: pin.id };
              }
          }
      }

      // 2. Check Junctions / Wire Endpoints
      for(const wire of wires) {
          // Start
          if (Math.abs(pos.x - wire.points[0]) < SNAP_DIST && Math.abs(pos.y - wire.points[1]) < SNAP_DIST) {
               return { type: 'junction', x: wire.points[0], y: wire.points[1], targetId: wire.id, subId: 'start' };
          }
          // End
          const len = wire.points.length;
          if (Math.abs(pos.x - wire.points[len-2]) < SNAP_DIST && Math.abs(pos.y - wire.points[len-1]) < SNAP_DIST) {
               return { type: 'junction', x: wire.points[len-2], y: wire.points[len-1], targetId: wire.id, subId: 'end' };
          }
      }

      // 3. Check Wire Segments
      for(const wire of wires) {
          for(let i=0; i<wire.points.length-2; i+=2) {
              const x1 = wire.points[i], y1 = wire.points[i+1];
              const x2 = wire.points[i+2], y2 = wire.points[i+3];
              
              // Project point to segment
              let projX = pos.x, projY = pos.y;
              if (Math.abs(x1 - x2) < 1) { // Vertical
                  projX = x1;
                  projY = Math.max(Math.min(y1, y2), Math.min(Math.max(y1, y2), pos.y));
              } else { // Horizontal
                  projY = y1;
                  projX = Math.max(Math.min(x1, x2), Math.min(Math.max(x1, x2), pos.x));
              }

              if (Math.abs(pos.x - projX) < SNAP_DIST && Math.abs(pos.y - projY) < SNAP_DIST) {
                  return { type: 'wire', x: projX, y: projY, targetId: wire.id };
              }
          }
      }

      // 4. Default Grid
      return { type: 'grid', x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
  },

  setToolMode: (mode) => set({ toolMode: mode, selectedIds: [], activeLibraryId: null, drawingWire: null, draggingSegment: null, selectionBox: null }),
  setScale: (scale) => set({ scale }),
  setPosition: (position) => set({ position }),

  setPlacementMode: (type) => set({ toolMode: 'place', activeLibraryId: type, selectedIds: [] }),

  placeComponent: (pos) => {
    const { activeLibraryId, pushHistory, getSnapTarget } = get();
    if (!activeLibraryId) return;
    pushHistory();
    const snap = getSnapTarget(pos);
    const def = COMPONENT_LIBRARY[activeLibraryId];
    
    // Center logic adjustment: Place such that first pin is on 'snap' if possible, or center.
    // For simplicity, snapping component origin (usually top-left) or center.
    // Let's rely on standard grid snap for origin, but maybe offset so pin 1 hits grid.
    
    // Calculate offset to align Pin 1 to (0,0) local
    const pin1 = def.pins[0];
    const offsetX = pin1 ? pin1.x : 0;
    const offsetY = pin1 ? pin1.y : 0;
    // But data.x/y is usually bounding box top left.
    // Let's place it such that Pin 1 is at `snap`.
    
    // Component X/Y = Snap X/Y - PinOffset (rotated?)
    // Default rotation 0.
    // Pin 1 offset from TopLeft is just pin1.x, pin1.y
    
    // Adjust logic to align center? 
    // Standard EDA: Align center, then snap pins to grid.
    
    const newComp: ComponentInstance = {
      id: uuidv4(),
      type: activeLibraryId,
      x: snap.x - (def.width/2),
      y: snap.y - (def.height/2),
      rotation: 0,
      mirrored: false,
      properties: { ...def.defaultProperties },
    };
    
    // Snap to grid
    newComp.x = Math.round(newComp.x / GRID_SIZE) * GRID_SIZE;
    newComp.y = Math.round(newComp.y / GRID_SIZE) * GRID_SIZE;

    set((state) => ({ components: [...state.components, newComp] }));
  },

  // --- AUTO-WIRING (ABUTMENT) ---
  handleComponentDragStart: (id) => {
      const state = get();
      const comp = state.components.find(c => c.id === id);
      if (!comp) return;

      const def = COMPONENT_LIBRARY[comp.type];
      const newWires: WireSegment[] = [...state.wires];
      let addedWire = false;

      // Check for Abutment (Pin on Pin/Wire)
      def.pins.forEach(pin => {
          const absPos = getPinAbsolutePosition(comp, pin.id);
          const snap = state.getSnapTarget(absPos);
          
          // If Pin is touching something NOT part of itself
          if ((snap.type === 'pin' && snap.targetId !== id) || snap.type === 'junction' || snap.type === 'wire') {
              // Create a Zero-Length wire (or effectively 0 length visually)
              // But logically it connects the external point to the component pin.
              // As the component moves, this wire will stretch.
              const newWire: WireSegment = {
                  id: uuidv4(),
                  points: [snap.x, snap.y, snap.x, snap.y]
              };
              newWires.push(newWire);
              addedWire = true;
          }
      });
      
      if (addedWire) {
          set({ wires: newWires });
      }
  },

  updateComponent: (id, updates) => {
    const state = get();
    const comp = state.components.find(c => c.id === id);
    if (!comp) return;

    // 1. Get Old Pin Positions
    const def = COMPONENT_LIBRARY[comp.type];
    const oldPinPos: Record<string, Point> = {};
    def.pins.forEach(p => { oldPinPos[p.id] = getPinAbsolutePosition(comp, p.id); });

    // 2. Apply Updates
    const newComponents = state.components.map(c => c.id === id ? { ...c, ...updates } : c);
    const newComp = newComponents.find(c => c.id === id)!;

    // 3. Orthogonal Rubber-banding
    let newWires = [...state.wires];

    def.pins.forEach(p => {
        const oldPos = oldPinPos[p.id];
        const newPos = getPinAbsolutePosition(newComp, p.id);
        
        if (Math.abs(oldPos.x - newPos.x) < 0.1 && Math.abs(oldPos.y - newPos.y) < 0.1) return;

        newWires = newWires.map(w => {
            // Check Start
            const startMatch = Math.abs(w.points[0] - oldPos.x) < 1 && Math.abs(w.points[1] - oldPos.y) < 1;
            // Check End
            const len = w.points.length;
            const endMatch = Math.abs(w.points[len-2] - oldPos.x) < 1 && Math.abs(w.points[len-1] - oldPos.y) < 1;
            
            if (!startMatch && !endMatch) return w;
            // If wire is selected, it moves rigidly (handled by multi-selection usually)
            if (state.selectedIds.includes(w.id)) return w; 

            let newPoints = [...w.points];
            if (startMatch) newPoints = rerouteWire(newPoints, true, oldPos, newPos);
            if (endMatch) newPoints = rerouteWire(newPoints, false, oldPos, newPos);
            
            return { ...w, points: newPoints };
        });
    });

    set({ components: newComponents, wires: newWires });
  },

  selectItem: (id, multi = false) => {
    set((state) => {
      if (!id) return { selectedIds: [] };
      if (multi) {
         return state.selectedIds.includes(id) 
            ? { selectedIds: state.selectedIds.filter(i => i !== id) }
            : { selectedIds: [...state.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },
  
  setSelectionBox: (box) => {
    set({ selectionBox: box });
    if (box) {
        const { start, current } = box;
        const x1 = Math.min(start.x, current.x), y1 = Math.min(start.y, current.y);
        const x2 = Math.max(start.x, current.x), y2 = Math.max(start.y, current.y);
        const selectedIds: string[] = [];
        get().components.forEach(c => {
            const def = COMPONENT_LIBRARY[c.type];
            if ((c.x + def.width/2) >= x1 && (c.x + def.width/2) <= x2 && (c.y + def.height/2) >= y1 && (c.y + def.height/2) <= y2) {
                selectedIds.push(c.id);
            }
        });
        get().wires.forEach(w => {
             // Simple bounding box check for wire
             const wx = w.points.filter((_,i) => i%2===0);
             const wy = w.points.filter((_,i) => i%2===1);
             const minWx = Math.min(...wx), maxWx = Math.max(...wx);
             const minWy = Math.min(...wy), maxWy = Math.max(...wy);
             if (minWx >= x1 && maxWx <= x2 && minWy >= y1 && maxWy <= y2) selectedIds.push(w.id);
        });
        set({ selectedIds });
    }
  },

  rotateSelection: () => {
    get().pushHistory();
    const { selectedIds, updateComponent } = get();
    selectedIds.forEach(id => {
       const comp = get().components.find(c => c.id === id);
       if (comp) {
           updateComponent(id, { rotation: (comp.rotation + 90) % 360 });
       }
    });
  },

  mirrorSelection: (axis) => {
    get().pushHistory();
    const { selectedIds, updateComponent } = get();
    selectedIds.forEach(id => {
       const comp = get().components.find(c => c.id === id);
       if (comp) updateComponent(id, { mirrored: !comp.mirrored });
    });
  },

  deleteSelection: () => {
    get().pushHistory();
    set((state) => ({
      components: state.components.filter((c) => !state.selectedIds.includes(c.id)),
      wires: state.wires.filter((w) => !state.selectedIds.includes(w.id)),
      selectedIds: [],
    }));
  },

  // --- WIRING ---

  startWire: (pos) => {
    const snap = get().getSnapTarget(pos);
    const newWire: WireSegment = {
      id: uuidv4(),
      points: [snap.x, snap.y, snap.x, snap.y],
    };
    set({ drawingWire: newWire, toolMode: 'wire', selectedIds: [] });
  },

  updateDrawingWire: (pos) => {
    const { drawingWire, getSnapTarget } = get();
    if (!drawingWire || drawingWire.points.length < 4) return;
    
    // Orthogonal Lock Logic (L-Shape)
    const snap = getSnapTarget(pos);
    const lastX = drawingWire.points[drawingWire.points.length - 4];
    const lastY = drawingWire.points[drawingWire.points.length - 3];
    
    // Simple L-shape: either Horizontal->Vertical or Vertical->Horizontal
    // We choose based on delta magnitude
    const dx = Math.abs(snap.x - lastX);
    const dy = Math.abs(snap.y - lastY);
    
    // We are editing the last 2 points.
    // If we want a preview of L-shape, we need intermediate point.
    // But `drawingWire` structure in `startWire` is just 2 points initially.
    // To show L-shape, we need 3 points.
    
    // Dynamic array resizing for preview
    let newPoints = drawingWire.points.slice(0, -2); // Base points
    
    if (dx > 0 || dy > 0) {
        // Decide Corner
        // Prefer keeping initial direction?
        // Simple: Horizontal First if dx > dy
        if (dx > dy) {
            newPoints.push(snap.x, lastY); // Corner
            newPoints.push(snap.x, snap.y); // End
        } else {
            newPoints.push(lastX, snap.y); // Corner
            newPoints.push(snap.x, snap.y); // End
        }
    } else {
        newPoints.push(snap.x, snap.y);
    }
    
    // If we have too many points in preview, simplify?
    // Actually `drawingWire` points are committed. We are just moving the "Floating" end.
    // The "Floating" end might be a multi-segment tail.
    // For simplicity: `drawingWire` holds COMMITTED points + FLOATING tail.
    
    // Let's assume `addWirePoint` commits the corner. 
    // `updateDrawingWire` just updates the last segment(s) to reach cursor.
    // We always maintain [Committed..., Corner, Cursor].
    
    // If we only started, points=[start, start].
    // update -> [start, corner, cursor].
    
    // Reset to committed base
    // Use a separate field or assume last 2 points are transient?
    // Implementation: Assume `drawingWire` is fully transient beyond last click.
    // But `addWirePoint` is manual click.
    
    // Hack: If points length is even, we replace the last L-shape (last 2 points or 4 points?)
    // This is getting complex. Simplified Orthogonal:
    // Just lock X or Y.
    
    let nextX = snap.x;
    let nextY = snap.y;
    
    if (dx > dy) nextY = lastY; else nextX = lastX;
    
    // Just update tip
    const finalPts = drawingWire.points.slice(0, -2);
    finalPts.push(nextX, nextY);
    set({ drawingWire: { ...drawingWire, points: finalPts } });
  },

  addWirePoint: (pos) => {
      const { drawingWire } = get();
      if (!drawingWire) return;
      // Commit the current segment.
      // Current segment is just 2 points (last committed -> cursor).
      // If we want L-Shape, we need to commit the corner too?
      
      // Let's stick to simple 1-segment-at-a-time for manual drawing.
      // User clicks, line fixed.
      const lastX = drawingWire.points[drawingWire.points.length-2];
      const lastY = drawingWire.points[drawingWire.points.length-1];
      
      // Don't add if 0 length
      set({ drawingWire: { ...drawingWire, points: [...drawingWire.points, lastX, lastY] } });
  },

  finishWire: () => {
    const { drawingWire, wires, pushHistory } = get();
    if (drawingWire) {
      pushHistory();
      
      // 1. Canonicalize (Merge collinear, remove zero len)
      let finalPts = canonicalizeWires([drawingWire])[0].points;
      
      if (finalPts.length < 4) {
          set({ drawingWire: null, toolMode: 'select' });
          return;
      }
      
      // 2. Wire Splitting (T-Junction logic)
      // Check if start or end lies on existing wire
      let updatedWires = [...wires];
      const checkAndSplit = (px: number, py: number) => {
          // Find if (px, py) is on any existing wire segment (excluding endpoints)
          for (let i = 0; i < updatedWires.length; i++) {
              const w = updatedWires[i];
              let split = false;
              let newPts: number[] = [];
              
              for (let j = 0; j < w.points.length - 2; j += 2) {
                  const x1 = w.points[j], y1 = w.points[j+1];
                  const x2 = w.points[j+2], y2 = w.points[j+3];
                  
                  if (isPointOnSegment(px, py, x1, y1, x2, y2)) {
                      // Check if it IS an endpoint
                      if ((px === x1 && py === y1) || (px === x2 && py === y2)) continue;
                      
                      // Split!
                      // Segment (x1,y1)->(x2,y2) becomes (x1,y1)->(px,py)->(x2,y2)
                      // We insert (px, py) into the points array
                      newPts = [...w.points.slice(0, j+2), px, py, ...w.points.slice(j+2)];
                      split = true;
                      break;
                  }
              }
              
              if (split) {
                  updatedWires[i] = { ...w, points: newPts };
                  // Note: We don't break loop because points could overlap multiple wires (rare)
                  // But usually one.
                  return; 
              }
          }
      };

      checkAndSplit(finalPts[0], finalPts[1]); // Split at start
      checkAndSplit(finalPts[finalPts.length-2], finalPts[finalPts.length-1]); // Split at end

      updatedWires.push({ ...drawingWire, points: finalPts });
      
      // 3. Final Cleanup
      updatedWires = canonicalizeWires(updatedWires);

      set({
        wires: updatedWires,
        drawingWire: null,
        toolMode: 'select',
        selectedIds: []
      });
    }
  },

  cancelWire: () => set({ drawingWire: null, toolMode: 'select' }),

  // --- WIRE EDITING (SLIDING CONTACTS) ---
  
  startSegmentDrag: (wireId, index, pos) => {
      get().pushHistory();
      const w = get().wires.find(x => x.id === wireId);
      if(!w) return;
      const x1 = w.points[index], y1 = w.points[index+1];
      const x2 = w.points[index+2], y2 = w.points[index+3];
      const isHoriz = Math.abs(y1 - y2) < 0.1;
      
      set({ draggingSegment: { 
          wireId, index, isHorizontal: isHoriz, startPos: pos, 
          originalLineConstant: isHoriz ? y1 : x1 
      }});
  },

  updateSegmentDrag: (pos) => {
      const { draggingSegment, wires } = get();
      if (!draggingSegment) return;
      
      const mouseX = snapToGrid(pos.x);
      const mouseY = snapToGrid(pos.y);
      const { wireId, index, isHorizontal, originalLineConstant } = draggingSegment;
      
      const newVal = isHorizontal ? mouseY : mouseX;
      if (newVal === originalLineConstant) return; // No change
      
      const updatedWires = wires.map(w => {
          // 1. The dragged wire
          if (w.id === wireId) {
              const pts = [...w.points];
              if (isHorizontal) { pts[index+1] = newVal; pts[index+3] = newVal; }
              else { pts[index] = newVal; pts[index+2] = newVal; }
              return { ...w, points: pts };
          }
          
          // 2. Sliding Contacts (Attached Wires)
          // Any endpoint that was touching the ORIGINAL segment must move.
          const pts = [...w.points];
          let modified = false;
          
          // Helper: Check if point (px,py) matches original segment line
          const checkAndMove = (idx: number) => {
              const px = pts[idx], py = pts[idx+1];
              // Original segment bounds (from store/drag state? No, we need original bounds)
              // We can infer bounds from current drag?
              // The other wire endpoints are ALREADY at the old location? No, they are static until moved.
              // We check if (px,py) lies on the infinite line of the original segment?
              // AND if it is "connected".
              // To be safe: Check if (px, py) lies on the segment defined by draggingSegment BEFORE move.
              // But draggingSegment doesn't store length.
              // Let's assume connectivity was established.
              
              if (isHorizontal) {
                  if (Math.abs(py - originalLineConstant) < 1) { // Same Y
                      // Is it within X bounds of the dragged segment?
                      // We need current X bounds of the dragged segment.
                      const draggedW = wires.find(x => x.id === wireId)!;
                      const minX = Math.min(draggedW.points[index], draggedW.points[index+2]);
                      const maxX = Math.max(draggedW.points[index], draggedW.points[index+2]);
                      if (px >= minX && px <= maxX) {
                          pts[idx+1] = newVal; // Slide Y
                          modified = true;
                      }
                  }
              } else {
                  if (Math.abs(px - originalLineConstant) < 1) {
                      const draggedW = wires.find(x => x.id === wireId)!;
                      const minY = Math.min(draggedW.points[index+1], draggedW.points[index+3]);
                      const maxY = Math.max(draggedW.points[index+1], draggedW.points[index+3]);
                      if (py >= minY && py <= maxY) {
                          pts[idx] = newVal; // Slide X
                          modified = true;
                      }
                  }
              }
          };

          checkAndMove(0); // Start
          checkAndMove(pts.length - 2); // End
          
          return modified ? { ...w, points: pts } : w;
      });

      set({ wires: updatedWires });
  },

  endSegmentDrag: () => {
      // Canonicalize after drag
      const { wires } = get();
      set({ wires: canonicalizeWires(wires), draggingSegment: null });
  },

  startWireEndDrag: (wireId, index) => {
      get().pushHistory();
      set({ draggingWireEnd: { wireId, pointIndex: index } });
  },

  updateWireEndDrag: (pos) => {
      const { draggingWireEnd, wires } = get();
      if (!draggingWireEnd) return;
      
      const snap = get().getSnapTarget(pos);
      const newWires = wires.map(w => {
          if (w.id !== draggingWireEnd.wireId) return w;
          const pts = [...w.points];
          const idx = draggingWireEnd.pointIndex;
          pts[idx] = snap.x;
          pts[idx+1] = snap.y;
          // Note: This creates diagonal lines. 
          // Rerouting logic can be added here or in 'end'.
          return { ...w, points: pts };
      });
      set({ wires: newWires });
  },

  endWireEndDrag: () => {
      const { wires, draggingWireEnd } = get();
      if (draggingWireEnd) {
          // Normalize diagonal to L-Shape
          const w = wires.find(x => x.id === draggingWireEnd.wireId);
          if (w) {
              const newPoints = normalizeWire(w.points);
              const newWires = wires.map(x => x.id === w.id ? { ...x, points: newPoints } : x);
              set({ wires: canonicalizeWires(newWires), draggingWireEnd: null });
          } else {
              set({ draggingWireEnd: null });
          }
      }
  },

  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return {};
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      return {
        components: previous.components,
        wires: previous.wires,
        history: { past: newPast, future: [{ components: state.components, wires: state.wires }, ...state.history.future] }
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return {};
      const next = state.history.future[0];
      return {
        components: next.components,
        wires: next.wires,
        history: { past: [...state.history.past, { components: state.components, wires: state.wires }], future: state.history.future.slice(1) }
      };
    });
  },

  copy: () => {
      const state = get();
      const comps = state.components.filter(c => state.selectedIds.includes(c.id));
      if (comps.length) set({ clipboard: comps });
  },

  paste: () => {
      const { clipboard, pushHistory, components, selectedIds } = get();
      if (!clipboard.length) return;
      pushHistory();
      const newComps = clipboard.map(c => ({ ...c, id: uuidv4(), x: c.x + GRID_SIZE, y: c.y + GRID_SIZE }));
      set({ components: [...components, ...newComps], selectedIds: newComps.map(c => c.id) });
  }
}));

// --- TOPOLOGY HELPERS ---

function rerouteWire(points: number[], start: boolean, oldPos: Point, newPos: Point): number[] {
    const dx = newPos.x - oldPos.x;
    const dy = newPos.y - oldPos.y;
    
    // Simple L-Shape Insertion
    // If moving Start: Insert 2 points at Start
    if (start) {
        // [NewPos, Corner, P2...]
        // Horizontal First
        return [newPos.x, newPos.y, points[2], newPos.y, points[2], points[3], ...points.slice(4)];
    } else {
        const len = points.length;
        // [...Prev, Corner, NewPos]
        const px = points[len-4], py = points[len-3];
        return [...points.slice(0, len-2), px, newPos.y, newPos.x, newPos.y];
    }
}

function normalizeWire(points: number[]): number[] {
    // Insert corners for diagonals
    let newPts: number[] = [points[0], points[1]];
    for(let i=2; i<points.length; i+=2) {
        const x = points[i], y = points[i+1];
        const lx = newPts[newPts.length-2], ly = newPts[newPts.length-1];
        if (x !== lx && y !== ly) {
            newPts.push(x, ly); // H then V
        }
        newPts.push(x, y);
    }
    return newPts;
}

function canonicalizeWires(wires: WireSegment[]): WireSegment[] {
    // 1. Merge Collinear & Remove Zero Length WITHIN wires
    let cleanWires = wires.map(w => ({ ...w, points: mergeCollinearSegments(w.points) }));
    
    // 2. Remove wires with < 2 points (should happen inside merge) or start==end
    cleanWires = cleanWires.filter(w => w.points.length >= 4);
    
    // 3. Merge Overlapping Wires? (Advanced)
    // For now, internal collinear merge is sufficient for "Self-Healing" of individual nets.
    return cleanWires;
}

function mergeCollinearSegments(points: number[]): number[] {
    if (points.length < 4) return points;
    let changed = true;
    let current = points;
    
    while(changed) {
        changed = false;
        const next: number[] = [current[0], current[1]];
        for (let i = 2; i < current.length; i += 2) {
            const x = current[i], y = current[i+1];
            const lx = next[next.length - 2], ly = next[next.length - 1];
            
            if (x === lx && y === ly) { changed = true; continue; } // Zero len
            
            if (next.length >= 4) {
                const px = next[next.length - 4], py = next[next.length - 3];
                // Collinear H or V
                if ((py === ly && ly === y) || (px === lx && lx === x)) {
                    next[next.length - 2] = x;
                    next[next.length - 1] = y;
                    changed = true;
                    continue;
                }
            }
            next.push(x, y);
        }
        current = next;
    }
    return current;
}
