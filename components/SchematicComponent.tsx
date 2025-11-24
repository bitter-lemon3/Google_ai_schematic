
import React, { useMemo } from 'react';
import { Group, Line, Circle, Text, Rect } from 'react-konva';
import { ComponentInstance } from '../types';
import { COMPONENT_LIBRARY, GRID_SIZE } from '../constants';
import { useEditorStore, getPinAbsolutePosition } from '../store';
import Konva from 'konva';

interface Props {
  data: ComponentInstance;
  selected: boolean;
  isGhost?: boolean;
}

const SchematicComponent: React.FC<Props> = ({ data, selected, isGhost }) => {
  const def = COMPONENT_LIBRARY[data.type];
  const { selectItem, updateComponent, handleComponentDragStart, wires } = useEditorStore();

  const connectedPins = useMemo(() => {
    if (isGhost) return new Set<string>();
    const connected = new Set<string>();
    
    def.pins.forEach(pin => {
      const pinAbs = getPinAbsolutePosition(data, pin.id);
      // Snap tolerance check
      for (const wire of wires) {
         for (let i = 0; i < wire.points.length; i+=2) { // Check all points (junctions too)
             if (Math.abs(wire.points[i] - pinAbs.x) < 5 && Math.abs(wire.points[i+1] - pinAbs.y) < 5) {
                 connected.add(pin.id);
                 break;
             }
         }
         if (connected.has(pin.id)) break;
      }
    });
    return connected;
  }, [wires, data, def, isGhost]);

  if (!def) return null;

  const cx = def.width / 2;
  const cy = def.height / 2;

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (isGhost) return;
      selectItem(data.id);
      handleComponentDragStart(data.id);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isGhost) return;
    updateComponent(data.id, {
      x: e.target.x() - cx,
      y: e.target.y() - cy,
    });
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
     if (isGhost) return;
     
     // Snap First Pin
     const pin0 = def.pins[0];
     if (pin0) {
         const rad = (data.rotation * Math.PI) / 180;
         const scaleX = data.mirrored ? -1 : 1;
         const px = (pin0.x - cx) * scaleX;
         const py = pin0.y - cy;
         const rx = px * Math.cos(rad) - py * Math.sin(rad);
         const ry = px * Math.sin(rad) + py * Math.cos(rad);
         
         const currentCenterX = e.target.x();
         const currentCenterY = e.target.y();
         
         const pinAbsX = currentCenterX + rx;
         const pinAbsY = currentCenterY + ry;
         
         const snappedPinX = Math.round(pinAbsX / GRID_SIZE) * GRID_SIZE;
         const snappedPinY = Math.round(pinAbsY / GRID_SIZE) * GRID_SIZE;
         
         e.target.x(snappedPinX - rx);
         e.target.y(snappedPinY - ry);
     } else {
         e.target.x(Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE);
         e.target.y(Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE);
     }
  };

  return (
    <Group
      id={data.id}
      draggable={!isGhost}
      onClick={(e) => {
        if (isGhost) return;
        e.cancelBubble = true;
        selectItem(data.id, e.evt.shiftKey);
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      rotation={data.rotation}
      scaleX={data.mirrored ? -1 : 1}
      offsetX={cx}
      offsetY={cy}
      x={data.x + cx} 
      y={data.y + cy}
      opacity={isGhost ? 0.6 : 1}
      listening={!isGhost}
    >
      <Rect
        x={0}
        y={0}
        width={def.width}
        height={def.height}
        fill="transparent"
      />
      {selected && !isGhost && (
        <Rect
          x={-5}
          y={-5}
          width={def.width + 10}
          height={def.height + 10}
          stroke="#00aaff"
          strokeWidth={1}
          dash={[5, 5]}
        />
      )}
      {def.shapes.map((shape, idx) => {
        if (shape.type === 'line') {
          return <Line key={idx} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap="round" lineJoin="round" />;
        }
        if (shape.type === 'circle') {
            return <Circle key={idx} x={shape.x} y={shape.y} radius={shape.radius} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill="transparent" />;
        }
        if (shape.type === 'text') {
            let content = shape.text || '';
            if (content.includes('?')) {
                 if (content.startsWith('R')) content = data.properties.name || content;
                 if (content.startsWith('C')) content = data.properties.name || content;
                 if (content.startsWith('V')) content = data.properties.name || content;
            }
            return <Group key={idx} x={shape.x} y={shape.y}><Text text={content} fontSize={shape.fontSize} fill={shape.fill} scaleX={data.mirrored ? -1 : 1} /></Group>;
        }
        return null;
      })}
      {def.pins.map(pin => {
          const isConnected = connectedPins.has(pin.id);
          return (
            <Group key={pin.id} x={pin.x} y={pin.y}>
                {isConnected ? (
                    <Rect x={-3} y={-3} width={6} height={6} fill="#fff" />
                ) : (
                    <Circle radius={2.5} stroke="#d9534f" strokeWidth={1} fill="#1e1e1e" />
                )}
            </Group>
          );
      })}
      <Group x={0} y={def.height + 5}>
          <Text text={`${data.properties.value || ''}`} fontSize={12} fill="#ccc" align="center" width={def.width} scaleX={data.mirrored ? -1 : 1} />
      </Group>
    </Group>
  );
};

export default React.memo(SchematicComponent);
