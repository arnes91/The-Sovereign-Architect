
import React, { useState, useEffect } from 'react';
import { analyzeDataFile } from '../../services/geminiService';
import { ExternalApiService } from '../../services/externalApiService';
import { StorageService } from '../../services/storageService';
import { AnalyticsReport } from '../../types';
import ReactMarkdown from 'react-markdown';

interface UploadedFile {
    name: string;
    content: string;
    type: 'CSV' | 'JSON' | 'TSV';
}

const AnalyticsLab: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'FETCHING' | 'ANALYZING' | 'DONE'>('IDLE');
  const [showHistory, setShowHistory] = useState(false);
  const [reports, setReports] = useState<AnalyticsReport[]>(StorageService.getAnalyticsReports());

  // Reload history on mount/view toggle
  useEffect(() => {
      setReports(StorageService.getAnalyticsReports());
  }, [showHistory]);

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

  const executeAnalysis = async () => {
      if (files.length === 0) return;
      setStatus('ANALYZING');
      
      try {
          // Merge contexts
          let combinedContext = `Analyzing ${files.length} Data Sources:\n\n`;
          files.forEach((f, i) => {
              combinedContext += `--- SOURCE ${i+1}: ${f.name} (${f.type}) ---\n`;
              // Truncate large files for context window safety
              const content = f.content.length > 50000 ? f.content.substring(0, 50000) + "\n...[TRUNCATED]" : f.content;
              combinedContext += content + "\n\n";
          });

          const result = await analyzeDataFile(combinedContext, "Combined Data Context");
          setAnalysis(result || "Analysis inconclusive.");
          setStatus('DONE');

          // Save Report
          const newReport: AnalyticsReport = {
              id: Date.now().toString(),
              title: `Analysis: ${files.map(f => f.name).join(', ')}`,
              date: Date.now(),
              summary: result?.substring(0, 100) + "..." || "",
              tags: files.map(f => f.type)
          };
          StorageService.saveAnalyticsReport(newReport);
          setReports(StorageService.getAnalyticsReports());

      } catch (e) {
          console.error(e);
          setAnalysis("Error: Data too complex or context limit exceeded.");
          setStatus('DONE');
      }
  };

  const loadReport = (id: string) => {
      // In a real app, we'd store the full analysis text. 
      // For this prototype, we are just listing them. 
      // Assuming we want to re-run or view summary.
      // Let's delete for now to manage list.
      if(confirm("Delete this report record?")) {
          StorageService.deleteAnalyticsReport(id);
          setReports(StorageService.getAnalyticsReports());
      }
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
                  <div key={r.id} className="bg-zinc-900 p-4 rounded border border-zinc-800 flex justify-between items-center">
                      <div>
                          <div className="font-bold text-white mb-1">{r.title}</div>
                          <div className="text-xs text-zinc-500">{new Date(r.date).toLocaleString()}</div>
                      </div>
                      <button onClick={() => loadReport(r.id)} className="text-red-500 text-xs hover:text-red-400">DELETE</button>
                  </div>
              ))}
          </div>
      ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Input Panel */}
              <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto">
                  
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                      <h3 className="text-xs font-mono text-cyber-green mb-3 uppercase tracking-wider">Live Fetch</h3>
                      <div className="flex gap-2">
                          <button onClick={() => fetchLiveIntelligence('ALL')} disabled={status !== 'IDLE' && status !== 'DONE'} className="flex-1 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple font-bold text-xs py-2 rounded">
                              PULL LIVE METRICS
                          </button>
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
                        onClick={executeAnalysis}
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
                      <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{analysis}</ReactMarkdown>
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
