import React from 'react';
import { useEditorStore } from '../store';
import { MousePointer2, Cable, Hand, ZoomIn, ZoomOut, Play, Undo2, Redo2, RotateCw, FlipHorizontal } from 'lucide-react';
import { ToolMode } from '../types';

const Toolbar: React.FC = () => {
  const { toolMode, setToolMode, setScale, scale, undo, redo, rotateSelection, mirrorSelection } = useEditorStore();

  const tools: { id: ToolMode; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select' },
    { id: 'wire', icon: <Cable size={16} />, label: 'Wire' },
    { id: 'pan', icon: <Hand size={16} />, label: 'Pan' },
  ];

  return (
    <div className="h-12 bg-[#333333] border-b border-[#3e3e42] flex items-center px-4 justify-between select-none">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold text-gray-200 mr-4">Schematic Editor</h1>
        
        <div className="h-6 w-px bg-[#444] mx-2"></div>
        
        <button onClick={undo} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]" title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
        </button>
        <button onClick={redo} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]" title="Redo (Ctrl+Y)">
            <Redo2 size={16} />
        </button>

        <div className="h-6 w-px bg-[#444] mx-2"></div>
        
        <div className="flex bg-[#252526] rounded p-1 gap-1">
            {tools.map(t => (
                <button
                    key={t.id}
                    onClick={() => setToolMode(t.id)}
                    className={`p-1.5 rounded flex items-center gap-2 text-xs transition-colors ${
                        toolMode === t.id 
                        ? 'bg-[#007acc] text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                    }`}
                    title={t.label}
                >
                    {t.icon}
                </button>
            ))}
        </div>
        
        <div className="h-6 w-px bg-[#444] mx-2"></div>

        <button onClick={() => rotateSelection()} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]" title="Rotate (R)">
            <RotateCw size={16} />
        </button>
        <button onClick={() => mirrorSelection('H')} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]" title="Mirror Horizontal (H)">
            <FlipHorizontal size={16} />
        </button>

        <div className="h-6 w-px bg-[#444] mx-2"></div>

        <button onClick={() => setScale(scale * 1.1)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]">
            <ZoomIn size={16} />
        </button>
        <button onClick={() => setScale(scale * 0.9)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3e3e42]">
            <ZoomOut size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded font-medium">
              <Play size={14} />
              Run Simulation
          </button>
      </div>
    </div>
  );
};

export default Toolbar;