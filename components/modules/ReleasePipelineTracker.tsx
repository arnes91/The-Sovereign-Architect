import React, { useState, useEffect } from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface ActiveTrack {
  id: string;
  title: string;
  stage: 'INBOX' | 'SELECTED' | 'PACKAGING' | 'SCHEDULED';
  blockers: string[];
  targetDate?: string;
  daysRemaining?: number;
}

const MOCK_TRACKS: ActiveTrack[] = [
  { id: '1', title: 'Neon Sabah', stage: 'SCHEDULED', blockers: [], targetDate: '2026-05-01', daysRemaining: -93 }, // past date based on mock
  { id: '2', title: 'Glitch Sevdah', stage: 'PACKAGING', blockers: ['Cover Art'], targetDate: '2026-08-15', daysRemaining: 13 },
  { id: '3', title: 'Vocaloid Zmaj', stage: 'INBOX', blockers: ['Metadata', 'Cover Art', 'Mastering'], targetDate: '2026-09-01', daysRemaining: 30 },
  { id: '4', title: 'Shadow Workflow', stage: 'SELECTED', blockers: ['Metadata'], targetDate: '2026-08-25', daysRemaining: 23 }
];

export const ReleasePipelineTracker: React.FC = () => {
  const [tracks, setTracks] = useState<ActiveTrack[]>(MOCK_TRACKS);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden">
      <div className="bg-black border-b border-zinc-800 p-4 flex justify-between items-center shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            RELEASE PIPELINE
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Active Track Status & Blockers</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tracks.map(track => (
          <div key={track.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold text-zinc-200">{track.title}</h4>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                track.stage === 'SCHEDULED' ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' :
                track.stage === 'PACKAGING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {track.stage}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 mt-3">
              {/* Blockers */}
              {track.blockers.length > 0 ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <div className="flex flex-wrap gap-1">
                    {track.blockers.map(blocker => (
                      <span key={blocker} className="text-[10px] text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded font-mono">
                        Missing: {blocker}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green" />
                  <span className="text-[10px] text-cyber-green font-mono">Fully Packaged</span>
                </div>
              )}

              {/* Timing */}
              {track.targetDate && (
                <div className="flex justify-between items-center mt-1 border-t border-zinc-800/50 pt-2">
                  <span className="text-[10px] text-zinc-500 font-mono">Target: {track.targetDate}</span>
                  <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${
                    (track.daysRemaining || 0) < 0 ? 'text-red-500' :
                    (track.daysRemaining || 0) < 14 ? 'text-amber-500' :
                    'text-zinc-400'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {(track.daysRemaining || 0) < 0 ? `OVERDUE ${Math.abs(track.daysRemaining!)}d` : `T-${track.daysRemaining}d`}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReleasePipelineTracker;
