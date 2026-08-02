import React, { useState, useEffect } from 'react';
import { LoggerService, LogEntry } from '../../services/loggerService';
import { Search, Terminal, Filter, RefreshCcw } from 'lucide-react';

export const ManagedAgentsLab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsubscribe = LoggerService.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    
    // For demo purposes: seed a few mock agent logs for the Release Pipeline
    LoggerService.logAgent('Release & Playlist Agent: Scan initiated on Drive folder 02. Brzi Arzi - Music/', { target: 'Drive' });
    setTimeout(() => {
      LoggerService.logAgent('Release & Playlist Agent: Discovered new audio for "Glitch Sevdah". Checksum validated.', { track: 'Glitch Sevdah', status: 'AUDIO_FOUND' });
    }, 1500);
    setTimeout(() => {
      LoggerService.logAgent('Release & Playlist Agent: Generated metadata package for "Glitch Sevdah". Awaiting Cover Art.', { track: 'Glitch Sevdah', status: 'METADATA_GENERATED' });
    }, 3000);
    setTimeout(() => {
      LoggerService.logAgent('Release & Playlist Agent: Cover Art discovered. Track "Glitch Sevdah" is now fully packaged. Emitting READY_FOR_FINAL_PUSH.', { track: 'Glitch Sevdah', status: 'READY_FOR_FINAL_PUSH' });
    }, 4500);

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs
    .filter(log => categoryFilter === 'ALL' || log.category === categoryFilter)
    .filter(log => 
      searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .reverse();

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-sans font-bold text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-cyber-green" />
            MANAGED AGENTS LAB
          </h2>
          <p className="text-zinc-500 font-mono text-sm mt-1">Audit log of automated orchestrator workflows and agent actions</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg">
          {['ALL', 'AGENT', 'SYSTEM', 'ERROR'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all ${
                categoryFilter === cat 
                  ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search agent logs by keyword or track name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-cyber-green transition-colors"
          />
        </div>
        <button 
          onClick={() => LoggerService.getLogs().then(setLogs)}
          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center"
          title="Refresh Logs"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 bg-black border border-zinc-800 rounded-lg overflow-hidden flex flex-col relative">
        <div className="bg-zinc-900/50 border-b border-zinc-800 p-3 flex text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest sticky top-0 z-10 shadow-md">
          <div className="w-24 shrink-0">TIME</div>
          <div className="w-24 shrink-0">SOURCE</div>
          <div className="flex-1">ACTIVITY RECORD</div>
          <div className="w-32 shrink-0 text-right">METADATA</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-sm opacity-50 space-y-2">
              <Filter className="w-8 h-8 mb-2" />
              <p>No agent logs match current filters.</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={log.id || i} className="group flex flex-col sm:flex-row gap-3 p-3 border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                <div className="w-24 shrink-0 text-xs font-mono text-zinc-500 pt-1">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="w-24 shrink-0 pt-0.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    log.category === 'AGENT' ? 'bg-[#ff00ff]/10 text-[#ff00ff] border-[#ff00ff]/30' :
                    log.category === 'ERROR' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                    log.category === 'SYSTEM' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {log.category}
                  </span>
                </div>
                <div className="flex-1 text-sm font-mono text-zinc-300 leading-relaxed pt-1">
                  {log.message}
                </div>
                <div className="sm:w-32 shrink-0 sm:text-right pt-1">
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <span className="text-[10px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-2 py-1 rounded inline-block truncate max-w-full" title={JSON.stringify(log.metadata)}>
                      {JSON.stringify(log.metadata).substring(0, 20)}...
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-700 font-mono">-</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagedAgentsLab;
