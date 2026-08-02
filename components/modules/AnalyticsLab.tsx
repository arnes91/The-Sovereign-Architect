
import React, { useState, useEffect } from 'react';
import { analyzeDataFile } from '../../services/geminiService';
import { ExternalApiService } from '../../services/externalApiService';
import { StorageService } from '../../services/storageService';
import { KeepSyncService } from '../../services/keepSyncService';
import { useAppOrchestrator } from '../../context/AppOrchestratorContext';
import { AnalyticsReport } from '../../types';
import ReactMarkdown from 'react-markdown';
import { Bookmark, Check, HardDrive, Sparkles } from 'lucide-react';

interface UploadedFile {
    name: string;
    content: string;
    type: 'CSV' | 'JSON' | 'TSV';
}

interface AnalyticsLabProps {
    demoTrigger?: string;
}

const AnalyticsLab: React.FC<AnalyticsLabProps> = ({ demoTrigger }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'FETCHING' | 'ANALYZING' | 'DONE'>('IDLE');
  const [showHistory, setShowHistory] = useState(false);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [savedKeep, setSavedKeep] = useState(false);

  const { userPersona, liveMemorySummary, logAnalytics } = useAppOrchestrator();

  // Reload history on mount/view toggle
  useEffect(() => {
      StorageService.getAnalyticsReports().then(setReports);
  }, [showHistory]);

  // --- DEMO EFFECT ---
  useEffect(() => {
      if (demoTrigger === 'SIMULATE_UPLOAD' && status === 'IDLE') {
          setStatus('FETCHING');
          
          // 1. Simulate Upload
          setTimeout(() => {
              const mockData = JSON.stringify({
                  spotify: { monthly_listeners: 125000, top_track: "Cyber Balkan", streams: 450000 },
                  youtube: { subscribers: 8500, views_last_28_days: 120000 }
              }, null, 2);
              
              setFiles([{ name: 'LIVE_DATA_PACKET.json', content: mockData, type: 'JSON' }]);
              setStatus('IDLE');
              
              // 2. Trigger Analysis automatically
              setTimeout(() => {
                  executeAnalysis(true); // Pass flag to skip empty check if needed or just rely on state
              }, 1000);
          }, 1000);
      }
  }, [demoTrigger]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles: UploadedFile[] = [];
          Array.from(e.target.files).forEach((file: File) => {
              const reader = new FileReader();
              reader.onload = (evt) => {
                  const content = evt.target?.result as string;
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  const type = ext === 'json' ? 'JSON' : ext === 'tsv' ? 'TSV' : 'CSV';
                  
                  setFiles(prev => [...prev, { name: file.name, content, type }]);
              };
              reader.readAsText(file);
          });
          setAnalysis(null);
          setStatus('IDLE');
      }
  };

  const removeFile = (idx: number) => {
      setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const fetchLiveIntelligence = async (source: 'YOUTUBE' | 'SPOTIFY' | 'ALL') => {
      setStatus('FETCHING');
      try {
          let data: any = {};
          if (source === 'YOUTUBE' || source === 'ALL') {
              data.youtube = await ExternalApiService.fetchYouTubeStats();
          }
          if (source === 'SPOTIFY' || source === 'ALL') {
              data.spotify = await ExternalApiService.fetchSpotifyStats();
          }
          
          const jsonString = JSON.stringify(data, null, 2);
          setFiles(prev => [...prev, {
              name: `LIVE_DATA_${source}_${new Date().toISOString().slice(0,10)}.json`,
              content: jsonString,
              type: 'JSON'
          }]);
          setStatus('IDLE');

      } catch (e: any) {
          console.error(e);
          alert(`Error fetching live data: ${e.message}`);
          setStatus('IDLE');
      }
  };

  const executeAnalysis = async (isDemo = false) => {
      if (files.length === 0 && !isDemo) return;
      setStatus('ANALYZING');
      
      try {
          // DEMO BYPASS
          if (isDemo) {
              setTimeout(() => {
                  const demoResult = `
### 🚀 Strategic Analysis Report

**Correlation Found:**
High correlation between *YouTube Shorts* views and *Spotify* surges. 

**Growth Opportunities:**
1. **Leverage "Cyber Balkan" Track:** Data suggests this track drives 40% of new user acquisition. Create a remix pack.
2. **Platform Arbitrage:** Your YouTube engagement is 3x higher than industry average. funnel this traffic to Spotify via pinned comments.
                  `;
                  setAnalysis(demoResult);
                  setStatus('DONE');
              }, 2500);
              return;
          }

          // Merge contexts with user persona & cross-module live memory
          let combinedContext = `[PERSONALIZED STRATEGIC ARCHETYPE & CONTEXT]:\nName: ${userPersona.name} (${userPersona.alias})\nRole: ${userPersona.role}\nBio/System: ${userPersona.bio}\nTag: ${userPersona.systemTag}\n\n[LIVE CROSS-MODULE MEMORY RECALL]:\n${liveMemorySummary || "No active context history recorded yet."}\n\nAnalyzing ${files.length} Data Sources:\n\n`;
          files.forEach((f, i) => {
              combinedContext += `--- SOURCE ${i+1}: ${f.name} (${f.type}) ---\n`;
              // Truncate large files for context window safety
              const content = f.content.length > 50000 ? f.content.substring(0, 50000) + "\n...[TRUNCATED]" : f.content;
              combinedContext += content + "\n\n";
          });

          const prompt = `Analyze the provided data specifically tailored for ${userPersona.alias}. Give actionable recommendations on cross-promoting YouTube content, Spotify tracks, and creative assets. Highlight algorithmic growth hacks, audience retention strategies, and high-impact monetization moves.`;
          const result = await analyzeDataFile(combinedContext, prompt);
          setAnalysis(result || "Analysis inconclusive.");
          setStatus('DONE');
          logAnalytics('EXECUTE_ANALYSIS', `Analyzed ${files.length} sources for ${userPersona.alias}`);

          // Save Report
          const newReport: AnalyticsReport = {
              id: Date.now().toString(),
              title: `Analysis: ${files.map(f => f.name).join(', ')}`,
              date: Date.now(),
              summary: result || "",
              tags: files.map(f => f.type)
          };
          await StorageService.saveAnalyticsReport(newReport);
          setReports(await StorageService.getAnalyticsReports());

      } catch (e) {
          console.error(e);
          setAnalysis("Error: Data too complex or context limit exceeded.");
          setStatus('DONE');
      }
  };

  const deleteReport = async (id: string) => {
      if(confirm("Delete this report record?")) {
          await StorageService.deleteAnalyticsReport(id);
          setReports(await StorageService.getAnalyticsReports());
      }
  };

  const loadReportContent = (report: AnalyticsReport) => {
      setAnalysis(report.summary);
      setShowHistory(false);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white">ANALYTICS LAB</h2>
            <p className="text-zinc-500 font-mono text-sm">Multi-Source Intelligence Ingestion</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-mono bg-zinc-800 px-3 py-1 rounded text-white">
            {showHistory ? 'BACK TO LAB' : 'HISTORY'}
        </button>
      </div>

      {showHistory ? (
          <div className="grid grid-cols-1 gap-4 overflow-y-auto">
              {reports.length === 0 && <p className="text-zinc-500">No previous reports.</p>}
              {reports.map(r => (
                  <div key={r.id} className="bg-zinc-900 p-4 rounded border border-zinc-800 flex justify-between items-center cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => loadReportContent(r)}>
                      <div>
                          <div className="font-bold text-white mb-1">{r.title}</div>
                          <div className="text-xs text-zinc-500">{new Date(r.date).toLocaleString()}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }} className="text-red-500 text-xs hover:text-red-400">DELETE</button>
                  </div>
              ))}
          </div>
      ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Input Panel */}
              <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto">
                  
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                      <h3 className="text-xs font-mono text-cyber-green mb-3 uppercase tracking-wider">Live Fetch</h3>
                      <div className="flex flex-col gap-2">
                          <button onClick={() => fetchLiveIntelligence('ALL')} disabled={status !== 'IDLE' && status !== 'DONE'} className="w-full bg-cyber-purple/20 border border-cyber-purple text-cyber-purple font-bold text-xs py-2 rounded">
                              PULL ALL METRICS
                          </button>
                          <div className="flex gap-2">
                              <button onClick={() => fetchLiveIntelligence('YOUTUBE')} disabled={status !== 'IDLE' && status !== 'DONE'} className="flex-1 bg-red-500/20 border border-red-500 text-red-500 font-bold text-xs py-2 rounded">
                                  YOUTUBE
                              </button>
                              <button onClick={() => fetchLiveIntelligence('SPOTIFY')} disabled={status !== 'IDLE' && status !== 'DONE'} className="flex-1 bg-green-500/20 border border-green-500 text-green-500 font-bold text-xs py-2 rounded">
                                  SPOTIFY
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 flex flex-col gap-4 flex-1">
                      <div className="relative border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-cyber-green transition-colors">
                          <input type="file" multiple onChange={handleFileUpload} accept=".csv,.json,.txt,.tsv" className="absolute inset-0 opacity-0 cursor-pointer" />
                          <p className="text-sm font-mono text-zinc-300">Drop Files Here</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Supports CSV, JSON, DistroKid TSV</p>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 max-h-48">
                          {files.map((f, i) => (
                              <div key={i} className="flex justify-between items-center bg-black p-2 rounded border border-zinc-800">
                                  <div className="truncate text-xs text-zinc-300 w-4/5">
                                      <span className="font-bold text-cyber-green mr-2">[{f.type}]</span>
                                      {f.name}
                                  </div>
                                  <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-400">×</button>
                              </div>
                          ))}
                      </div>

                      <button 
                        onClick={() => executeAnalysis(false)}
                        disabled={files.length === 0 || status === 'ANALYZING' || status === 'FETCHING'}
                        className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-3 rounded uppercase tracking-widest font-mono disabled:opacity-50"
                      >
                          {status === 'ANALYZING' ? 'PROCESSING...' : status === 'FETCHING' ? 'DOWNLOADING...' : 'RUN STRATEGY'}
                      </button>
                  </div>
              </div>

              {/* Output Panel */}
              <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-8 overflow-y-auto">
                  {status === 'ANALYZING' || status === 'FETCHING' ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-4">
                          <div className="w-12 h-12 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin"></div>
                          <p className="font-mono text-zinc-500 animate-pulse">
                              {status === 'FETCHING' ? 'Establishing Secure Uplink...' : 'Analyzing Cross-Reference Data...'}
                          </p>
                      </div>
                  ) : analysis ? (
                      <div className="flex flex-col h-full">
                          <div className="flex justify-end gap-2 mb-4">
                              <button
                                  onClick={async () => {
                                      await KeepSyncService.saveNote(
                                          `Analytics Rundown (${new Date().toLocaleDateString()})`,
                                          analysis,
                                          'ANALYTICS_LAB'
                                      );
                                      setSavedKeep(true);
                                      setTimeout(() => setSavedKeep(false), 2000);
                                  }}
                                  className="text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded hover:border-cyber-green hover:text-cyber-green transition-colors flex items-center gap-1.5"
                              >
                                  {savedKeep ? (
                                      <>
                                          <Check className="w-3.5 h-3.5 text-cyber-green" />
                                          <span>SAVED TO KEEP</span>
                                      </>
                                  ) : (
                                      <>
                                          <Bookmark className="w-3.5 h-3.5" />
                                          <span>SAVE TO GOOGLE KEEP</span>
                                      </>
                                  )}
                              </button>
                              <button 
                                  onClick={async () => {
                                      const newReport: AnalyticsReport = {
                                          id: Date.now().toString(),
                                          title: `Analysis: ${files.map(f => f.name).join(', ') || 'Live Intelligence'}`,
                                          date: Date.now(),
                                          summary: analysis,
                                          tags: files.map(f => f.type)
                                      };
                                      await StorageService.saveAnalyticsReport(newReport);
                                      setReports(await StorageService.getAnalyticsReports());
                                      alert('Report saved to local history.');
                                  }}
                                  className="text-xs font-mono bg-cyber-green/20 text-cyber-green border border-cyber-green px-3 py-1.5 rounded hover:bg-cyber-green hover:text-black transition-colors"
                              >
                                  SAVE LOCAL REPORT
                              </button>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto">
                              <ReactMarkdown>{analysis}</ReactMarkdown>
                          </div>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                          <p className="font-mono">Ready for Data Ingestion</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default AnalyticsLab;
