import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { KnowledgeItem } from '../../types';

const KnowledgeBase: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
  
  // Create Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<KnowledgeItem['type']>('NOTE');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    setItems(StorageService.getKnowledgeItems());
  };

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
    loadItems();
    setView('LIST');
    setTitle('');
    setContent('');
  };

  const handleDelete = (id: string) => {
      StorageService.deleteKnowledgeItem(id);
      loadItems();
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white">KNOWLEDGE BASE</h2>
            <p className="text-zinc-500 font-mono text-sm">Sovereign Data Storage (Local)</p>
        </div>
        <button 
            onClick={() => setView(view === 'LIST' ? 'CREATE' : 'LIST')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded font-mono text-xs"
        >
            {view === 'LIST' ? '+ NEW ENTRY' : 'CANCEL'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
         {view === 'CREATE' ? (
             <div className="max-w-2xl mx-auto bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                 <div className="mb-4">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">TYPE</label>
                     <div className="flex gap-2">
                         {(['NOTE', 'PROMPT', 'STRATEGY'] as const).map(t => (
                             <button 
                                key={t} 
                                onClick={() => setType(t)}
                                className={`px-3 py-1 text-xs rounded border ${type === t ? 'bg-cyber-green text-black border-cyber-green' : 'bg-black text-zinc-500 border-zinc-800'}`}
                             >
                                 {t}
                             </button>
                         ))}
                     </div>
                 </div>
                 
                 <div className="mb-4">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">TITLE</label>
                     <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-cyber-green"
                     />
                 </div>

                 <div className="mb-6">
                     <label className="block text-xs font-mono text-zinc-500 mb-2">CONTENT</label>
                     <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-white h-48 resize-none outline-none focus:border-cyber-green font-mono text-sm"
                     />
                 </div>

                 <button 
                    onClick={handleSave}
                    className="w-full bg-white text-black font-bold py-3 rounded hover:bg-zinc-200"
                 >
                     SAVE ENTRY
                 </button>
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto h-full pb-10">
                 {items.length === 0 && (
                     <div className="col-span-full text-center text-zinc-600 font-mono mt-20">
                         No data stored. Create an entry.
                     </div>
                 )}
                 {items.map(item => (
                     <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded hover:border-zinc-600 transition-colors group relative">
                         <div className="flex justify-between items-start mb-2">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                 item.type === 'PROMPT' ? 'bg-purple-900 text-purple-200' :
                                 item.type === 'STRATEGY' ? 'bg-blue-900 text-blue-200' :
                                 'bg-zinc-800 text-zinc-300'
                             }`}>
                                 {item.type}
                             </span>
                             <button 
                                onClick={() => handleDelete(item.id)}
                                className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 &times;
                             </button>
                         </div>
                         <h3 className="font-bold text-white mb-2 truncate">{item.title}</h3>
                         <p className="text-sm text-zinc-400 line-clamp-4 font-mono whitespace-pre-wrap">{item.content}</p>
                         <div className="mt-4 pt-2 border-t border-zinc-800 text-[10px] text-zinc-600">
                             {new Date(item.createdAt).toLocaleDateString()}
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
