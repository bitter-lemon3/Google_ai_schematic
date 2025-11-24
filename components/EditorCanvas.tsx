
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Group } from 'react-konva';
import { useEditorStore, getPinAbsolutePosition } from '../store';
import SchematicComponent from './SchematicComponent';
import SchematicWire from './SchematicWire';
import GridBackground from './GridBackground';
import { ComponentInstance } from '../types';
import { COMPONENT_LIBRARY, GRID_SIZE } from '../constants';
import Konva from 'konva';

const EditorCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const { 
    scale, position, components, wires, selectedIds, toolMode, drawingWire, activeLibraryId, draggingSegment, selectionBox, draggingWireEnd,
    setScale, setPosition, selectItem, setSelectionBox,
    startWire, updateDrawingWire, addWirePoint, finishWire, placeComponent, setPlacementMode,
    deleteSelection, rotateSelection, mirrorSelection, undo, redo, copy, paste,
    updateSegmentDrag, endSegmentDrag, cancelWire, updateWireEndDrag, endWireEndDrag, getSnapTarget
  } = useEditorStore();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'Delete') deleteSelection();
        if (e.key.toLowerCase() === 'r') rotateSelection();
        if (e.key.toLowerCase() === 'h') mirrorSelection('H');
        if (e.key.toLowerCase() === 'v') mirrorSelection('V');
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') { e.preventDefault(); undo(); }
            if (e.key === 'y') { e.preventDefault(); redo(); }
            if (e.key === 'c') copy();
            if (e.key === 'v') paste();
        }
        if (e.key === 'Escape') { setPlacementMode(''); cancelWire(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, rotateSelection, mirrorSelection, undo, redo, copy, paste, setPlacementMode, cancelWire]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    setScale(newScale);
    setPosition({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const getPointerGridPos = (stage: Konva.Stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return { x: 0, y: 0 };
      return { x: (pointer.x - stage.x()) / scale, y: (pointer.y - stage.y()) / scale };
  };

  // --- GLOBAL JUNCTION & ERC CALCULATION ---
  const { junctionDots, ercMarkers } = useMemo(() => {
      const counts = new Map<string, number>();
      const locKey = (x:number, y:number) => `${Math.round(x)},${Math.round(y)}`;

      // 1. Count Pin Connections
      components.forEach(c => {
          const def = COMPONENT_LIBRARY[c.type];
          def.pins.forEach(p => {
              const abs = getPinAbsolutePosition(c, p.id);
              const k = locKey(abs.x, abs.y);
              counts.set(k, (counts.get(k) || 0) + 1);
          });
      });

      // 2. Count Wire Connections
      wires.forEach(w => {
          // Add endpoints
          const start = locKey(w.points[0], w.points[1]);
          const end = locKey(w.points[w.points.length-2], w.points[w.points.length-1]);
          counts.set(start, (counts.get(start) || 0) + 1);
          counts.set(end, (counts.get(end) || 0) + 1);
          
          // Also check intermediate points (if they form a T-junction via split)
          // But logically split wires share endpoint.
      });

      const dots: React.ReactElement[] = [];
      const markers: React.ReactElement[] = [];

      counts.forEach((count, key) => {
          const [x, y] = key.split(',').map(Number);
          if (count >= 3) {
              dots.push(<Circle key={`j-${key}`} x={x} y={y} radius={3} fill="#00ff00" listening={false} />);
          }
          if (count === 1) {
              markers.push(<Rect key={`erc-${key}`} x={x-3} y={y-3} width={6} height={6} stroke="red" strokeWidth={1} listening={false} />);
          }
      });
      return { junctionDots: dots, ercMarkers: markers };
  }, [components, wires]);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage || e.target !== stage) return;
      const pos = getPointerGridPos(stage);
      
      if (toolMode === 'select') {
          setSelectionBox({ start: pos, current: pos });
          selectItem(null);
      }
      
      if (toolMode === 'wire') {
          // Use smart snap
          const snap = getSnapTarget(pos);
          if (!drawingWire) startWire(snap);
          else addWirePoint(snap);
      } else if (toolMode === 'place' && activeLibraryId) {
          placeComponent(pos); // placeComponent uses getSnapTarget internally
      }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if(!stage) return;
      const pos = getPointerGridPos(stage);
      
      // Update Smart Cursor
      const snap = getSnapTarget(pos);
      // We still update mousePos for ghost components, but we don't render the visual indicator circle.
      setMousePos({ x: snap.x, y: snap.y }); 

      if (toolMode === 'wire' && drawingWire) updateDrawingWire(pos);
      if (draggingSegment) updateSegmentDrag(pos);
      if (draggingWireEnd) updateWireEndDrag(pos);
      if (selectionBox) setSelectionBox({ ...selectionBox, current: pos });
  };
  
  const handleMouseUp = () => {
      if (draggingSegment) endSegmentDrag();
      if (draggingWireEnd) endWireEndDrag();
      if (selectionBox) setSelectionBox(null);
  };
  
  const handleDoubleClick = () => {
      if (toolMode === 'wire' && drawingWire) finishWire();
  };

  const ghostComponent: ComponentInstance | null = (toolMode === 'place' && activeLibraryId && COMPONENT_LIBRARY[activeLibraryId]) ? {
      id: 'ghost', type: activeLibraryId, x: mousePos.x, y: mousePos.y, rotation: 0, mirrored: false, properties: COMPONENT_LIBRARY[activeLibraryId].defaultProperties
  } : null;

  let boxRect = null;
  if (selectionBox) {
      const x = Math.min(selectionBox.start.x, selectionBox.current.x);
      const y = Math.min(selectionBox.start.y, selectionBox.current.y);
      const w = Math.abs(selectionBox.current.x - selectionBox.start.x);
      const h = Math.abs(selectionBox.current.y - selectionBox.start.y);
      boxRect = <Rect x={x} y={y} width={w} height={h} fill="rgba(0, 170, 255, 0.2)" stroke="#00aaff" strokeWidth={1} listening={false} />;
  }

  return (
    <div ref={containerRef} className="flex-1 bg-[#1e1e1e] relative overflow-hidden outline-none" tabIndex={0}>
      <Stage
        width={dimensions.width} height={dimensions.height}
        scaleX={scale} scaleY={scale} x={position.x} y={position.y}
        draggable={toolMode === 'pan'} onWheel={handleWheel}
        onMouseDown={handleStageMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDblClick={handleDoubleClick}
        onDragEnd={(e) => { if (e.target === e.target.getStage()) setPosition({ x: e.target.x(), y: e.target.y() }); }}
      >
        <GridBackground width={dimensions.width} height={dimensions.height} scale={scale} x={position.x} y={position.y} />
        <Layer>
          {wires.map((wire) => <SchematicWire key={wire.id} data={wire} selected={selectedIds.includes(wire.id)} />)}
          {drawingWire && <SchematicWire data={drawingWire} selected={true} isDrawing />}
          {components.map((comp) => <SchematicComponent key={comp.id} data={comp} selected={selectedIds.includes(comp.id)} />)}
          {ghostComponent && <SchematicComponent data={ghostComponent} selected={false} isGhost />}
          
          {/* Global Indicators */}
          <Group>{junctionDots}</Group>
          <Group>{ercMarkers}</Group>
          
          {boxRect}
        </Layer>
      </Stage>
      <div className="absolute bottom-4 left-4 bg-black/50 text-white p-2 rounded text-xs pointer-events-none select-none">
        Scale: {scale.toFixed(2)} | X: {Math.round(mousePos.x)} Y: {Math.round(mousePos.y)}
      </div>
    </div>
  );
};

export default EditorCanvas;
