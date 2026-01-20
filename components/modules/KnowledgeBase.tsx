
import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { KnowledgeItem } from '../../types';
import { synthesizeKnowledgeBase } from '../../services/geminiService';

const KnowledgeBase: React.FC = () => {
  // Initialize from storage synchronously to prevent empty flash/loss
  const [items, setItems] = useState<KnowledgeItem[]>(() => StorageService.getKnowledgeItems());
  const [view, setView] = useState<'LIST' | 'CREATE' | 'SYNTHESIS_MODE'>('LIST');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'PROMPT' | 'STRATEGY' | 'NOTE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<KnowledgeItem['type']>('PROMPT');
  
  // Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);

  // Reload when component mounts just in case
  useEffect(() => {
    setItems(StorageService.getKnowledgeItems());
  }, []);

  const filteredItems = items.filter(item => {
      const matchesType = filterType === 'ALL' || item.type === filterType;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
  });

  const handleSave = () => {
    if (!title || !content) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      type,
      title,
      content,
      tags: [],
      createdAt: Date.now()
    };
    StorageService.saveKnowledgeItem(newItem);
    setItems(StorageService.getKnowledgeItems()); // Update local state immediately
    setView('LIST');
    setTitle('');
    setContent('');
  };

  const handleDelete = (id: string) => {
      if(confirm("Permanently delete this knowledge node?")) {
          StorageService.deleteKnowledgeItem(id);
          setItems(StorageService.getKnowledgeItems());
      }
  };

  const handleCopy = (content: string) => {
      navigator.clipboard.writeText(content);
      setCopyFeedback("COPIED TO CLIPBOARD");
      setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleUseAsTemplate = (item: KnowledgeItem) => {
      setTitle(`Copy of ${item.title}`);
      setContent(item.content);
      setType(item.type);
      setView('CREATE');
  };

  // --- THE "NEURAL DEFRAG" (Synthesis) ---
  const handleSynthesis = async () => {
      if (!confirm("INITIATE NEURAL SYNTHESIS?\nThis will read your Chat History, Analytics, and Notes to create High-Value Summary Nodes.")) return;
      
      setIsSynthesizing(true);
      setSynthesisProgress(10);
      
      try {
          // 1. Gather Data
          setSynthesisProgress(30);
          const chats = StorageService.getChatHistory();
          const reports = StorageService.getAnalyticsReports();
          const existingNotes = StorageService.getKnowledgeItems().map(i => `[${i.type}] ${i.title}: ${i.content}`);
          
          const rawDump = JSON.stringify({
              recentChats: chats.slice(-50), // Last 50 messages
              analytics: reports.slice(-5), // Last 5 reports
              notes: existingNotes.slice(0, 10) // Sample of existing notes
          });

          // 2. Call Gemini
          setSynthesisProgress(60);
          const synthesizedData = await synthesizeKnowledgeBase(rawDump);

          // 3. Save Results
          setSynthesisProgress(90);
          let count = 0;
          if (Array.isArray(synthesizedData)) {
              synthesizedData.forEach((item: any) => {
                  if (item.title && item.content) {
                      StorageService.saveKnowledgeItem({
                          id: Date.now().toString() + Math.random(),
                          type: item.type || 'STRATEGY',
                          title: `[SYNTH] ${item.title}`,
                          content: item.content,
                          tags: item.tags || ['ai-generated'],
                          createdAt: Date.now()
                      });
                      count++;
                  }
              });
          }
          
          setItems(StorageService.getKnowledgeItems());
          alert(`SYNTHESIS COMPLETE.\n${count} new Knowledge Nodes created.`);
          
      } catch (e: any) {
          console.error(e);
          alert("SYNTHESIS FAILED: " + e.message);
      } finally {
          setIsSynthesizing(false);
          setSynthesisProgress(0);
      }
  };

  // --- EXPORT PROTOCOL ---
  const handleExport = () => {
      const dataStr = JSON.stringify(items, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `Sovereign_Knowledge_Base_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  return (
    <div className="h-full flex flex-col p-6 relative bg-black">
      
      {/* Feedback Toast */}
      {copyFeedback && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-cyber-green text-black font-bold font-mono px-4 py-2 rounded shadow-[0_0_15px_#00ff41] z-50">
              {copyFeedback}
          </div>
      )}

      {/* Synthesis Overlay */}
      {isSynthesizing && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center backdrop-blur-md">
              <div className="w-64 mb-4">
                  <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-cyber-purple transition-all duration-500" style={{width: `${synthesisProgress}%`}}></div>
                  </div>
              </div>
              <h2 className="text-2xl font-bold font-mono text-white animate-pulse">NEURAL DEFRAG IN PROGRESS</h2>
              <p className="text-zinc-500 font-mono text-xs mt-2">Consolidating Ecosystem Intelligence...</p>
          </div>
      )}

      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white tracking-tight">KNOWLEDGE CORE</h2>
            <p className="text-zinc-500 font-mono text-sm">Digital Asset Management & Synthesis</p>
        </div>
        <div className="flex gap-2">
             {view === 'LIST' && (
                 <>
                    <button 
                        onClick={handleSynthesis}
                        className="bg-zinc-900 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white px-4 py-2 rounded font-mono text-xs font-bold transition-colors"
                    >
                        ⚡ SYNTHESIZE
                    </button>
                    <button 
                        onClick={handleExport}
                        className="bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white px-4 py-2 rounded font-mono text-xs font-bold transition-colors"
                    >
                        ↓ EXPORT PACK
                    </button>
                 </>
             )}
            <button 
                onClick={() => {
                    if(view === 'LIST') {
                        setTitle('');
                        setContent('');
                        setType('PROMPT');
                        setView('CREATE');
                    } else {
                        setView('LIST');
                    }
                }}
                className="bg-cyber-green text-black px-4 py-2 rounded font-mono text-xs font-bold hover:bg-emerald-400 shadow-[0_0_10px_rgba(0,255,65,0.2)]"
            >
                {view === 'LIST' ? '+ NEW NODE' : 'CANCEL'}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
         
         {/* Filter Bar (Only in List View) */}
         {view === 'LIST' && (
             <div className="flex gap-4 mb-4 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                 <div className="flex-1 relative">
                     <svg className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <input 
                        type="text" 
                        placeholder="Search Neural Database..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded pl-10 pr-4 py-1.5 text-sm text-white focus:border-cyber-green outline-none"
                     />
                 </div>
                 <div className="flex gap-1">
                     {(['ALL', 'PROMPT', 'STRATEGY', 'NOTE'] as const).map(t => (
                         <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded transition-colors ${filterType === t ? 'bg-zinc-700 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-300'}`}
                         >
                             {t}
                         </button>
                     ))}
                 </div>
             </div>
         )}

         {view === 'CREATE' ? (
             <div className="max-w-3xl mx-auto w-full bg-zinc-900/50 p-8 rounded-lg border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                 <h3 className="text-xl font-bold text-white mb-6">CREATE NEW DATA NODE</h3>
                 
                 <div className="mb-6">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">CLASSIFICATION</label>
                     <div className="flex gap-2">
                         {(['NOTE', 'PROMPT', 'STRATEGY'] as const).map(t => (
                             <button 
                                key={t} 
                                onClick={() => setType(t)}
                                className={`px-4 py-2 text-xs font-bold rounded border transition-all ${
                                    type === t 
                                    ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_10px_rgba(0,255,65,0.3)]' 
                                    : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                }`}
                             >
                                 {t}
                             </button>
                         ))}
                     </div>
                 </div>
                 
                 <div className="mb-6">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">IDENTIFIER (TITLE)</label>
                     <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. 'Viral Hook Strategy v2' or 'Midjourney Master Prompt'"
                        className="w-full bg-black border border-zinc-700 rounded p-3 text-white outline-none focus:border-cyber-green focus:ring-1 focus:ring-cyber-green transition-all"
                     />
                 </div>

                 <div className="mb-8">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">DATA PAYLOAD</label>
                     <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste intelligence here..."
                        className="w-full bg-black border border-zinc-700 rounded p-3 text-white h-64 resize-none outline-none focus:border-cyber-green focus:ring-1 focus:ring-cyber-green font-mono text-sm transition-all"
                     />
                 </div>

                 <button 
                    onClick={handleSave}
                    className="w-full bg-white text-black font-black py-4 rounded hover:bg-zinc-200 tracking-widest text-sm uppercase transition-colors"
                 >
                     ENCRYPT & SAVE
                 </button>
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto h-full pb-10 pr-2">
                 {items.length === 0 && (
                     <div className="col-span-full flex flex-col items-center justify-center text-zinc-700 font-mono mt-20 opacity-50">
                         <div className="text-6xl mb-4">∅</div>
                         <p>DATA VAULT EMPTY</p>
                         <p className="text-xs mt-2">Create a node or run synthesis.</p>
                     </div>
                 )}
                 {filteredItems.map(item => (
                     <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded hover:border-zinc-500 transition-all group relative flex flex-col shadow-lg">
                         <div className="flex justify-between items-start mb-3">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                 item.type === 'PROMPT' ? 'bg-purple-900/30 text-purple-300 border-purple-800' :
                                 item.type === 'STRATEGY' ? 'bg-blue-900/30 text-blue-300 border-blue-800' :
                                 'bg-zinc-800 text-zinc-300 border-zinc-700'
                             }`}>
                                 {item.type}
                             </span>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleUseAsTemplate(item)}
                                    title="Edit/Use"
                                    className="text-zinc-500 hover:text-white"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    title="Delete"
                                    className="text-zinc-500 hover:text-red-500"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                             </div>
                         </div>
                         
                         <h3 className="font-bold text-white mb-2 truncate text-sm" title={item.title}>{item.title}</h3>
                         
                         <div className="flex-1 bg-black/50 p-3 rounded mb-4 overflow-hidden relative group-hover:bg-black transition-colors">
                             <p className="text-xs text-zinc-400 font-mono whitespace-pre-wrap line-clamp-6">{item.content}</p>
                             <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"></div>
                         </div>
                         
                         {item.type === 'PROMPT' && (
                             <button 
                                onClick={() => handleCopy(item.content)}
                                className="w-full bg-zinc-800 hover:bg-cyber-green hover:text-black hover:border-cyber-green text-[10px] text-zinc-400 py-2.5 rounded font-mono border border-zinc-700 transition-all font-bold flex items-center justify-center gap-2"
                             >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                COPY PROMPT
                             </button>
                         )}
                         
                         {item.type !== 'PROMPT' && (
                             <div className="flex gap-1 flex-wrap">
                                 {item.tags.map((tag, i) => (
                                     <span key={i} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{tag}</span>
                                 ))}
                             </div>
                         )}

                         <div className="mt-3 text-[9px] text-zinc-600 font-mono text-right uppercase">
                             ID: {item.id.slice(-6)}
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
