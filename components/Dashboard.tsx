
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { getAI } from '../services/geminiService';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { WorkspaceService, initAuth, getAccessToken, googleSignIn } from '../services/workspaceService';
import { StorageService } from '../services/storageService';
import { LoggerService, LogEntry } from '../services/loggerService';

interface DashboardProps {
    onNavigate?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const user = auth.currentUser;
  
  const [workspaceAuth, setWorkspaceAuth] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsubLogs = LoggerService.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubLogs();
  }, []);

  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setWorkspaceAuth(true);
        loadWorkspaceData();
      },
      () => setWorkspaceAuth(false)
    );
    return () => unsub();
  }, []);

  const handleWorkspaceLogin = async () => {
    try {
      await googleSignIn();
      setWorkspaceAuth(true);
      loadWorkspaceData();
    } catch (e) {
      console.error("Workspace Auth Failed", e);
    }
  };

  const handleBackup = async () => {
      try {
          const data = await StorageService.exportAllLocalData();
          const fileName = `Brzi_Architect_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          await WorkspaceService.backupToDrive(fileName, data);
          alert("Backup successfully saved to Google Drive!");
      } catch (e) {
          console.error("Backup failed", e);
          alert("Backup failed. Check console for details.");
      }
  };

  const handleRestore = async () => {
      const fileId = prompt("Enter the Google Drive File ID of the backup JSON file:");
      if (!fileId) return;
      try {
          const res = await WorkspaceService.downloadFileFromDrive(fileId);
          const data = await res; // The res is already parsed JSON from fetchWithAuth
          await StorageService.importAllLocalData(data);
          alert("Restore successful! Reloading system...");
          window.location.reload();
      } catch (e) {
          console.error("Restore failed", e);
          alert("Restore failed. Check console for details.");
      }
  };

  const loadWorkspaceData = async () => {
    setIsLoadingWorkspace(true);
    try {
      const [events, files, emails, taskList, spaces] = await Promise.all([
        WorkspaceService.getUpcomingEvents().catch(() => ({ items: [] })),
        WorkspaceService.getRecentFiles().catch(() => []),
        WorkspaceService.getRecentEmails().catch(() => []),
        WorkspaceService.getTasks().catch(() => []),
        WorkspaceService.getChatSpaces().catch(() => [])
      ]);
      if (events && events.items) setCalendarEvents(events.items);
      if (files) setRecentFiles(files);
      if (emails) setRecentEmails(emails);
      if (taskList) setTasks(taskList);
      if (spaces) setChatSpaces(spaces);
    } catch (e) {
      console.error("Failed to load workspace data", e);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const handleDisconnect = () => {
    signOut(auth).catch(console.error);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-zinc-950 text-white pb-24 font-sans">
        <header className="mb-8 border-b border-zinc-800 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl md:text-6xl font-sans font-black mb-2 tracking-tighter">THE SOVEREIGN <span className="text-cyber-green">ARCHITECT</span></h1>
                    <p className="text-zinc-500 font-mono text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em]">System Version: 3.0 // Vibe: Balkan Cyberpunk</p>
                </div>
                <div className="text-left md:text-right flex flex-wrap md:block gap-4">
                    <div className="mb-2">
                        <div className="text-xs font-mono text-zinc-600">ACTIVE_USER</div>
                        <div className="text-sm font-mono text-white">{user?.displayName || user?.email || 'GUEST_ENTITY'}</div>
                    </div>
                    <div className="flex gap-2">
                        {!workspaceAuth && (
                           <button 
                              onClick={handleWorkspaceLogin}
                              className="px-4 py-2 border border-blue-500/50 text-blue-500 font-mono text-xs hover:bg-blue-500 hover:text-white transition-colors uppercase tracking-widest rounded"
                           >
                              CONNECT WORKSPACE
                           </button>
                        )}
                        {workspaceAuth && (
                           <>
                             <button 
                                onClick={handleBackup}
                                className="px-4 py-2 border border-cyber-green/50 text-cyber-green font-mono text-xs hover:bg-cyber-green hover:text-black transition-colors uppercase tracking-widest rounded"
                             >
                                BACKUP TO DRIVE
                             </button>
                             <button 
                                onClick={handleRestore}
                                className="px-4 py-2 border border-yellow-500/50 text-yellow-500 font-mono text-xs hover:bg-yellow-500 hover:text-black transition-colors uppercase tracking-widest rounded"
                             >
                                RESTORE FROM DRIVE
                             </button>
                           </>
                        )}
                        <button 
                            onClick={handleDisconnect}
                            className="px-4 py-2 border border-red-500/50 text-red-500 font-mono text-xs hover:bg-red-500 hover:text-white transition-colors uppercase tracking-widest rounded"
                        >
                            DISCONNECT
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Pods Grid */}
        <h2 className="text-xs md:text-sm font-mono text-zinc-500 mb-3 uppercase tracking-widest">Main Modules (Pods)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {/* Knowledge Base Pod */}
            <button
                onClick={() => onNavigate?.(View.KNOWLEDGE_BASE)}
                className="group relative bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-cyber-green transition-all duration-300 overflow-hidden text-left shadow-[0_0_15px_rgba(16,185,129,0.0)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
                <div className="absolute inset-0 bg-cyber-green/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight group-hover:text-cyber-green transition-colors">THE HIPPOCAMPUS</h3>
                    <p className="text-zinc-400 text-xs font-mono leading-relaxed">Knowledge Base. Store Universal and Contextual nodes. Run Neural Defrag synthesis.</p>
                </div>
            </button>

            {/* Active Sessions Pod */}
            <button
                onClick={() => onNavigate?.(View.LIVE_UPLINK)}
                className="group relative bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-blue-500 transition-all duration-300 overflow-hidden text-left hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            >
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight group-hover:text-blue-500 transition-colors">THE ECHO</h3>
                    <p className="text-zinc-400 text-xs font-mono leading-relaxed">Active Chat Sessions. Multi-persona architecture with RAG context injection.</p>
                </div>
            </button>

            {/* Visualizer Factory Pod */}
            <button
                onClick={() => onNavigate?.(View.VISUALIZER)}
                className="group relative bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-cyber-purple transition-all duration-300 overflow-hidden text-left hover:shadow-[0_0_15px_rgba(255,0,255,0.2)]"
            >
                <div className="absolute inset-0 bg-cyber-purple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight group-hover:text-cyber-purple transition-colors">VISUALIZER FACTORY</h3>
                    <p className="text-zinc-400 text-xs font-mono leading-relaxed">Live VJ and Studio export. Audio reactive GLSL shaders and ABNORMALISM auto-VJ.</p>
                </div>
            </button>

            {/* System Status Node Pod */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight">SYSTEM STATUS</h3>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500">CORE</span>
                            <span className="text-cyber-green">ONLINE</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500">NEURAL_NET</span>
                            <span className="text-cyber-green">SYNCED</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500">WORKSPACE</span>
                            <span className={workspaceAuth ? "text-cyber-green" : "text-zinc-600"}>{workspaceAuth ? "LINKED" : "OFFLINE"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* WORKSPACE NEXUS */}
        {workspaceAuth && (
            <>
                <h2 className="text-xs md:text-sm font-mono text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Google Workspace Nexus
                </h2>
                
                {isLoadingWorkspace ? (
                    <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded bg-zinc-900/50">SYNCING WITH GOOGLE SERVERS...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* CALENDAR */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-xs font-bold font-mono text-blue-400 mb-4 border-b border-zinc-800 pb-2">CALENDAR_SYNC</h3>
                            <div className="space-y-3">
                                {calendarEvents.length === 0 ? (
                                    <div className="text-xs text-zinc-600 font-mono">No upcoming events detected.</div>
                                ) : (
                                    calendarEvents.map((ev: any, idx) => (
                                        <div key={ev.id || `cal-${ev.summary || ''}-${idx}`} className="group p-3 border border-zinc-800/50 rounded hover:border-blue-500/30 bg-black transition-colors">
                                            <div className="text-sm font-bold text-zinc-200 mb-1 truncate">{ev.summary}</div>
                                            <div className="text-[10px] font-mono text-zinc-500">
                                                {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString() : ev.start?.date}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* DRIVE */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-xs font-bold font-mono text-emerald-400 mb-4 border-b border-zinc-800 pb-2">DRIVE_UPLINK</h3>
                            <div className="space-y-3">
                                {recentFiles.length === 0 ? (
                                    <div className="text-xs text-zinc-600 font-mono">No recent files detected.</div>
                                ) : (
                                    recentFiles.slice(0, 5).map((file: any, idx) => (
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" key={file.id || `file-${file.name || ''}-${idx}`} className="block group p-3 border border-zinc-800/50 rounded hover:border-emerald-500/30 bg-black transition-colors">
                                            <div className="text-sm font-bold text-zinc-200 mb-1 truncate group-hover:text-emerald-400">{file.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-500 truncate">
                                                {file.mimeType}
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* GMAIL */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-xs font-bold font-mono text-red-400 mb-4 border-b border-zinc-800 pb-2">INBOX_STREAM</h3>
                            <div className="space-y-3">
                                {recentEmails.length === 0 ? (
                                    <div className="text-xs text-zinc-600 font-mono">Inbox is empty.</div>
                                ) : (
                                    recentEmails.map((email: any, idx) => {
                                        const headers = email.payload?.headers || [];
                                        const subject = headers.find((h:any) => h.name === 'Subject')?.value || 'No Subject';
                                        const from = headers.find((h:any) => h.name === 'From')?.value || 'Unknown';
                                        return (
                                            <div key={email.id || `email-${idx}`} className="group p-3 border border-zinc-800/50 rounded hover:border-red-500/30 bg-black transition-colors">
                                                <div className="text-sm font-bold text-zinc-200 mb-1 truncate">{subject}</div>
                                                <div className="text-[10px] font-mono text-zinc-500 truncate">{from}</div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* TASKS */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-xs font-bold font-mono text-amber-400 mb-4 border-b border-zinc-800 pb-2">ACTIVE_TASKS</h3>
                            <div className="space-y-3">
                                {tasks.length === 0 ? (
                                    <div className="text-xs text-zinc-600 font-mono">No active tasks.</div>
                                ) : (
                                    tasks.slice(0, 5).map((task: any, idx) => (
                                        <div key={task.id || `task-${task.title || ''}-${idx}`} className="group p-3 border border-zinc-800/50 rounded hover:border-amber-500/30 bg-black transition-colors flex gap-3 items-start">
                                            <div className="mt-1 w-3 h-3 rounded-full border border-amber-500/50 flex-shrink-0"></div>
                                            <div>
                                                <div className="text-sm font-bold text-zinc-200 mb-1">{task.title}</div>
                                                {task.notes && <div className="text-[10px] font-mono text-zinc-500 line-clamp-2">{task.notes}</div>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* CHAT SPACES */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 lg:col-span-2">
                            <h3 className="text-xs font-bold font-mono text-purple-400 mb-4 border-b border-zinc-800 pb-2">COMMS_LINK_SPACES</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {chatSpaces.length === 0 ? (
                                    <div className="text-xs text-zinc-600 font-mono">No spaces found.</div>
                                ) : (
                                    chatSpaces.slice(0, 4).map((space: any, idx) => (
                                        <div key={space.name || space.id || `space-${idx}`} className="group p-3 border border-zinc-800/50 rounded hover:border-purple-500/30 bg-black transition-colors flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                                                #
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-zinc-200 truncate">{space.displayName || space.name}</div>
                                                <div className="text-[10px] font-mono text-zinc-500">{space.type}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
        {/* CYBER SYSTEMS OBSERVABILITY LOGS */}
        <div className="mt-10 border border-zinc-800 bg-zinc-950 rounded-xl p-6 font-mono relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[9px] text-zinc-700 tracking-widest uppercase">Telemetry Stream</div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-cyber-green flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping"></span>
                SOVEREIGN_SYSTEMS_LOGS
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Real-time persistent telemetry and neural process logs.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'SYSTEM', 'AGENT', 'WORKSPACE', 'ERROR', 'ANALYTICS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLogFilter(cat)}
                  className={`px-2 py-1 text-[10px] border transition-all ${
                    logFilter === cat 
                      ? 'bg-cyber-green/10 text-cyber-green border-cyber-green' 
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => LoggerService.clearLogs()}
                className="px-2 py-1 text-[10px] border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-all ml-2"
              >
                PURGE LOGS
              </button>
            </div>
          </div>

          <div className="bg-black/60 border border-zinc-900 rounded p-4 h-64 overflow-y-auto text-xs space-y-2 select-text">
            {logs
              .filter(l => logFilter === 'ALL' || l.category === logFilter)
              .slice()
              .reverse()
              .map((log, idx) => {
                let color = 'text-zinc-400';
                if (log.category === 'SYSTEM') color = 'text-blue-400';
                if (log.category === 'AGENT') color = 'text-[#ff00ff]';
                if (log.category === 'WORKSPACE') color = 'text-emerald-400';
                if (log.category === 'ERROR') color = 'text-red-400 font-bold';
                if (log.category === 'ANALYTICS') color = 'text-amber-400';

                return (
                  <div key={log.id ? `${log.id}-${idx}` : `log-${idx}`} className="border-b border-zinc-900/40 pb-1.5 last:border-0 hover:bg-zinc-900/30 px-1 transition-all">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-zinc-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`text-[10px] border px-1 ${color} border-current/20 bg-current/5 rounded font-bold`}>{log.category}</span>
                      <span className="text-zinc-200 break-all">{log.message}</span>
                    </div>
                    {log.metadata && (
                      <pre className="mt-1 text-[10px] text-zinc-500 overflow-x-auto whitespace-pre-wrap bg-zinc-950/50 p-2 border border-zinc-900/50 rounded">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            {logs.filter(l => logFilter === 'ALL' || l.category === logFilter).length === 0 && (
              <div className="text-zinc-600 text-center py-10 font-mono italic">No telemetry logs found in this category.</div>
            )}
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
