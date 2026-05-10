import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  File,
  HardDrive,
  Search,
  Upload,
  Trash2,
  Edit3,
  MoreVertical,
  Download,
  Info,
  Loader2,
  Plus,
  Brain,
  Database,
  Sparkles,
  CheckCircle2,
  Clock,
  FileCode,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeEntry {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  type: 'file';
  source: 'upload' | 'generated' | 'ingested';
  agentIds: string[];
  status: 'ready' | 'indexing' | 'indexed';
  updatedAt: string;
  createdAt: string;
}

export function NeuralFileManager({ t }: { t: any }) {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [ingestingFile, setIngestingFile] = useState<string | null>(null);

  useEffect(() => { fetchFiles(); }, []);
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setAgents(d);
        else if (d.agents) setAgents(d.agents);
      })
      .catch(() => {});
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/files/list');
      if (res.ok) {
        const data = await res.json();
        setItems(data.files || []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(`Uploaded ${files.length} file(s)`);
        fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Connection error during upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, itemId });
  };

  const deleteItem = async (id: string) => {
    if (!confirm(`Delete "${id}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/files/delete/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(`Deleted: ${id}`);
        fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Deletion failed');
      }
    } catch {
      toast.error('Deletion failed');
    }
    setContextMenu(null);
  };

  const downloadItem = async (id: string) => {
    try {
      const res = await fetch(`/api/files/download/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = id;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
    setContextMenu(null);
  };

  const renameItem = async (id: string) => {
    const newName = prompt('Enter new name:', id);
    if (!newName || newName === id) return;
    try {
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newName }),
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('Renamed');
        fetchFiles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Rename failed');
      }
    } catch {
      toast.error('Rename failed');
    }
    setContextMenu(null);
  };

  const showFileInfo = async (id: string) => {
    try {
      const res = await fetch(`/api/files/info/${encodeURIComponent(id)}`);
      if (res.ok) {
        const info = await res.json();
        const agentLabel = info.agentIds?.length > 0
          ? `\nAgents: ${info.agentIds.join(', ')}`
          : '';
        toast.info(`${info.name}\n${info.formattedSize} · ${info.source} · ${info.status}${agentLabel}\nModified: ${new Date(info.updatedAt).toLocaleString()}`);
      }
    } catch {
      toast.error('Failed to get file info');
    }
    setContextMenu(null);
  };

  const ingestToAgent = async (fileId: string) => {
    if (!selectedAgentId) {
      toast.error('Select an agent first in the toolbar');
      return;
    }
    setIngestingFile(fileId);
    setContextMenu(null);
    try {
      const res = await fetch('/api/files/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, agentId: selectedAgentId }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Ingested into agent memory (${data.chunkCount} chunks)`);
        fetchFiles();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ingest failed');
      }
    } catch {
      toast.error('Connection error during ingest');
    } finally {
      setIngestingFile(null);
    }
  };

  const previewFile = async (item: KnowledgeEntry) => {
    const textExts = ['.txt', '.md', '.json', '.csv', '.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css', '.yaml', '.yml', '.toml', '.xml', '.log', '.env', '.sh', '.bat'];
    const ext = '.' + item.name.split('.').pop()?.toLowerCase();
    if (textExts.includes(ext) && item.rawSize > 0) {
      try {
        const res = await fetch(`/api/files/download/${encodeURIComponent(item.id)}`);
        if (res.ok) {
          const text = await res.text();
          const w = window.open('', '_blank', 'width=800,height=600');
          if (w) {
            w.document.title = item.name;
            w.document.body.innerHTML = `<pre style="font-family:monospace;font-size:13px;padding:16px;white-space:pre-wrap;word-break:break-all;background:#0a0a0a;color:#e0e0e0">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
          }
        }
      } catch {
        toast.info(`Cannot preview ${item.name}`);
      }
    } else {
      toast.info(`Preview not available for this file type. Use Download instead.`);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sourceBadge = (source: string) => {
    switch (source) {
      case 'upload':
        return { label: 'Upload', icon: <Upload size={10} />, cls: 'bg-blue-500/10 border-blue-500/30 text-blue-400' };
      case 'generated':
        return { label: 'Generated', icon: <Sparkles size={10} />, cls: 'bg-purple-500/10 border-purple-500/30 text-purple-400' };
      case 'ingested':
        return { label: 'Ingested', icon: <Download size={10} />, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
      default:
        return { label: source, icon: <File size={10} />, cls: 'bg-white/5 border-white/10 text-white/40' };
    }
  };

  const statusBadge = (status: string, isIngesting: boolean) => {
    if (isIngesting) {
      return { label: 'Indexing...', icon: <Loader2 size={10} className="animate-spin" />, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
    }
    switch (status) {
      case 'indexed':
        return { label: 'Indexed', icon: <CheckCircle2 size={10} />, cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
      case 'indexing':
        return { label: 'Indexing', icon: <Loader2 size={10} className="animate-spin" />, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
      default:
        return { label: 'Ready', icon: <Clock size={10} />, cls: 'bg-white/5 border-white/10 text-white/40' };
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-black/30 text-white font-sans relative"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleUpload(e.dataTransfer.files);
      }}
      onClick={() => setContextMenu(null)}
    >
      {/* Header Toolbar */}
      <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-2 mr-2">
          <Database size={16} className="text-celestial-saturn" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
            {t.neuralVault || 'AI Knowledge Base'}
          </span>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchShards || "Search knowledge files..."}
            className="bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[10px] font-bold w-56 focus:border-celestial-saturn/50 outline-none transition-all"
          />
        </div>

        {agents.length > 0 && (
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-full py-2 px-4 text-[10px] font-bold text-white/60 outline-none focus:border-amber-500/50 transition-all"
          >
            <option value="">Ingest target agent...</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {ingestingFile && (
          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            Ingesting...
          </span>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center bg-celestial-saturn/10 text-celestial-saturn hover:bg-celestial-saturn/20 rounded-xl transition-all border border-celestial-saturn/20"
        >
          <Plus size={18} />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
          />
        </button>
      </div>

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40 gap-4">
            <Loader2 size={32} className="animate-spin text-celestial-saturn" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Loading Knowledge Base...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center text-white/20 gap-4 opacity-50"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          >
            <Database size={48} strokeWidth={1} />
            <span className="text-xs font-black uppercase tracking-widest">
              {searchQuery ? 'No matching files' : (t.noDataShards || 'Drop files or generate content to begin')}
            </span>
            {!searchQuery && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-celestial-saturn/10 border border-celestial-saturn/20 text-celestial-saturn text-[10px] font-bold uppercase tracking-widest hover:bg-celestial-saturn/20 transition-all"
              >
                Upload First File
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => {
              const src = sourceBadge(item.source);
              const st = statusBadge(item.status, ingestingFile === item.id);
              const isIndexed = item.agentIds.length > 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onDoubleClick={() => previewFile(item)}
                  onContextMenu={(e) => handleContextMenu(e, item.id)}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all group cursor-pointer border border-white/5 hover:border-white/10 relative"
                >
                  {/* File icon */}
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <File size={24} className="text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>

                  {/* Name */}
                  <div className="text-[10px] font-bold text-white/70 truncate leading-tight group-hover:text-white transition-colors">
                    {item.name}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase ${src.cls}`}>
                      {src.icon}
                      {src.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase ${st.cls}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  </div>

                  {/* Agent tags */}
                  {isIndexed && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Brain size={10} className="text-emerald-400/60" />
                      {item.agentIds.slice(0, 2).map(aid => (
                        <span key={aid} className="text-[7px] font-bold text-emerald-400/50 uppercase bg-emerald-500/5 px-1.5 py-0.5 rounded">
                          {agents.find(a => a.id === aid)?.name || aid.slice(0, 6)}
                        </span>
                      ))}
                      {item.agentIds.length > 2 && (
                        <span className="text-[7px] font-bold text-white/20">+{item.agentIds.length - 2}</span>
                      )}
                    </div>
                  )}

                  {/* Size & date */}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[8px] font-bold text-white/20 uppercase">{item.size}</span>
                    <span className="text-[8px] font-bold text-white/10">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] w-48 glass-dark rounded-2xl border border-white/10 p-2 shadow-2xl backdrop-blur-3xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {[
              { label: 'Download', icon: <Download size={14} />, action: () => downloadItem(contextMenu.itemId) },
              { label: 'Rename', icon: <Edit3 size={14} />, action: () => renameItem(contextMenu.itemId) },
              { label: 'Ingest to Agent', icon: <Brain size={14} />, action: () => ingestToAgent(contextMenu.itemId), color: 'text-amber-400 hover:bg-amber-500/20' },
              { label: 'File Info', icon: <Info size={14} />, action: () => showFileInfo(contextMenu.itemId) },
              { label: 'Delete', icon: <Trash2 size={14} />, color: 'text-red-400 hover:bg-red-500/20', action: () => deleteItem(contextMenu.itemId) },
            ].map((action, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); action.action(); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  action.color || 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-celestial-saturn/10 backdrop-blur-sm border-4 border-dashed border-celestial-saturn/40 flex flex-col items-center justify-center gap-6"
          >
            <div className="w-24 h-24 rounded-full bg-celestial-saturn/20 flex items-center justify-center text-celestial-saturn animate-bounce shadow-2xl">
              <Upload size={48} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-[0.2em]">{t.dropToSync || 'Drop to Knowledge Base'}</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Files will be available for AI agents</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-white/[0.02] flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-white/20" />
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">AI Knowledge Base</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold text-white/20">
            {filteredItems.length} file{filteredItems.length !== 1 ? 's' : ''}
          </span>
          {items.some(i => i.status === 'indexed') && (
            <span className="text-[9px] font-bold text-emerald-400/40 flex items-center gap-1">
              <CheckCircle2 size={10} />
              {items.filter(i => i.status === 'indexed').length} indexed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
