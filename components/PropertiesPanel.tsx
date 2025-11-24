import React from 'react';
import { useEditorStore } from '../store';
import { ComponentInstance } from '../types';

const PropertiesPanel: React.FC = () => {
  const { selectedIds, components, updateComponent, deleteSelection } = useEditorStore();

  // Find the primary selected component
  const selectedComponent = components.find(c => selectedIds.includes(c.id));
  
  // Also check if wire is selected (not implemented fully for props, but we can show generic info)
  // For now, focus on Component editing.

  const handlePropChange = (key: string, value: string) => {
    if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        properties: {
          ...selectedComponent.properties,
          [key]: value
        }
      });
    }
  };
  
  const handleRotation = () => {
      if (selectedComponent) {
          const newRot = (selectedComponent.rotation + 90) % 360;
          updateComponent(selectedComponent.id, { rotation: newRot });
      }
  }

  if (!selectedComponent) {
    return (
      <div className="w-64 bg-[#252526] border-l border-[#3e3e42] p-4 text-gray-500 text-sm">
        No component selected.
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#252526] border-l border-[#3e3e42] flex flex-col">
      <div className="p-3 text-xs font-bold uppercase text-gray-400 tracking-wider border-b border-[#3e3e42]">
        Inspector
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">ID</label>
          <input 
            disabled 
            value={selectedComponent.id.slice(0, 8)} 
            className="w-full bg-[#3c3c3c] text-gray-400 text-sm p-1 rounded border border-[#555]"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <div className="text-sm text-white font-medium">{selectedComponent.type}</div>
        </div>

        <div className="border-t border-[#3e3e42] pt-4">
          <h4 className="text-xs font-bold text-gray-400 mb-2">Properties</h4>
          {Object.entries(selectedComponent.properties).map(([key, value]) => (
            <div key={key} className="mb-2">
              <label className="block text-xs text-gray-400 mb-1 capitalize">{key}</label>
              <input 
                value={value as string}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="w-full bg-[#3c3c3c] text-white text-sm p-1 rounded border border-[#555] focus:border-[#007acc] outline-none"
              />
            </div>
          ))}
        </div>

        <div className="border-t border-[#3e3e42] pt-4 space-y-2">
            <button 
                onClick={handleRotation}
                className="w-full bg-[#333] hover:bg-[#444] text-white text-xs py-2 rounded transition-colors"
            >
                Rotate 90°
            </button>
            <button 
                onClick={deleteSelection}
                className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 text-xs py-2 rounded transition-colors"
            >
                Delete Component
            </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;