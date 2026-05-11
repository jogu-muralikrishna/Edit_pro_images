import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Clock, Trash2, ExternalLink, Search, RefreshCcw, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import * as fabric from 'fabric';

interface DraftsPanelProps {
  onLoadProject: (projectData: any) => void;
  canvas: fabric.Canvas | null;
}

export const DraftsPanel: React.FC<DraftsPanelProps> = ({ onLoadProject, canvas }) => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const colors = [
    { name: 'Dark', value: '#0F0F0F' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Purple', value: '#1E1B4B' },
    { name: 'Blue', value: '#0F172A' },
    { name: 'Gray', value: '#1A1A1A' },
    { name: 'Transparent', value: 'transparent' },
  ];

  const setCanvasBackground = (color: string) => {
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
  };

  const fetchDrafts = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDrafts(docs);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!auth.currentUser || drafts.length === 0) return;
    if (!window.confirm("Are you sure you want to clear your entire history? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const deletePromises = drafts.map(d => deleteDoc(doc(db, 'projects', d.id)));
      await Promise.all(deletePromises);
      setDrafts([]);
    } catch (error) {
      console.error("Error clearing history:", error);
      alert("Failed to clear history. Some items may require individual deletion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, 'projects', id));
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error("Error deleting draft:", error);
      alert("Permission denied: You can only delete your own projects. Please ensure you are logged in correctly.");
    }
  };

  const filteredDrafts = drafts.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-2">
          <Clock size={24} />
        </div>
        <h3 className="text-sm font-bold text-white">Login to View Drafts</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your creative journey is saved securely in the cloud. Sign in to access your drafts from anywhere.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Workspace</h2>
          <button 
            onClick={fetchDrafts}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={12} className="text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Canvas Color</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setCanvasBackground(color.value)}
                title={color.name}
                className="aspect-square rounded-lg border border-white/10 hover:border-purple-500/50 transition-all overflow-hidden"
                style={{ background: color.value === 'transparent' ? 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 8px 8px' : color.value }}
              />
            ))}
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Project History</h3>
          {drafts.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-[9px] font-bold text-rose-500/50 hover:text-rose-500 transition-colors uppercase tracking-widest"
            >
              Clear All
            </button>
          )}
        </div>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))
        ) : filteredDrafts.length > 0 ? (
          filteredDrafts.map((draft) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-[#121212] border border-white/5 hover:border-purple-500/30 rounded-2xl p-4 transition-all duration-300 cursor-pointer overflow-hidden flex gap-4"
              onClick={() => {
                try {
                  onLoadProject(JSON.parse(draft.data));
                } catch (e) {
                  console.error("Failed to load project data:", e);
                  alert("This project data appears to be corrupted. Could not load.");
                }
              }}
            >
              {draft.preview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                  <img src={draft.preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold text-white mb-1 group-hover:text-purple-400 transition-colors truncate">
                      {draft.name || 'Untitled Project'}
                    </h3>
                    <div className="flex items-center gap-2 text-[9px] text-gray-500 uppercase tracking-tighter">
                      <Clock size={10} />
                      {draft.updatedAt instanceof Timestamp ? draft.updatedAt.toDate().toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(e, draft.id)}
                      className="p-1.5 bg-rose-500/10 text-rose-400/50 hover:text-rose-400 rounded-lg transition-colors border border-rose-500/0 hover:border-rose-500/20"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="p-1.5 text-purple-400">
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-gray-500">No projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
