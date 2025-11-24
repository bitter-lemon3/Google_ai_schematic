import React, { useMemo } from 'react';
import { useEditorStore } from '../store';
import { generateNetlist } from '../utils/netlistGenerator';

const NetlistPanel: React.FC = () => {
  const { components, wires } = useEditorStore();

  const netlist = useMemo(() => {
    return generateNetlist(components, wires);
  }, [components, wires]);

  return (
    <div className="h-48 bg-[#1e1e1e] border-t border-[#3e3e42] flex flex-col">
       <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#3e3e42]">
           <span className="text-xs font-bold text-gray-400">SPICE Netlist (Live)</span>
           <button className="text-[10px] bg-[#007acc] text-white px-2 py-0.5 rounded hover:bg-[#005a9e]">
               Copy
           </button>
       </div>
       <div className="flex-1 p-2 overflow-auto">
           <pre className="text-xs font-mono text-[#dcdcdc] leading-tight">
               {netlist}
           </pre>
       </div>
    </div>
  );
};

export default NetlistPanel;