import React, { useState } from 'react';
import { analyzeDataFile } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

const AnalyticsLab: React.FC = () => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'DONE'>('IDLE');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = (evt) => setFileContent(evt.target?.result as string);
          reader.readAsText(file);
          setAnalysis(null);
          setStatus('IDLE');
      }
  };

  const executeAnalysis = async () => {
      if (!fileContent) return;
      setStatus('ANALYZING');
      try {
          const result = await analyzeDataFile(fileContent, fileName);
          setAnalysis(result || "Analysis inconclusive.");
          setStatus('DONE');
      } catch (e) {
          console.error(e);
          setAnalysis("Error: Data too complex or format unrecognized.");
          setStatus('DONE');
      }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-sans font-bold text-white">ANALYTICS LAB</h2>
        <p className="text-zinc-500 font-mono text-sm">Ingest raw data (CSV/JSON) for strategic interpretation.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Input Panel */}
          <div className="w-full md:w-1/3 bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 flex flex-col gap-6">
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-cyber-green transition-colors cursor-pointer relative">
                  <input type="file" onChange={handleFileUpload} accept=".csv,.json,.txt" className="absolute inset-0 opacity-0 cursor-pointer" />
                  <svg className="w-10 h-10 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm font-mono text-zinc-300">{fileName || "Drop Spotify/YouTube CSV here"}</p>
              </div>

              {fileContent && (
                  <div className="bg-black p-4 rounded border border-zinc-800 flex-1 overflow-hidden flex flex-col">
                      <h4 className="text-xs font-mono text-zinc-500 mb-2">RAW PREVIEW</h4>
                      <pre className="text-[10px] text-zinc-400 overflow-auto font-mono flex-1">
                          {fileContent.substring(0, 1000)}...
                      </pre>
                  </div>
              )}

              <button 
                onClick={executeAnalysis}
                disabled={!fileContent || status === 'ANALYZING'}
                className="w-full bg-cyber-purple hover:bg-fuchsia-600 text-black font-bold py-3 rounded uppercase tracking-widest font-mono disabled:opacity-50"
              >
                  {status === 'ANALYZING' ? 'INTERPRETING DATA...' : 'RUN STRATEGY'}
              </button>
          </div>

          {/* Output Panel */}
          <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-8 overflow-y-auto">
              {status === 'ANALYZING' ? (
                   <div className="h-full flex flex-col items-center justify-center space-y-4">
                       <div className="w-12 h-12 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin"></div>
                       <p className="font-mono text-zinc-500 animate-pulse">Thinking Budget: Allocated...</p>
                   </div>
              ) : analysis ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                       <p className="font-mono">Awaiting Dataset</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default AnalyticsLab;
