import React from 'react';
import { COMPONENT_LIBRARY } from '../constants';
import { useEditorStore } from '../store';
import { Cpu, Zap, Activity, Battery, Disc } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { setPlacementMode, activeLibraryId } = useEditorStore();

  const getIcon = (type: string) => {
      switch(type) {
          case 'resistor': return <Activity size={16} />;
          case 'capacitor': return <Disc size={16} />;
          case 'voltage_source': return <Battery size={16} />;
          case 'opamp': return <Cpu size={16} />;
          case 'gnd': return <Zap size={16} />;
          default: return <Cpu size={16} />;
      }
  }

  return (
    <div className="w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col select-none">
      <div className="p-3 text-xs font-bold uppercase text-gray-400 tracking-wider border-b border-[#3e3e42]">
        Components
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {Object.values(COMPONENT_LIBRARY).map((def) => (
            <div
              key={def.type}
              onClick={() => setPlacementMode(def.type)}
              className={`p-3 rounded cursor-pointer border transition-colors flex flex-col items-center gap-2 ${
                  activeLibraryId === def.type 
                  ? 'bg-[#37373d] border-[#007acc] ring-1 ring-[#007acc]' 
                  : 'bg-[#333333] hover:bg-[#444] border-transparent'
              }`}
            >
              <div className="text-blue-400">
                {getIcon(def.type)}
              </div>
              <span className="text-xs text-gray-300 font-medium">{def.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-[#3e3e42]">
        <p className="text-[10px] text-gray-500">
            Click to select, then click on canvas to place.
            <br/>
            Esc to cancel.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;