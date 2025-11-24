import { ComponentDefinition } from './types';

export const GRID_SIZE = 20;

export const COMPONENT_LIBRARY: Record<string, ComponentDefinition> = {
  resistor: {
    type: 'resistor',
    name: 'Resistor',
    category: 'Passive',
    width: 60,
    height: 20,
    pins: [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 60, y: 10 },
    ],
    shapes: [
      { type: 'line', points: [0, 10, 15, 10], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [15, 10, 20, 0, 25, 20, 30, 0, 35, 20, 40, 0, 45, 10], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [45, 10, 60, 10], stroke: '#fff', strokeWidth: 2 },
      { type: 'text', text: 'R?', x: 20, y: -20, fontSize: 14, fill: '#aaa' },
    ],
    defaultProperties: {
      value: '10k',
      name: 'R1',
    },
    template: 'R{{name}} {{1}} {{2}} {{value}}',
  },
  capacitor: {
    type: 'capacitor',
    name: 'Capacitor',
    category: 'Passive',
    width: 40,
    height: 40,
    pins: [
      { id: '1', x: 20, y: 0 },
      { id: '2', x: 20, y: 40 },
    ],
    shapes: [
      { type: 'line', points: [20, 0, 20, 15], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [10, 15, 30, 15], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [10, 25, 30, 25], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [20, 25, 20, 40], stroke: '#fff', strokeWidth: 2 },
      { type: 'text', text: 'C?', x: 35, y: 12, fontSize: 14, fill: '#aaa' },
    ],
    defaultProperties: {
      value: '1uF',
      name: 'C1',
    },
    template: 'C{{name}} {{1}} {{2}} {{value}}',
  },
  voltage_source: {
    type: 'voltage_source',
    name: 'Voltage Src',
    category: 'Sources',
    width: 40,
    height: 60,
    pins: [
      { id: 'p', x: 20, y: 0 },
      { id: 'n', x: 20, y: 60 },
    ],
    shapes: [
      { type: 'circle', x: 20, y: 30, radius: 15, stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [20, 0, 20, 15], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [20, 45, 20, 60], stroke: '#fff', strokeWidth: 2 },
      { type: 'text', text: '+', x: 15, y: 18, fontSize: 14, fill: '#fff' },
      { type: 'text', text: '-', x: 17, y: 38, fontSize: 14, fill: '#fff' },
      { type: 'text', text: 'V?', x: 40, y: 20, fontSize: 14, fill: '#aaa' },
    ],
    defaultProperties: {
      value: '5V',
      name: 'V1',
    },
    template: 'V{{name}} {{p}} {{n}} {{value}}',
  },
  gnd: {
    type: 'gnd',
    name: 'Ground',
    category: 'Power',
    width: 20,
    height: 20,
    pins: [
      { id: '1', x: 10, y: 0 },
    ],
    shapes: [
      { type: 'line', points: [10, 0, 10, 10], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [0, 10, 20, 10], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [5, 15, 15, 15], stroke: '#fff', strokeWidth: 2 },
      { type: 'line', points: [8, 20, 12, 20], stroke: '#fff', strokeWidth: 2 },
    ],
    defaultProperties: {
      name: 'GND',
    },
    template: '',
  },
  opamp: {
    type: 'opamp',
    name: 'OpAmp',
    category: 'Active',
    width: 60,
    height: 60,
    pins: [
      { id: 'in_n', x: 0, y: 10 },  // Adjusted to grid
      { id: 'in_p', x: 0, y: 50 },  // Adjusted to grid
      { id: 'out', x: 60, y: 30 },
    ],
    shapes: [
       { type: 'line', points: [10, 0, 10, 60, 60, 30, 10, 0], stroke: '#fff', strokeWidth: 2 }, // Triangle
       { type: 'line', points: [0, 10, 10, 10], stroke: '#fff', strokeWidth: 2 },
       { type: 'line', points: [0, 50, 10, 50], stroke: '#fff', strokeWidth: 2 },
       { type: 'line', points: [60, 30, 50, 30], stroke: '#fff', strokeWidth: 2 },
       { type: 'text', text: '-', x: 12, y: 3, fontSize: 14, fill: '#fff' },
       { type: 'text', text: '+', x: 12, y: 43, fontSize: 14, fill: '#fff' },
    ],
    defaultProperties: {
        name: 'X1',
        model: 'LM741'
    },
    template: 'X{{name}} {{in_p}} {{in_n}} {{out}} {{model}}'
  }
};