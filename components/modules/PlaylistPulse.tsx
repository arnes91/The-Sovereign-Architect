import React, { useState, useEffect } from 'react';
import { Activity, Headphones, Share2, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PlaylistMetric {
  name: string;
  genre: string;
  followers: number;
  followerTrend: number;
  monthlySaves: number;
  savesTrend: number;
  status: 'OPTIMAL' | 'NEEDS_UPDATE' | 'REVIEW';
}

const CORE_PLAYLISTS: PlaylistMetric[] = [
  { name: 'BALKAN CYBER TRAP', genre: 'Balkan Electronic', followers: 145, followerTrend: 12, monthlySaves: 58, savesTrend: 8, status: 'OPTIMAL' },
  { name: 'VOCALOID × AI UNDERGROUND', genre: 'Synthetic Pop', followers: 110, followerTrend: 5, monthlySaves: 42, savesTrend: 2, status: 'OPTIMAL' },
  { name: 'GLITCHCORE // SYSTEM_FAILURE', genre: 'Breakcore', followers: 85, followerTrend: -2, monthlySaves: 15, savesTrend: -4, status: 'NEEDS_UPDATE' },
  { name: 'CYBERPUNK CITY DRIVE', genre: 'Dark Synth', followers: 230, followerTrend: 25, monthlySaves: 95, savesTrend: 15, status: 'OPTIMAL' },
  { name: 'H4PPYPOP × AI CHAOS', genre: 'Hyperpop', followers: 45, followerTrend: 3, monthlySaves: 18, savesTrend: 1, status: 'REVIEW' },
  { name: 'LIQUID DNB // BASS SURGE', genre: 'Neurofunk', followers: 60, followerTrend: 0, monthlySaves: 20, savesTrend: -2, status: 'NEEDS_UPDATE' },
  { name: 'MULTILINGUAL UNDERGROUND', genre: 'Global Rap', followers: 90, followerTrend: 8, monthlySaves: 35, savesTrend: 6, status: 'OPTIMAL' },
  { name: 'AI × HUMAN // MIKO SESSIONS', genre: 'Collab', followers: 180, followerTrend: 15, monthlySaves: 70, savesTrend: 12, status: 'OPTIMAL' },
  { name: 'ANIME × GAMING ENERGY', genre: 'J-Electronic', followers: 150, followerTrend: 10, monthlySaves: 65, savesTrend: 5, status: 'OPTIMAL' },
  { name: '404.EMOTIONS // CHILL DIGITAL', genre: 'Ambient', followers: 310, followerTrend: 45, monthlySaves: 140, savesTrend: 25, status: 'OPTIMAL' }
];

export const PlaylistPulse: React.FC = () => {
  const [metrics, setMetrics] = useState<PlaylistMetric[]>(CORE_PLAYLISTS);
  
  // In a real scenario, this would fetch from Spotify/YouTube Studio via a backend API.
  
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="bg-black border-b border-zinc-800 p-4 flex justify-between items-center shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyber-purple" />
            PLAYLIST PULSE 2026
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Growth & Engagement Matrix for Core Ecosystem</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-1 rounded font-mono">
            TOTAL FOLLOWERS: <span className="text-white font-bold">{metrics.reduce((acc, p) => acc + p.followers, 0)}</span>
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-widest sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 font-normal">Playlist</th>
              <th className="py-3 px-4 font-normal">Lane</th>
              <th className="py-3 px-4 font-normal text-right">Followers</th>
              <th className="py-3 px-4 font-normal text-right">Saves (30d)</th>
              <th className="py-3 px-4 font-normal text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {metrics.map((playlist, idx) => (
              <tr key={idx} className="hover:bg-zinc-900/30 transition-colors group">
                <td className="py-3 px-4">
                  <div className="font-bold text-zinc-200">{playlist.name}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-mono text-zinc-500">{playlist.genre}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-white font-mono">{playlist.followers}</span>
                    <span className={`flex items-center text-[10px] font-mono ${playlist.followerTrend > 0 ? 'text-cyber-green' : playlist.followerTrend < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {playlist.followerTrend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : playlist.followerTrend < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                      {Math.abs(playlist.followerTrend)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-white font-mono">{playlist.monthlySaves}</span>
                    <span className={`flex items-center text-[10px] font-mono ${playlist.savesTrend > 0 ? 'text-cyber-green' : playlist.savesTrend < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {playlist.savesTrend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : playlist.savesTrend < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                      {Math.abs(playlist.savesTrend)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`text-[9px] font-bold font-mono px-2 py-1 rounded border uppercase tracking-wider ${
                    playlist.status === 'OPTIMAL' ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' :
                    playlist.status === 'NEEDS_UPDATE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                    'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {playlist.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlaylistPulse;
