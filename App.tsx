import React from 'react';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import EditorCanvas from './components/EditorCanvas';
import NetlistPanel from './components/NetlistPanel';
import Toolbar from './components/Toolbar';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-white overflow-hidden font-sans">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
            <EditorCanvas />
            <NetlistPanel />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;