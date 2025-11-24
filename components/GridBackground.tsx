import React from 'react';
import { Layer, Circle } from 'react-konva';
import { GRID_SIZE } from '../constants';

interface GridBackgroundProps {
  width: number;
  height: number;
  scale: number;
  x: number;
  y: number;
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height, scale, x, y }) => {
  // Optimization: Only render grid points visible in viewport
  // For simplicity in this demo, we render a large fixed grid or dynamic based on stage size.
  // Rendering thousands of circles can be slow. Konva is fast, but let's be reasonable.
  // We'll calculate the start/end indices based on viewport.

  const startX = Math.floor((-x / scale) / GRID_SIZE) * GRID_SIZE;
  const endX = Math.floor(((-x + width) / scale) / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor((-y / scale) / GRID_SIZE) * GRID_SIZE;
  const endY = Math.floor(((-y + height) / scale) / GRID_SIZE) * GRID_SIZE;

  const points = [];
  for (let ix = startX; ix <= endX; ix += GRID_SIZE) {
    for (let iy = startY; iy <= endY; iy += GRID_SIZE) {
        points.push(<Circle key={`${ix}-${iy}`} x={ix} y={iy} radius={1 / scale} fill="#333" listening={false} />);
    }
  }

  return (
    <Layer>
      {points}
    </Layer>
  );
};

export default React.memo(GridBackground);