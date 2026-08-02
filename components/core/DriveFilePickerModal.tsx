import React, { useState, useEffect } from 'react';
import { WorkspaceService } from '../../services/workspaceService';
import { HardDrive, FileText, Download, X, Search, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface DriveFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: { id: string; name: string; mimeType: string; webViewLink?: string; content?: string }) => void;
}

export const DriveFilePickerModal: React.FC<DriveFilePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile
}) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingContentId, setLoadingContentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const recent = await WorkspaceService.getRecentFiles();
      setFiles(recent || []);
    } catch (err: any) {
      console.error("Failed to load drive files:", err);
      setError(err.message || "Failed to load Google Drive files. Please verify Google Sign-In.");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = async (file: any) => {
    setLoadingContentId(file.id);
    try {
      let content = "";
      if (file.mimeType.includes("document") || file.mimeType.includes("text")) {
        try {
          content = await WorkspaceService.getDocContent(file.id);
        } catch (e) {
          console.warn("Could not fetch text body from doc:", e);
        }
      }
      onSelectFile({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        content
      });
      onClose();
    } catch (e: any) {
      setError(`Failed to import file: ${e.message}`);
    } finally {
      setLoadingContentId(null);
    }
  };

  if (!isOpen) return null;

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyber-green animate-pulse" />
            <h3 className="font-mono font-bold text-sm text-white">GOOGLE DRIVE PICKER & ARCHIVE</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search Google Drive documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded pl-9 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-green"
            />
          </div>
          <button
            onClick={loadFiles}
            disabled={loading}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-500 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyber-green" />
              <span>SCANNING GOOGLE DRIVE REPOSITORY...</span>
            </div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              No files found matching current query in your Google Drive.
            </div>
          )}

          {!loading && filtered.map((file) => (
            <div 
              key={file.id}
              className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded hover:border-cyber-green/50 hover:bg-zinc-900 transition-all group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-5 h-5 text-cyber-green shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-mono font-medium text-zinc-200 truncate group-hover:text-cyber-green transition-colors">
                    {file.name}
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handlePick(file)}
                disabled={loadingContentId === file.id}
                className="px-3 py-1.5 bg-cyber-green text-black font-mono font-bold text-xs rounded hover:bg-white transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {loadingContentId === file.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    IMPORT
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <span>OAUTH SCOPE: GOOGLE DRIVE ACCESS</span>
          <span>SELECT FILE TO LOAD DIRECTLY INTO WORKSPACE</span>
        </div>
      </div>
    </div>
  );
};
