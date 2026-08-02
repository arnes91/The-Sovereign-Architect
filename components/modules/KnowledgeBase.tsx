
import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { KnowledgeItem } from '../../types';
import { synthesizeKnowledgeBase } from '../../services/geminiService';
import { WorkspaceService, loadGooglePicker, FIREBASE_CONFIG } from '../../services/workspaceService';
import { DriveFilePickerModal } from '../core/DriveFilePickerModal';
import { contextBus } from '../../services/contextBusService';
import { Bookmark, CheckSquare, Mail, HardDrive, Zap, Share2 } from 'lucide-react';
import { useAppOrchestrator } from '../../context/AppOrchestratorContext';

const KnowledgeBase: React.FC = () => {
  const { logAnalytics } = useAppOrchestrator();
  // Initialize from storage synchronously to prevent empty flash/loss
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [view, setView] = useState<'LIST' | 'CREATE' | 'SYNTHESIS_MODE'>('LIST');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'UNIVERSAL' | 'CONTEXTUAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<KnowledgeItem['type']>('UNIVERSAL');
  
  // Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [manualDocUrl, setManualDocUrl] = useState('');
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importIsError, setImportIsError] = useState(false);
  
  // Drive Picker Modal State
  const [isDrivePickerModalOpen, setIsDrivePickerModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Reload when component mounts just in case
  useEffect(() => {
    StorageService.getKnowledgeItems().then(setItems);
  }, []);

  const filteredItems = items.filter(item => {
      const matchesType = filterType === 'ALL' || item.type === filterType;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
  });

  const notifyStatus = (msg: string) => {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleSave = async () => {
    if (!title || !content) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      type,
      title,
      content,
      tags: [],
      createdAt: Date.now()
    };
    await StorageService.saveKnowledgeItem(newItem);
    logAnalytics('KNOWLEDGE_ITEM_SAVED', newItem.title, newItem);
    await contextBus.publish({
      sourceModule: 'KNOWLEDGE_BASE',
      type: 'ITEM_CREATED',
      title: newItem.title,
      payload: newItem
    });
    setItems(await StorageService.getKnowledgeItems()); // Update local state immediately
    setView('LIST');
    setTitle('');
    setContent('');
  };

  const handleSaveToKeep = async (item: KnowledgeItem) => {
    try {
      notifyStatus(`Saving "${item.title}" to Google Keep...`);
      await WorkspaceService.createKeepNote(item.title, item.content);
      await contextBus.publish({
        sourceModule: 'KNOWLEDGE_BASE',
        type: 'KEEP_SAVED',
        title: item.title,
        payload: item
      });
      notifyStatus(`Saved "${item.title}" to Google Keep!`);
    } catch (e: any) {
      notifyStatus(`Keep sync note: Saved to local/Firestore backup.`);
    }
  };

  const handleCreateTask = async (item: KnowledgeItem) => {
    try {
      notifyStatus(`Creating Google Task for "${item.title}"...`);
      await WorkspaceService.createTask(item.title, item.content);
      await contextBus.publish({
        sourceModule: 'KNOWLEDGE_BASE',
        type: 'TASK_DISPATCHED',
        title: item.title,
        payload: item
      });
      notifyStatus(`Task "${item.title}" created!`);
    } catch (e: any) {
      notifyStatus(`Task error: ${e.message}`);
    }
  };

  const handleBackupToDrive = async (item: KnowledgeItem) => {
    try {
      notifyStatus(`Backing up "${item.title}" to Google Drive...`);
      await WorkspaceService.backupToDrive(`${item.title.replace(/[^a-z0-9]/gi, '_')}.json`, item);
      await contextBus.publish({
        sourceModule: 'KNOWLEDGE_BASE',
        type: 'DRIVE_BACKUP',
        title: item.title,
        payload: item
      });
      notifyStatus(`Backed up "${item.title}" to Drive!`);
    } catch (e: any) {
      notifyStatus(`Drive backup error: ${e.message}`);
    }
  };

  const handleSendEmail = async (item: KnowledgeItem) => {
    const toEmail = prompt("Enter recipient email:", "arnes.osmic@gmail.com");
    if (!toEmail) return;
    try {
      notifyStatus(`Sending email to ${toEmail}...`);
      await WorkspaceService.sendEmail(toEmail, `[Knowledge Core] ${item.title}`, item.content);
      notifyStatus(`Email sent to ${toEmail}!`);
    } catch (e: any) {
      notifyStatus(`Email error: ${e.message}`);
    }
  };

  const handleSyncToLive = async (item: KnowledgeItem) => {
    try {
      await StorageService.saveLiveMemory(`[KB Node: ${item.title}] ${item.content}`);
      await contextBus.publish({
        sourceModule: 'KNOWLEDGE_BASE',
        type: 'MEMORY_EVOLVED',
        title: item.title,
        payload: item
      });
      notifyStatus(`Synced "${item.title}" to Live Uplink Memory!`);
    } catch (e: any) {
      notifyStatus(`Live Sync Error: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Permanently delete this knowledge node?")) {
          await StorageService.deleteKnowledgeItem(id);
          setItems(await StorageService.getKnowledgeItems());
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
          const chats = await StorageService.getChatHistory();
          const reports = await StorageService.getAnalyticsReports();
          const existingNotes = (await StorageService.getKnowledgeItems()).map(i => `[${i.type}] ${i.title}: ${i.content}`);
          
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
              for (const item of synthesizedData) {
                  if (item.title && item.content) {
                      await StorageService.saveKnowledgeItem({
                          id: Date.now().toString() + Math.random(),
                          type: item.type === 'CONTEXTUAL' ? 'CONTEXTUAL' : 'UNIVERSAL',
                          title: `[SYNTH] ${item.title}`,
                          content: item.content,
                          tags: item.tags || ['ai-generated'],
                          createdAt: Date.now()
                      });
                      count++;
                  }
              }
          }
          
          setItems(await StorageService.getKnowledgeItems());
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

  const handleManualImport = async () => {
      if (!manualDocUrl.trim()) return;
      setIsImportLoading(true);
      setImportMessage("PARSING DOCUMENT TARGET...");
      setImportIsError(false);
      
      try {
          let docId = manualDocUrl.trim();
          const match = docId.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
              docId = match[1];
          }
          
          setImportMessage("LINKING NEURAL ARCHIVE...");
          const content = await WorkspaceService.getDocContent(docId);
          if (!content) {
              throw new Error("Document is empty or access denied.");
          }
          
          const newItem: KnowledgeItem = {
              id: Date.now().toString(),
              type: 'CONTEXTUAL',
              title: `[MANUAL DRIVE] Doc ${docId.substring(0, 8)}`,
              content,
              tags: ['google-drive', 'manual-imported'],
              createdAt: Date.now()
          };
          
          await StorageService.saveKnowledgeItem(newItem);
          setItems(await StorageService.getKnowledgeItems());
          setImportMessage("INTELLIGENCE INGESTED SUCCESSFULLY!");
          setManualDocUrl('');
          setTimeout(() => {
              setIsImportModalOpen(false);
              setImportMessage(null);
          }, 1500);
          
      } catch (e: any) {
          console.error("Manual doc import failed", e);
          setImportIsError(true);
          setImportMessage(`INGESTION FAILED: ${e.message || e}`);
      } finally {
          setIsImportLoading(false);
      }
  };

  const handlePickerImport = () => {
      setIsImportModalOpen(false);
      setIsDrivePickerModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col p-6 relative bg-black">
      
      {/* Feedback Toast */}
      {copyFeedback && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-cyber-green text-black font-bold font-mono px-4 py-2 rounded shadow-[0_0_15px_#00ff41] z-50">
              {copyFeedback}
          </div>
      )}

      {/* Import Document Gateway Modal */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 max-w-lg w-full font-mono relative overflow-hidden shadow-2xl text-left">
                  <div className="absolute top-0 right-0 p-2 text-[9px] text-zinc-700 tracking-widest uppercase">Drive Gateway</div>
                  
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                      GOOGLE_DOC_IMPORT_GATEWAY
                  </h3>
                  <p className="text-[10px] text-zinc-500 mb-6 uppercase">Sync Google Docs directly into the Knowledge Database.</p>
                  
                  {importMessage && (
                      <div className={`p-4 rounded text-xs mb-6 border ${importIsError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-300 animate-pulse'}`}>
                          {importMessage}
                      </div>
                  )}

                  <div className="space-y-4">
                      <button
                          onClick={handlePickerImport}
                          disabled={isImportLoading}
                          className="w-full bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 font-bold py-3 px-4 rounded text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14,2H4.86c-1.58,0-2.86,1.28-2.86,2.86v14.28C2,20.72,3.28,22,4.86,22h14.28c1.58,0,2.86-1.28,2.86-2.86V4.86 C22,3.28,20.72,2,19.14,2z M15,13H9v-2h6V13z M15,17H9v-2h6V17z M15,9H9V7h6V9z"/></svg>
                          LAUNCH_GOOGLE_PICKER
                      </button>

                      <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-zinc-800"></div>
                          <span className="flex-shrink mx-4 text-[10px] text-zinc-600 uppercase">OR DIRECT PROXY INGEST</span>
                          <div className="flex-grow border-t border-zinc-800"></div>
                      </div>

                      <div>
                          <label className="block text-[10px] text-zinc-500 mb-2 uppercase">Google Doc Link or ID</label>
                          <input
                              type="text"
                              value={manualDocUrl}
                              onChange={(e) => setManualDocUrl(e.target.value)}
                              placeholder="https://docs.google.com/document/d/.../edit"
                              className="w-full bg-black border border-zinc-800 rounded p-3 text-xs text-zinc-300 focus:border-blue-500 outline-none placeholder-zinc-700"
                              disabled={isImportLoading}
                          />
                      </div>

                      <button
                          onClick={handleManualImport}
                          disabled={isImportLoading || !manualDocUrl.trim()}
                          className="w-full bg-zinc-900 border border-zinc-700 hover:border-white text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-widest transition-all disabled:opacity-40"
                      >
                          MANUAL_INGEST_PAYLOAD
                      </button>
                  </div>

                  <div className="mt-8 pt-4 border-t border-zinc-900 flex justify-end">
                      <button
                          onClick={() => setIsImportModalOpen(false)}
                          className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-all text-xs uppercase"
                      >
                          CLOSE GATEWAY
                      </button>
                  </div>
              </div>
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
                        onClick={() => setIsDrivePickerModalOpen(true)}
                        className="bg-[#39c5bb] border border-[#39c5bb] hover:bg-white hover:text-black text-black px-4 py-2 rounded font-mono text-xs font-bold transition-colors flex items-center gap-2"
                    >
                        <HardDrive className="w-3.5 h-3.5" />
                        DRIVE PICKER
                    </button>
                    <button 
                        onClick={() => {
                            setIsImportModalOpen(true);
                            setImportMessage(null);
                            setImportIsError(false);
                        }}
                        className="bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white px-4 py-2 rounded font-mono text-xs font-bold transition-colors flex items-center gap-2"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14,2H4.86c-1.58,0-2.86,1.28-2.86,2.86v14.28C2,20.72,3.28,22,4.86,22h14.28c1.58,0,2.86-1.28,2.86-2.86V4.86 C22,3.28,20.72,2,19.14,2z M15,13H9v-2h6V13z M15,17H9v-2h6V17z M15,9H9V7h6V9z"/></svg>
                        IMPORT DOC
                    </button>
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
                        setType('CONTEXTUAL');
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
                     {(['ALL', 'UNIVERSAL', 'CONTEXTUAL'] as const).map(t => (
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
                         {(['UNIVERSAL', 'CONTEXTUAL'] as const).map(t => (
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
                 {filteredItems.map((item, idx) => (
                     <div key={item.id ? `${item.id}-${idx}` : `kb-${idx}`} className="bg-zinc-900 border border-zinc-800 p-5 rounded hover:border-zinc-500 transition-all group relative flex flex-col shadow-lg">
                         <div className="flex justify-between items-start mb-3">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                 item.type === 'UNIVERSAL' ? 'bg-purple-900/30 text-purple-300 border-purple-800' :
                                 'bg-blue-900/30 text-blue-300 border-blue-800'
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
                         
                         {item.type === 'UNIVERSAL' && (
                             <button 
                                onClick={() => handleCopy(item.content)}
                                className="w-full bg-zinc-800 hover:bg-cyber-green hover:text-black hover:border-cyber-green text-[10px] text-zinc-400 py-2.5 rounded font-mono border border-zinc-700 transition-all font-bold flex items-center justify-center gap-2"
                             >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                COPY UNIVERSAL NODE
                             </button>
                         )}
                         
                         {item.type !== 'UNIVERSAL' && (
                             <div className="flex gap-1 flex-wrap mb-2">
                                 {item.tags.map((tag, i) => (
                                     <span key={i} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{tag}</span>
                                 ))}
                             </div>
                         )}

                         {/* Cross-Module Workspace Actions */}
                         <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1 text-[10px] font-mono text-zinc-400">
                           <button 
                             onClick={() => handleSaveToKeep(item)}
                             title="Save to Google Keep"
                             className="p-1.5 hover:bg-yellow-500/20 hover:text-yellow-400 rounded transition-colors flex items-center gap-1"
                           >
                             <Bookmark className="w-3 h-3" />
                             <span className="hidden xl:inline">KEEP</span>
                           </button>

                           <button 
                             onClick={() => handleCreateTask(item)}
                             title="Create Google Task"
                             className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-colors flex items-center gap-1"
                           >
                             <CheckSquare className="w-3 h-3" />
                             <span className="hidden xl:inline">TASK</span>
                           </button>

                           <button 
                             onClick={() => handleBackupToDrive(item)}
                             title="Backup to Google Drive"
                             className="p-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 rounded transition-colors flex items-center gap-1"
                           >
                             <HardDrive className="w-3 h-3" />
                             <span className="hidden xl:inline">DRIVE</span>
                           </button>

                           <button 
                             onClick={() => handleSendEmail(item)}
                             title="Send via Email"
                             className="p-1.5 hover:bg-purple-500/20 hover:text-purple-400 rounded transition-colors flex items-center gap-1"
                           >
                             <Mail className="w-3 h-3" />
                             <span className="hidden xl:inline">GMAIL</span>
                           </button>

                           <button 
                             onClick={() => handleSyncToLive(item)}
                             title="Sync with Live Uplink"
                             className="p-1.5 hover:bg-cyber-green/20 hover:text-cyber-green rounded transition-colors flex items-center gap-1"
                           >
                             <Zap className="w-3 h-3" />
                             <span className="hidden xl:inline">LIVE</span>
                           </button>
                         </div>

                         <div className="mt-2 text-[9px] text-zinc-600 font-mono text-right uppercase">
                             ID: {item.id.slice(-6)}
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </div>

      {/* Action Toast Notification */}
      {actionStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-cyber-green text-cyber-green text-xs font-mono px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 animate-pulse" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Built-in Drive Picker Modal */}
      <DriveFilePickerModal 
        isOpen={isDrivePickerModalOpen}
        onClose={() => setIsDrivePickerModalOpen(false)}
        onSelectFile={async (file) => {
          const newItem: KnowledgeItem = {
            id: file.id,
            type: 'CONTEXTUAL',
            title: `[DRIVE] ${file.name}`,
            content: file.content || `Imported Google Drive Document: ${file.name}\nView Link: ${file.webViewLink || 'N/A'}`,
            tags: ['google-drive', 'imported'],
            createdAt: Date.now()
          };
          await StorageService.saveKnowledgeItem(newItem);
          logAnalytics('DRIVE_FILE_IMPORTED', file.name, newItem);
          await contextBus.publish({
            sourceModule: 'KNOWLEDGE_BASE',
            type: 'ITEM_CREATED',
            title: newItem.title,
            payload: newItem
          });
          setItems(await StorageService.getKnowledgeItems());
          notifyStatus(`Imported "${file.name}" into Knowledge Core!`);
        }}
      />
    </div>
  );
};

export default KnowledgeBase;
