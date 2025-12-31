import React, { useState } from 'react';
// import { yourServiceFunction } from '../../services/geminiService';

/**
 * MODULE TEMPLATE
 * 
 * Rules:
 * 1. Keep state local.
 * 2. Handle your own loading states.
 * 3. Use the global theme (Tailwind classes).
 */

const ModuleTemplate: React.FC = () => {
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'ERROR'>('IDLE');

  const handleAction = async () => {
    setStatus('PROCESSING');
    try {
      // API Calls here
      // const result = await yourServiceFunction(...);
      setStatus('IDLE');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-sans font-bold text-white">NEW MODULE</h2>
        <p className="text-zinc-500 font-mono text-sm">Description of what this pod does.</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 relative overflow-hidden">
        
        {/* State: Processing Overlay */}
        {status === 'PROCESSING' && (
           <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
             <div className="text-cyber-green font-mono animate-pulse">PROCESSING DATA...</div>
           </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="bg-black border border-zinc-800 p-4">
                <h3 className="text-sm font-mono text-zinc-400 mb-4">INPUT STREAM</h3>
                {/* Inputs go here */}
                <button 
                  onClick={handleAction}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 font-mono text-sm rounded mt-4"
                >
                  EXECUTE
                </button>
            </div>
            
            <div className="bg-black border border-zinc-800 p-4">
                <h3 className="text-sm font-mono text-zinc-400 mb-4">OUTPUT STREAM</h3>
                {/* Results go here */}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleTemplate;
